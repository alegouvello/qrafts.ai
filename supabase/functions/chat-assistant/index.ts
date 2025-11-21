import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const systemPrompt = `You are the QRAFTS AI Assistant, a helpful companion for job seekers using the QRAFTS platform. ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

Your role is to help users with:
- Understanding how to use QRAFTS features (application tracking, answer management, timeline events, role-fit analysis)
- Providing job search advice and tips
- Helping with resume and application questions
- Offering motivation and support during their job search
- Answering questions about interview preparation

Key QRAFTS features you should know about:
1. Application Tracking - Users can add job applications with company, position, URL, and status
2. Master Answers - Users can save and reuse answers to common application questions
3. Timeline Events - Track interviews, follow-ups, and important dates
4. Role Fit Analysis - AI-powered analysis of how well users match job requirements
5. Answer Improvement - AI suggestions to improve application answers
6. Profile Management - Store resume and professional information

Be friendly, encouraging, and concise. If users ask about specific jobs or companies, remind them you don't have access to external job data but can help them organize and prepare for applications they've found.`;

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});