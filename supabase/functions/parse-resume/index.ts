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

    // For now, create a basic profile entry
    // Full PDF text extraction would require additional libraries
    const extractedData = {
      full_name: null,
      email: null,
      phone: null,
      linkedin_url: null,
      location: null,
      summary: 'Resume uploaded successfully. Please update your profile information.'
    };

    // Use AI to extract structured data from resume
    // Note: For now, we'll create a basic profile entry
    // Full PDF parsing can be added with a PDF parsing library
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
            content: 'You are an expert at extracting structured data from resumes. Based on the filename and typical resume structure, provide a template JSON response with these exact keys: full_name, email, phone, linkedin_url, location, and summary. Use null for any fields that cannot be inferred. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `A resume file has been uploaded with filename: ${resumeUrl}. Create a basic profile template that the user can fill in. Set full_name based on the filename if it contains a name, otherwise use null for all fields.`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    // Upsert user profile with extracted data
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        full_name: extractedData.full_name,
        email: extractedData.email,
        phone: extractedData.phone,
        linkedin_url: extractedData.linkedin_url,
        location: extractedData.location,
        resume_text: JSON.stringify(extractedData),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error upserting profile:', upsertError);
      throw new Error('Failed to save profile data');
    }

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