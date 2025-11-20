import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  questionText: z.string().trim().min(1).max(1000),
  answerText: z.string().trim().min(1).max(10000),
  roleDetails: z.object({
    company: z.string().min(1).max(200),
    position: z.string().min(1).max(200),
    requirements: z.union([z.string().max(5000), z.array(z.string())]).optional(),
    responsibilities: z.union([z.string().max(5000), z.array(z.string())]).optional(),
  }),
  resumeText: z.string().max(50000).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestBody = await req.json();
    const { questionText, answerText, roleDetails, resumeText } = requestSchema.parse(requestBody);
    
    console.log('Calculating confidence for answer');

    if (!answerText || answerText.trim().length < 10) {
      return new Response(
        JSON.stringify({
          success: true,
          score: 0,
          reasoning: 'Answer is too short to evaluate',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract key requirements
    const requirements = Array.isArray(roleDetails?.requirements) 
      ? roleDetails.requirements 
      : (roleDetails?.requirements ? [roleDetails.requirements] : []);
    const responsibilities = Array.isArray(roleDetails?.responsibilities)
      ? roleDetails.responsibilities
      : (roleDetails?.responsibilities ? [roleDetails.responsibilities] : []);
    
    const roleContext = `
Job Requirements:
${requirements.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

Key Responsibilities:
${responsibilities.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}
`;

    const resumeContext = resumeText 
      ? `\n\nCandidate's Resume Background:\n${resumeText.substring(0, 3000)}`
      : '';

    const prompt = `You are an expert recruiter evaluating how well a job application answer matches the role requirements based on the candidate's background.

${roleContext}${resumeContext}

**Question:** ${questionText}

**Candidate's Answer:**
${answerText}

**Task:** Analyze how well this answer demonstrates relevant qualifications for the role. Consider:
1. Relevance to the specific question and role requirements
2. Concrete examples and specificity
3. Alignment with candidate's actual experience (if resume provided)
4. Demonstration of required skills and competencies
5. Clarity and professionalism

Provide your response in this format:

CONFIDENCE_SCORE: [0-100]
REASONING: [Brief explanation of the score in 2-3 sentences]
SUGGESTIONS: [If score < 100, provide 2-3 specific, actionable suggestions to improve the answer and reach a higher score. Each suggestion should be concrete and implementable.]`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert recruiter who evaluates candidate responses objectively and provides constructive feedback.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    console.log('AI response received');

    // Parse the response
    const scoreMatch = content.match(/CONFIDENCE_SCORE:\s*(\d+)/i);
    const reasoningMatch = content.match(/REASONING:\s*(.+?)(?=SUGGESTIONS:|$)/is);
    const suggestionsMatch = content.match(/SUGGESTIONS:\s*(.+?)$/is);

    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Unable to generate reasoning';
    const suggestions = suggestionsMatch ? suggestionsMatch[1].trim() : '';

    return new Response(
      JSON.stringify({
        success: true,
        score: Math.min(100, Math.max(0, score)),
        reasoning,
        suggestions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error calculating confidence:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});