import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getRateLimitKey(req: Request): string {
  // Use IP address or forwarded header for rate limiting
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  
  return cfConnectingIp || realIp || forwarded?.split(",")[0]?.trim() || "unknown";
}

function checkRateLimit(clientKey: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientKey);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - 1 };
  }
  
  if (record.count >= MAX_REQUESTS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - record.count };
}

// Input validation schema
const emailRequestSchema = z.object({
  to: z.string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  subject: z.string()
    .min(1, { message: "Subject cannot be empty" })
    .max(200, { message: "Subject must be less than 200 characters" }),
  html: z.string()
    .min(1, { message: "HTML content cannot be empty" })
    .max(100000, { message: "HTML content must be less than 100KB" }),
  name: z.string().max(100).optional(),
});

async function sendWithResend(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Qraft Pro <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify internal API secret for service-to-service calls
  const internalSecret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_API_SECRET");
  
  if (!internalSecret || internalSecret !== expectedSecret) {
    console.warn("Unauthorized request to send-subscription-email");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      }
    );
  }

  // Apply rate limiting
  const clientKey = getRateLimitKey(req);
  const { allowed, remaining } = checkRateLimit(clientKey);
  
  if (!allowed) {
    console.warn(`Rate limit exceeded for client: ${clientKey}`);
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
        },
        status: 429,
      }
    );
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = emailRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error("Validation error:", errors);
      return new Response(JSON.stringify({ error: `Validation failed: ${errors}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { to, subject, html } = validationResult.data;

    console.log("Sending email to:", to);

    const emailResponse = await sendWithResend(to, subject, html);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(remaining)
      },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending email:", errorMessage);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
