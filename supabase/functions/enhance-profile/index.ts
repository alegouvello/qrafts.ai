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

    const { linkedinUrl, websiteUrl, targetRole } = await req.json();
    
    if (!linkedinUrl && !websiteUrl) {
      return new Response(
        JSON.stringify({ error: 'No URLs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching profile data for user:', user.id);
    if (targetRole) {
      console.log('Target role specified:', targetRole);
    }
    
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

    const systemPrompt = `You are a professional resume enhancement AI. Your task is to INTELLIGENTLY MERGE new information from scraped web content with an existing resume WITHOUT DUPLICATING any content${targetRole ? ` AND OPTIMIZE IT FOR: ${targetRole}` : ''}.

Current Resume Data:
${JSON.stringify(currentResume, null, 2)}

Scraped Content:
${scrapedContent.map(s => `\n--- ${s.source} ---\n${s.content}`).join('\n')}

${targetRole ? `TARGET ROLE: ${targetRole}

ROLE-SPECIFIC OPTIMIZATION:
- Prioritize and emphasize experiences, skills, and achievements most relevant to "${targetRole}"
- Reorder sections to highlight the most pertinent qualifications first
- Enhance descriptions to align with typical requirements for "${targetRole}"
- Use industry-specific terminology relevant to this role
- Emphasize leadership, strategy, client relations, or technical skills as appropriate for the role

` : ''}CRITICAL MERGING RULES - READ CAREFULLY:

1. **IDENTIFY WHAT EXISTS**: First, carefully read through the current resume to understand what information is ALREADY THERE
2. **EXTRACT NEW ONLY**: From the scraped content, extract ONLY information that is NOT already in the current resume
3. **MERGE INTELLIGENTLY**: If scraped content adds details to existing entries, ENHANCE the existing entry rather than creating duplicates
4. **NEVER COPY-PASTE**: Do NOT copy any text from the current resume and paste it at the end - only add genuinely NEW information
5. **ONE MENTION RULE**: Each fact, achievement, or role should appear EXACTLY ONCE in the final output

SPECIFIC EXAMPLES OF WHAT NOT TO DO:

❌ BAD - Duplicating existing content:
Current: "Founded a Generative AI platform (Baret) to improve market research resulting in $10.6M in bookings in 2023."
Scraped: "Previously at Kearney, launched Baret, a $10.6M generative-AI platform"
WRONG OUTPUT: "[new stuff]... Founded a Generative AI platform (Baret) to improve market research resulting in $10.6M in bookings in 2023."
(This just copied the existing content!)

✅ GOOD - Properly merged:
CORRECT OUTPUT: "Previously at Kearney, launched Baret, a $10.6M generative-AI platform that transformed consultant workflows and improved market research."
(Combined both sources into ONE statement without duplication)

❌ BAD - Listing the same company twice:
"Co-founded Lucenn.ai: Provide tailored AI solutions. Co-founded Lucenn, an applied-AI venture within super{set}."

✅ GOOD - Merged into one:
"Co-founded Lucenn (Lucenn.ai), an applied-AI venture within super{set}, providing tailored AI solutions to Fortune 500 companies."

ENHANCEMENT SECTIONS:
Extract and merge information about:
- Professional summary/bio (combine roles, specializations, key achievements)
- Work experience (merge entries from same company)
- Education
- Skills (add new skills not already listed)
- Certifications
- Projects
- Publications
- Awards
- Languages
- Volunteer work

Return ONLY valid JSON matching this exact structure:
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
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: targetRole 
            ? `Carefully read the current resume data first. Then extract ONLY new information from the scraped content that is not already present. Merge intelligently without duplicating any existing content. MOST IMPORTANTLY: Optimize and tailor the enhanced profile for the "${targetRole}" role - emphasize relevant experience, reorder content to highlight pertinent skills first, and use appropriate industry terminology. Remember: each fact should appear only once in the final output.`
            : 'Carefully read the current resume data first. Then extract ONLY new information from the scraped content that is not already present. Merge intelligently without duplicating any existing content. Remember: each fact should appear only once in the final output.' 
          }
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
    console.log('Returning enhanced resume for user approval');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile enhancement ready for review',
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
