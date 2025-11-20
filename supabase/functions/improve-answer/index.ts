import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  questionText: z.string().trim().min(1).max(1000),
  currentAnswer: z.string().trim().min(10).max(10000),
  company: z.string().trim().min(1).max(200),
  position: z.string().trim().min(1).max(200),
  resumeText: z.string().max(50000).optional(),
  userInstructions: z.string().trim().max(1000).optional(),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse the request body
    const requestBody = await req.json();
    const { 
      questionText, 
      currentAnswer, 
      company, 
      position,
      resumeText,
      userInstructions 
    } = requestSchema.parse(requestBody);
    
    console.log('Improving answer');

    if (!currentAnswer || currentAnswer.trim().length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please write at least a basic answer first before requesting improvements.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build resume context
    const resumeContext = resumeText 
      ? `\n\n**Candidate's Resume/Background:**\n${resumeText.substring(0, 3000)}\n\n**CRITICAL:** Use ONLY real experiences and information from the candidate's resume above. Do not invent or hallucinate any roles, companies, or achievements. Base all improvements on actual resume content.`
      : '';
    
    const instructionsContext = userInstructions 
      ? `\n\n**Specific Instructions from User:**\n${userInstructions}\n\n**IMPORTANT:** Make sure to incorporate these specific requests in your improved version.`
      : '';

    // Build prompt for AI
    const improvementPrompt = `You are an expert career coach reviewing a job application answer.

**Job Context:**
- Company: ${company}
- Position: ${position}${resumeContext}${instructionsContext}

**Question:**
"${questionText}"

**Current Answer:**
"${currentAnswer}"

**Your Task:**
Provide a comprehensive critique and improvement of this answer. Structure your response with:

1. **Strengths** (2-3 bullet points): What's working well in the current answer

2. **Areas for Improvement** (3-4 bullet points): Specific weaknesses or missed opportunities

3. **Improved Version**: A rewritten, enhanced version of the answer that:
   - Maintains the candidate's voice and genuine experiences
   - Addresses all the weaknesses identified
   - Is more specific, compelling, and professional
   - Uses stronger action verbs and concrete examples
   - Is well-structured with clear flow
   - Shows enthusiasm and cultural fit
   - Is 150-300 words${resumeText ? '\n   - **Uses ONLY real information from the provided resume - do not invent roles, companies, or achievements**' : ''}${userInstructions ? '\n   - **Incorporates the specific instructions provided by the user**' : ''}

Format your response EXACTLY as follows:

STRENGTHS:
• [strength 1]
• [strength 2]

IMPROVEMENTS:
• [improvement 1]
• [improvement 2]
• [improvement 3]

IMPROVED VERSION:
[The complete improved answer here]`;

    // Call Lovable AI
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
            content: 'You are an expert career coach who provides constructive, specific feedback on job application answers. You help candidates strengthen their responses while maintaining their authentic voice.'
          },
          {
            role: 'user',
            content: improvementPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Rate limit exceeded. Please wait a moment and try again.',
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'AI credits depleted. Please add credits in Settings → Workspace → Usage.',
          }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error('Failed to generate answer improvement');
    }

    const aiData = await aiResponse.json();
    const fullResponse = aiData.choices[0].message.content.trim();

    // Parse the structured response
    const strengthsMatch = fullResponse.match(/STRENGTHS:\s*([\s\S]*?)(?=IMPROVEMENTS:)/i);
    const improvementsMatch = fullResponse.match(/IMPROVEMENTS:\s*([\s\S]*?)(?=IMPROVED VERSION:)/i);
    const improvedVersionMatch = fullResponse.match(/IMPROVED VERSION:\s*([\s\S]*?)$/i);

    const strengths = strengthsMatch ? strengthsMatch[1].trim() : '';
    const improvements = improvementsMatch ? improvementsMatch[1].trim() : '';
    const improvedVersion = improvedVersionMatch ? improvedVersionMatch[1].trim() : '';

    return new Response(
      JSON.stringify({
        success: true,
        strengths: strengths,
        improvements: improvements,
        improvedVersion: improvedVersion,
        fullResponse: fullResponse,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in improve-answer function:', error);
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