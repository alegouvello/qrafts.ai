import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { section, suggestion } = await req.json();

    console.log('Applying improvement to section:', section);

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profileData) {
      throw new Error('Profile not found');
    }

    // Parse resume text
    let parsedProfile: any = {};
    if (profileData.resume_text) {
      try {
        parsedProfile = JSON.parse(profileData.resume_text);
      } catch (e) {
        console.error('Error parsing resume_text:', e);
      }
    }

    // Create context for AI based on section
    let currentContent = '';
    let updateField = '';

    if (section === 'Professional Summary') {
      currentContent = parsedProfile.summary || '';
      updateField = 'summary';
    } else if (section === 'Skills') {
      currentContent = JSON.stringify(parsedProfile.skills || [], null, 2);
      updateField = 'skills';
    } else if (section === 'Experience') {
      currentContent = JSON.stringify(parsedProfile.experience || [], null, 2);
      updateField = 'experience';
    } else if (section === 'Education') {
      currentContent = JSON.stringify(parsedProfile.education || [], null, 2);
      updateField = 'education';
    }

    // Use Lovable AI to apply the improvement
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
            content: `You are a professional resume editor. Apply the suggested improvement to the provided content. 

For Professional Summary: Return the improved text directly as a string.
For Skills: Return a JSON array of skill strings.
For Experience: Return a JSON array of experience objects with structure: [{title: string, company: string, duration: string, description: string}]
For Education: Return a JSON array of education objects with structure: [{degree: string, school: string, year: string}]

Return ONLY the updated content in the correct format, nothing else. No markdown, no explanations.`
          },
          {
            role: 'user',
            content: `Section: ${section}

Current Content:
${currentContent}

Suggestion to apply:
${suggestion}

Please apply this improvement and return the updated content in the correct format.`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to apply improvement');
    }

    const aiData = await aiResponse.json();
    let improvedContent = aiData.choices[0]?.message?.content;
    
    if (!improvedContent) {
      throw new Error('No content in AI response');
    }

    console.log('AI improved content:', improvedContent);

    // Clean up the response
    improvedContent = improvedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse and update the profile
    if (updateField === 'summary') {
      parsedProfile.summary = improvedContent;
    } else {
      try {
        parsedProfile[updateField] = JSON.parse(improvedContent);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        throw new Error('Failed to parse improved content');
      }
    }

    // Update the database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        resume_text: JSON.stringify(parsedProfile),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Failed to update profile');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Improvement applied successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in apply-profile-improvement function:', error);
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
