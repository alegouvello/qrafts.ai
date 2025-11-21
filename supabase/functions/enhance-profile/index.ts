import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { linkedinUrl, websiteUrl } = await req.json();
    
    if (!linkedinUrl && !websiteUrl) {
      return new Response(
        JSON.stringify({ error: 'No URLs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching profile data for user:', user.id);
    
    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    let currentResume = {};
    if (profile.resume_text) {
      try {
        currentResume = JSON.parse(profile.resume_text);
      } catch (e) {
        console.log('Could not parse existing resume_text');
      }
    }

    // Scrape URLs using Firecrawl
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const scrapedContent: { source: string; content: string }[] = [];

    if (linkedinUrl && firecrawlKey) {
      try {
        console.log('Scraping LinkedIn profile:', linkedinUrl);
        const linkedinResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: linkedinUrl,
            formats: ['markdown'],
          }),
        });
        
        if (linkedinResponse.ok) {
          const linkedinData = await linkedinResponse.json();
          if (linkedinData.success && linkedinData.data?.markdown) {
            scrapedContent.push({
              source: 'LinkedIn',
              content: linkedinData.data.markdown.substring(0, 10000) // Limit content
            });
            console.log('Successfully scraped LinkedIn profile');
          }
        }
      } catch (error) {
        console.error('Error scraping LinkedIn:', error);
      }
    }

    if (websiteUrl && firecrawlKey) {
      try {
        console.log('Scraping website:', websiteUrl);
        const websiteResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: websiteUrl,
            formats: ['markdown'],
          }),
        });
        
        if (websiteResponse.ok) {
          const websiteData = await websiteResponse.json();
          if (websiteData.success && websiteData.data?.markdown) {
            scrapedContent.push({
              source: 'Website',
              content: websiteData.data.markdown.substring(0, 10000) // Limit content
            });
            console.log('Successfully scraped website');
          }
        }
      } catch (error) {
        console.error('Error scraping website:', error);
      }
    }

    if (scrapedContent.length === 0) {
      console.log('No content was scraped');
      return new Response(
        JSON.stringify({ message: 'No additional information could be extracted from the provided URLs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to extract and merge information
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a professional resume enhancement AI. Your task is to extract professional information from scraped web content and intelligently merge it with an existing resume.

Current Resume Data:
${JSON.stringify(currentResume, null, 2)}

Scraped Content:
${scrapedContent.map(s => `\n--- ${s.source} ---\n${s.content}`).join('\n')}

Extract and enhance the resume with:
- Professional summary/bio
- Work experience (company, position, dates, description)
- Education (institution, degree, field, dates)
- Skills (technical and soft skills)
- Certifications
- Projects
- Publications
- Awards
- Languages
- Volunteer work

Rules:
1. Only add NEW information not already present
2. Preserve all existing information
3. Merge similar entries intelligently
4. Format dates consistently (YYYY-MM or YYYY)
5. Return ONLY valid JSON matching this exact structure:
{
  "summary": "string",
  "skills": ["string"],
  "experience": [{"company": "string", "position": "string", "start_date": "string", "end_date": "string", "description": "string"}],
  "education": [{"institution": "string", "degree": "string", "field": "string", "start_date": "string", "end_date": "string"}],
  "certifications": [{"name": "string", "issuer": "string", "date": "string"}],
  "projects": [{"name": "string", "description": "string", "url": "string"}],
  "publications": [{"title": "string", "publisher": "string", "date": "string"}],
  "awards": [{"title": "string", "issuer": "string", "date": "string"}],
  "languages": [{"language": "string", "proficiency": "string"}],
  "volunteer": [{"organization": "string", "role": "string", "start_date": "string", "end_date": "string"}]
}`;

    console.log('Calling Lovable AI to extract and merge information');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Extract and merge the professional information.' }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error('Failed to process with AI');
    }

    const aiData = await aiResponse.json();
    const enhancedResumeText = aiData.choices[0].message.content;
    
    console.log('AI response received, parsing...');
    
    // Parse the AI response
    let enhancedResume;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = enhancedResumeText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : enhancedResumeText;
      enhancedResume = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      throw new Error('Failed to parse enhanced resume data');
    }

    // Update the profile with enhanced resume
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        resume_text: JSON.stringify(enhancedResume),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    console.log('Profile enhanced successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile enhanced successfully',
        enhancedResume
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-profile function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
