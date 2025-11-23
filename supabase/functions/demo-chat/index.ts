import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getRateLimitKey(req: Request): string {
  // Try to get real IP from various headers (for proxies/load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  return cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';
}

function checkRateLimit(clientKey: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientKey);

  // Clean up expired entries periodically
  if (Math.random() < 0.1) { // 10% chance to clean up
    for (const [key, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!clientData || now > clientData.resetTime) {
    // New client or window expired
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(clientKey, { count: 1, resetTime });
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - 1, resetTime };
  }

  if (clientData.count >= MAX_REQUESTS_PER_HOUR) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: clientData.resetTime };
  }

  // Increment count
  clientData.count++;
  rateLimitMap.set(clientKey, clientData);
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_HOUR - clientData.count, 
    resetTime: clientData.resetTime 
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check rate limit
    const clientKey = getRateLimitKey(req);
    const rateLimit = checkRateLimit(clientKey);
    
    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetTime);
      const waitMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (60 * 1000));
      
      console.log(`Rate limit exceeded for client: ${clientKey}`);
      
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Please try again in ${waitMinutes} minutes.`,
          resetTime: resetDate.toISOString()
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Limit": MAX_REQUESTS_PER_HOUR.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
            "Retry-After": (waitMinutes * 60).toString()
          } 
        }
      );
    }

    const { messages, language = 'en' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const languageInstructions = {
      en: "Respond in English.",
      fr: "Réponds en français.",
      es: "Responde en español."
    };

    const systemPrompt = `You are a demo version of the Qrafts AI Assistant. Your role is to showcase Qrafts features and help visitors understand how the platform can help with their job search. ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

Key points to emphasize:
- Keep responses concise (2-3 paragraphs maximum)
- Highlight specific Qrafts features when relevant
- Be encouraging and show value
- End with a subtle call-to-action to sign up for full features

Qrafts features to mention:
1. **Application Tracking** - Organize all job applications in one dashboard with status updates
2. **Master Answers** - Save and reuse your best answers to common application questions
3. **Timeline & Reminders** - Track interviews, deadlines, and get automated follow-up reminders
4. **AI Role-Fit Analysis** - Get instant analysis of how well you match job requirements
5. **Answer Improvement** - AI-powered suggestions to strengthen application responses
6. **Interview Prep** - Analyze interviewer LinkedIn profiles for personalized preparation
7. **Company Insights** - Track statistics across companies (acceptance rates, response times)

When users ask questions:
- For job search advice: Give helpful tips and mention which Qrafts feature could help
- For resume/application questions: Provide guidance and highlight Answer Improvement feature
- For organization questions: Emphasize the tracking and timeline features
- For interview prep: Mention the Interview Prep and company insights features

Remember: This is a demo. Encourage users to sign up to unlock personalized AI assistance with their actual job data.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add rate limit headers to successful response
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "X-RateLimit-Limit": MAX_REQUESTS_PER_HOUR.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": rateLimit.resetTime.toString()
      },
    });
  } catch (error) {
    console.error("Demo chat error:", error);
    
    // Still return rate limit headers even on error
    const clientKey = getRateLimitKey(req);
    const rateLimitData = rateLimitMap.get(clientKey);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          ...(rateLimitData ? {
            "X-RateLimit-Limit": MAX_REQUESTS_PER_HOUR.toString(),
            "X-RateLimit-Remaining": Math.max(0, MAX_REQUESTS_PER_HOUR - rateLimitData.count).toString(),
            "X-RateLimit-Reset": rateLimitData.resetTime.toString()
          } : {})
        } 
      }
    );
  }
});
