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
    const { interviewerId } = await req.json();

    if (!interviewerId) {
      return new Response(
        JSON.stringify({ error: 'Missing interviewerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get interviewer, application, and user profile data
    const { data: interviewer, error: interviewerError } = await supabase
      .from('interviewers')
      .select(`
        *,
        applications (
          company,
          position,
          url,
          role_summary
        )
      `)
      .eq('id', interviewerId)
      .single();

    if (interviewerError || !interviewer) {
      console.error('Failed to fetch interviewer:', interviewerError);
      return new Response(
        JSON.stringify({ error: 'Interviewer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', interviewer.user_id)
      .single();

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare context for AI
    const interviewerInfo = interviewer.extracted_data?.markdown || 
      `${interviewer.name}${interviewer.role ? ` - ${interviewer.role}` : ''}${interviewer.company ? ` at ${interviewer.company}` : ''}`;

    const userResume = profile?.resume_text || 'No resume provided';
    const jobDescription = interviewer.applications?.role_summary || 
      `Position: ${interviewer.applications?.position} at ${interviewer.applications?.company}`;

    const prompt = `You are an expert career coach helping a candidate prepare for a job interview.

INTERVIEWER INFORMATION:
${interviewerInfo}

JOB INFORMATION:
${JSON.stringify(jobDescription, null, 2)}

CANDIDATE'S RESUME:
${userResume}

Based on this information, provide comprehensive interview preparation advice in the following categories:

1. KEY TALKING POINTS: 3-5 specific experiences from the candidate's background that are most relevant for this interviewer and role.

2. COMMON GROUND: 2-3 potential connection points between the candidate and interviewer (shared experiences, interests, or background).

3. QUESTIONS TO ASK: 3-5 thoughtful questions the candidate should ask the interviewer based on their background and the role.

4. AREAS TO EMPHASIZE: 3-4 key skills or experiences from the candidate's background that align with what this interviewer/company likely values.

5. POTENTIAL CONCERNS: 1-2 potential gaps or concerns that might come up, with suggested ways to address them.

Format your response as JSON with these exact keys: talkingPoints, commonGround, questionsToAsk, areasToEmphasize, potentialConcerns. Each should be an array of strings.`;

    console.log('Calling Lovable AI for interview prep generation');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are an expert career coach. Always respond with valid JSON only, no markdown or extra text.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate interview prep' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    // Parse the JSON response
    let interviewPrep;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      interviewPrep = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the interviewer record with prep data
    const { error: updateError } = await supabase
      .from('interviewers')
      .update({
        interview_prep: {
          ...interviewPrep,
          generated_at: new Date().toISOString()
        }
      })
      .eq('id', interviewerId);

    if (updateError) {
      console.error('Failed to update interviewer prep:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save interview prep' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        interviewPrep
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-interview-prep:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});