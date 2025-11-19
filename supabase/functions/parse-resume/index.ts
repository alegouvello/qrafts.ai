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

    // Extract name from filename (e.g., "de0400a0../Adrien le Gouvello Resume.pdf" -> "Adrien le Gouvello")
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

    // Create profile with inferred data
    const extractedData = {
      full_name: inferredName,
      email: null,
      phone: null,
      linkedin_url: null,
      location: null,
      summary: 'Resume uploaded successfully. Please update your profile information.'
    };

    // Upsert user profile
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
