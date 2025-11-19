import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  location: string | null;
  summary: string | null;
  skills: string[] | null;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }> | null;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }> | null;
}

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

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      throw new Error('Profile not found');
    }

    // Parse resume text
    let parsedProfile: ProfileData = {
      full_name: profileData.full_name,
      email: profileData.email,
      phone: profileData.phone,
      linkedin_url: profileData.linkedin_url,
      location: profileData.location,
      summary: null,
      skills: null,
      experience: null,
      education: null,
    };

    if (profileData.resume_text) {
      try {
        const resumeData = JSON.parse(profileData.resume_text);
        parsedProfile = { ...parsedProfile, ...resumeData };
      } catch (e) {
        console.error('Error parsing resume_text:', e);
      }
    }

    console.log('Analyzing profile for:', parsedProfile.full_name);

    // Create a comprehensive profile summary for AI analysis
    const profileSummary = `
Profile Information:
- Name: ${parsedProfile.full_name || 'Not provided'}
- Email: ${parsedProfile.email || 'Not provided'}
- Phone: ${parsedProfile.phone || 'Not provided'}
- LinkedIn: ${parsedProfile.linkedin_url || 'Not provided'}
- Location: ${parsedProfile.location || 'Not provided'}

Professional Summary:
${parsedProfile.summary || 'Not provided'}

Skills:
${parsedProfile.skills?.join(', ') || 'Not provided'}

Experience:
${parsedProfile.experience?.map((exp, i) => `
${i + 1}. ${exp.title} at ${exp.company} (${exp.duration})
   ${exp.description}
`).join('\n') || 'Not provided'}

Education:
${parsedProfile.education?.map((edu) => `
- ${edu.degree} from ${edu.school} (${edu.year})
`).join('\n') || 'Not provided'}
`;

    // Use Lovable AI to analyze and suggest improvements
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
            content: `You are an expert career coach and resume consultant. Analyze the provided profile and provide specific, actionable suggestions for improvement. Focus on:
1. Professional Summary - Is it compelling? Does it highlight key strengths?
2. Skills - Are they relevant? Any missing important skills?
3. Experience - Are descriptions impactful? Do they show achievements?
4. Education - Is it presented clearly?
5. Overall - Any gaps or areas that need strengthening?

CRITICAL: Keep your response concise with maximum 5 improvements and 4 quick wins to ensure the JSON fits within token limits.

Provide your response as a JSON object with this structure:
{
  "overall_score": number (1-10),
  "strengths": ["strength 1", "strength 2", ...] (max 5 items),
  "improvements": [
    {
      "section": "section name",
      "issue": "what needs improvement",
      "suggestion": "specific actionable suggestion"
    }
  ] (max 5 items),
  "quick_wins": ["easy improvement 1", "easy improvement 2", ...] (max 4 items)
}

Be specific, constructive, and actionable. Return ONLY the JSON without any markdown formatting.`
          },
          {
            role: 'user',
            content: `Please analyze this profile and suggest improvements:\n\n${profileSummary}`
          }
        ],
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to analyze profile');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI review response:', content);

    // Parse the JSON response with robust extraction
    let review;
    try {
      // Remove markdown code blocks
      let jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to find JSON object boundaries if there's extra text
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      }
      
      review = JSON.parse(jsonText);
      
      // Validate required fields
      if (!review.overall_score || !review.strengths || !review.improvements || !review.quick_wins) {
        throw new Error('Missing required fields in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw content length:', content.length);
      console.error('Raw content preview:', content.substring(0, 500));
      throw new Error('Failed to parse AI review - response may be incomplete or malformed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        review,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in review-profile function:', error);
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
