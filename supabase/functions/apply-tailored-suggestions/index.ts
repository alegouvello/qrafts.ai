import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalResume, suggestions, position, company } = await req.json();

    if (!originalResume || !suggestions) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: originalResume and suggestions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header to fetch their previous resumes
    const authHeader = req.headers.get('Authorization');
    let previousResumes: string[] = [];
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Extract user from JWT
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Fetch previous tailored resumes for learning
        const { data: tailoredResumes } = await supabase
          .from('tailored_resumes')
          .select('resume_text, position, company')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (tailoredResumes && tailoredResumes.length > 0) {
          previousResumes = tailoredResumes.map(r => 
            `[${r.position || 'Unknown'} at ${r.company || 'Unknown'}]:\n${r.resume_text.substring(0, 1500)}`
          );
          console.log(`Found ${previousResumes.length} previous tailored resumes for learning`);
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build learning context from previous resumes
    let learningContext = '';
    if (previousResumes.length > 0) {
      learningContext = `
LEARNING FROM PREVIOUS RESUMES:
You have access to ${previousResumes.length} previously created tailored resumes by this user. Study their writing patterns, tone, formatting preferences, and how they present achievements. Use these as guidance for style and approach:

${previousResumes.join('\n\n---\n\n')}

END OF PREVIOUS RESUMES
`;
    }

    const systemPrompt = `You are an expert resume writer. Your task is to take an original resume and a set of AI-generated suggestions, and create a new tailored resume that incorporates those suggestions.

${learningContext}

CRITICAL CONSTRAINTS - DO NOT HALLUCINATE:
- ONLY use information that exists in the original resume
- DO NOT invent or add experiences, skills, achievements, or qualifications
- DO NOT embellish or exaggerate beyond what is stated in the original resume
- ONLY reword and reposition existing content to better match the target role
- If a suggestion cannot be implemented without inventing information, skip it
${previousResumes.length > 0 ? '- LEARN from the previous resumes: match the users writing style, tone, and formatting preferences' : ''}

The new resume should:
- Maintain the same format and structure as the original
- Apply all relevant suggestions that can be implemented using only existing content
- Be specifically tailored for the role at the company through rewording, not invention
- Keep all factual information accurate and faithful to the original
- Use strong action verbs and quantifiable achievements from the original resume only
- Be formatted in clean, readable markdown
${previousResumes.length > 0 ? '- Follow the users established writing patterns from their previous resumes' : ''}

Return ONLY the tailored resume text, no additional commentary.`;

    const userPrompt = `Original Resume:
${originalResume}

AI Suggestions:
${suggestions}

Target Role: ${position} at ${company}

Please create a tailored resume that incorporates these suggestions while maintaining the original structure and all factual information.`;

    console.log('Calling Lovable AI to generate tailored resume');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const tailoredResume = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ tailoredResume }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apply-tailored-suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
