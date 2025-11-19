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

    // Download the PDF file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(resumeUrl);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      throw new Error('Failed to download resume file');
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('Resume downloaded, parsing with AI...');

    // Use Lovable AI to parse the resume
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
            content: 'You are an expert at extracting structured data from resumes. Analyze the resume document and extract: full_name, email, phone, linkedin_url, location, summary (professional summary/objective), skills (array), experience (array of {title, company, duration, description}), education (array of {degree, school, year}). Return ONLY valid JSON with these exact keys. Use null for any fields that cannot be found.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all information from this resume PDF and return it as structured JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
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
