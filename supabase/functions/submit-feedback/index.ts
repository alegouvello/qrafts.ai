import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiter (resets on function cold start, but effective for burst protection)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limit config: 5 submissions per IP per 15 minutes
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIP(req: Request): string {
  // Check various headers for the real IP (in order of reliability)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client IP)
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;
  
  // Fallback - shouldn't happen in production
  return "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  // Clean up expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  if (!entry || now > entry.resetTime) {
    // New window, allow request
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }
  
  // Increment counter
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: entry.resetTime - now };
}

// Input validation schema
const feedbackSchema = z.object({
  name: z.string().trim().max(100, "Name must be less than 100 characters").optional().nullable(),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().nullable().or(z.literal("")),
  category: z.enum(["feature", "bug", "improvement", "other"], {
    required_error: "Please select a category",
  }),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
  user_id: z.string().uuid().optional().nullable(),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP
    const clientIP = getClientIP(req);
    console.log(`[SUBMIT-FEEDBACK] Request from IP: ${clientIP.substring(0, 10)}...`);

    // Check rate limit
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
      console.log(`[SUBMIT-FEEDBACK] Rate limit exceeded for IP: ${clientIP.substring(0, 10)}...`);
      
      return new Response(
        JSON.stringify({ 
          error: `Too many submissions. Please try again in ${resetMinutes} minute${resetMinutes > 1 ? 's' : ''}.`,
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000))
          },
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = feedbackSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.log(`[SUBMIT-FEEDBACK] Validation error: ${errors}`);
      
      return new Response(
        JSON.stringify({ error: `Validation failed: ${errors}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { name, email, category, message, user_id } = validationResult.data;

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Insert feedback
    const { data, error } = await supabaseAdmin.from("feedback").insert({
      user_id: user_id || null,
      name: name || null,
      email: email || null,
      category,
      message,
    }).select().single();

    if (error) {
      console.error(`[SUBMIT-FEEDBACK] Database error: ${error.message}`);
      throw error;
    }

    console.log(`[SUBMIT-FEEDBACK] Feedback submitted successfully: ${data.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.id,
        remaining: rateLimit.remaining
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SUBMIT-FEEDBACK] Error: ${errorMessage}`);

    return new Response(
      JSON.stringify({ error: "Failed to submit feedback. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
