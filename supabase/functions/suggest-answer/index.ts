import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  questionText: string;
  applicationId: string;
  company: string;
  position: string;
}

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

    const { questionText, applicationId, company, position }: RequestBody = await req.json();
    
    console.log('Generating answer suggestion for question:', questionText);

    // Fetch user profile data for personalized context
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name, email, phone, linkedin_url, location, resume_text')
      .eq('user_id', user.id)
      .single();

    let profileContext = '';
    if (userProfile) {
      console.log('Found user profile data');
      profileContext = `**Your Profile:**
- Name: ${userProfile.full_name || 'Not provided'}
- Location: ${userProfile.location || 'Not provided'}
- LinkedIn: ${userProfile.linkedin_url || 'Not provided'}
- Email: ${userProfile.email || 'Not provided'}`;

      if (userProfile.resume_text) {
        try {
          const resumeData = JSON.parse(userProfile.resume_text);
          if (resumeData.summary) {
            profileContext += `\n- Professional Summary: ${resumeData.summary}`;
          }
        } catch (e) {
          console.log('Could not parse resume_text');
        }
      }
    }

    // Fetch application details for more context
    const { data: application } = await supabase
      .from('applications')
      .select('url')
      .eq('id', applicationId)
      .single();

    // Build context for AI
    let contextPrompt = `You are helping a job applicant craft a compelling answer to an application question.

**Job Details:**
- Company: ${company}
- Position: ${position}`;

    if (application?.url) {
      contextPrompt += `\n- Job Posting URL: ${application.url}`;
    }

    if (profileContext) {
      contextPrompt += `\n\n${profileContext}\n`;
      contextPrompt += `\nUse this information to craft a personalized, authentic answer that reflects the candidate's background.`;
    }

    contextPrompt += `\n\n**Question:**
"${questionText}"

**Instructions:**
1. Craft a professional, compelling answer that:
   - Directly addresses the question
   - Is specific and detailed (2-4 paragraphs)
   - Shows genuine enthusiasm for the role
   - Highlights relevant skills and experiences
   - Uses concrete examples where possible
   - Maintains a professional yet personable tone

2. Make the answer unique and authentic, not generic
3. Keep it concise but impactful (150-250 words)
4. Avoid clichés and overused phrases

Return ONLY the suggested answer text, no additional commentary.`;

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
            content: 'You are an expert career coach and job application consultant. You help candidates write compelling, authentic answers to application questions.'
          },
          {
            role: 'user',
            content: contextPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
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
      
      throw new Error('Failed to generate answer suggestion');
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices[0].message.content.trim();
    
    console.log('Generated suggestion length:', suggestion.length);

    return new Response(
      JSON.stringify({
        success: true,
        suggestion: suggestion,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in suggest-answer function:', error);
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
