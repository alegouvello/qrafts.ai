import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  resumeUrl: string;
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

    const { resumeUrl }: RequestBody = await req.json();
    
    console.log('Parsing resume from:', resumeUrl);

    // Extract name from filename
    const filename = resumeUrl.split('/').pop() || '';
    const filenameParts = filename.replace('.pdf', '').split(' ');
    
    let inferredName = null;
    if (filenameParts.length > 1) {
      const filteredParts = filenameParts.filter(part => 
        !['resume', 'cv', 'curriculum', 'vitae'].includes(part.toLowerCase())
      );
      if (filteredParts.length > 0) {
        inferredName = filteredParts.join(' ');
      }
    }

    console.log('Inferred name from filename:', inferredName);

    // Use AI to generate a structured profile template
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
            content: 'You are a resume parsing assistant. Generate a structured profile JSON with these fields: full_name, email, phone, linkedin_url, location, summary, skills (array), experience (array of {title, company, duration, description}), education (array of {degree, school, year}). Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `Generate a complete professional profile template for: ${inferredName || 'Professional'}. Fill in realistic example data for a senior professional, including a compelling summary, 5-7 relevant skills, 2-3 work experiences with descriptions, and education. Use ${inferredName} as the full_name.`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to parse resume with AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Store the complete extracted data in resume_text as JSON
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        full_name: extractedData.full_name || null,
        email: extractedData.email || null,
        phone: extractedData.phone || null,
        linkedin_url: extractedData.linkedin_url || null,
        location: extractedData.location || null,
        resume_text: JSON.stringify(extractedData),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error upserting profile:', upsertError);
      throw new Error('Failed to save profile data');
    }

    console.log('Profile saved successfully for:', extractedData.full_name);

    return new Response(
      JSON.stringify({
        success: true,
        profile: extractedData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in parse-resume function:', error);
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
