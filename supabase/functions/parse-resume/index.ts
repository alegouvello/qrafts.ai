import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import JSZip from 'https://esm.sh/jszip@3.10.1';

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

    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(resumeUrl);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      throw new Error('Failed to download resume file');
    }

    console.log('File downloaded, detecting type and extracting text...');

    let extractedText = '';
    const fileName = resumeUrl.toLowerCase();

    // Check if it's a Word document
    if (fileName.endsWith('.docx')) {
      console.log('Processing Word document...');
      
      // Read the file as bytes
      const arrayBuffer = await fileData.arrayBuffer();
      
      try {
        // Load the ZIP file
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // Extract document.xml which contains the main text
        const docXml = await zip.file('word/document.xml')?.async('string');
        
        if (docXml) {
          // Extract text from XML and clean thoroughly
          extractedText = docXml
            // Extract text from w:t tags
            .replace(/<w:t[^>]*>/g, '')
            .replace(/<\/w:t>/g, ' ')
            // Remove all other XML tags
            .replace(/<[^>]*>/g, ' ')
            // Decode common XML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            // Remove non-printable characters and control characters
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
            // Fix common encoding issues
            .replace(/â€™/g, "'")
            .replace(/â€œ/g, '"')
            .replace(/â€�/g, '"')
            .replace(/â€"/g, '-')
            .replace(/â€"/g, '—')
            .replace(/Â/g, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();
          
          console.log('Extracted and cleaned text from Word document, length:', extractedText.length);
        } else {
          throw new Error('Could not find document.xml in Word file');
        }
      } catch (e) {
        console.error('Error processing Word document:', e);
        throw new Error('Failed to extract text from Word document');
      }
    } else {
      // For PDFs and other formats, we'll use a simpler approach
      console.log('Non-Word document detected, using filename-based parsing');
      const filename = resumeUrl.split('/').pop() || '';
      const filenameParts = filename.replace(/\.(pdf|doc|docx)$/i, '').split(' ');
      
      const filteredParts = filenameParts.filter(part => 
        !['resume', 'cv', 'curriculum', 'vitae'].includes(part.toLowerCase())
      );
      
      extractedText = `Name: ${filteredParts.join(' ') || 'Professional'}`;
    }

    console.log('Sending extracted text to AI for structuring...');

    // Use AI to structure the extracted text
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
            content: 'You are an expert at extracting structured data from resume text. Extract: full_name, email, phone, linkedin_url, location, summary, skills (array), experience (array of {title, company, duration, description}), education (array of {degree, school, year}). Return ONLY valid JSON. Use null for missing fields. Be thorough and extract all available information.'
          },
          {
            role: 'user',
            content: `Extract all information from this resume and return structured JSON:\n\n${extractedText}`
          }
        ],
        max_tokens: 3000,
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
