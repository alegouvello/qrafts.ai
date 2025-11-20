import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.0.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  applicationId: z.string().uuid(),
  jobUrl: z.string().url().max(2000),
});

function isInternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)) return true;
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) return true;
    
    return false;
  } catch {
    return true;
  }
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

    const requestBody = await req.json();
    const { applicationId, jobUrl } = requestSchema.parse(requestBody);
    
    if (isInternalUrl(jobUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL: internal network addresses are not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Refreshing job description for application:', applicationId);

    // Initialize Firecrawl with API key
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    // Use Firecrawl to scrape the page with JavaScript rendering
    let pageContent = '';
    try {
      console.log('Scraping page with Firecrawl...');
      const scrapeResult = await firecrawl.scrapeUrl(jobUrl, {
        formats: ['markdown'],
        waitFor: 5000,
      });

      if (!scrapeResult.success) {
        throw new Error('Firecrawl scraping failed');
      }

      pageContent = scrapeResult.markdown || '';
      console.log('Scraped page content with Firecrawl, length:', pageContent.length);
    } catch (error) {
      console.error('Error scraping with Firecrawl:', error);
      throw new Error('Failed to scrape job posting page with Firecrawl');
    }

    // Extract job information (company, position, summary) using AI
    console.log('Calling AI to extract job information...');
    let jobInfoResponse;
    try {
      jobInfoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: 'You are an expert at analyzing job postings. Extract the company name, position/job title, and key job details. Return ONLY valid JSON with this exact structure: {"company": "Company Name", "position": "Job Title", "summary": {"location": "Location", "salary_range": "Salary range or null", "description": "Brief role description", "responsibilities": ["resp1", "resp2"], "requirements": ["req1", "req2"], "benefits": ["benefit1", "benefit2"]}}. If any field is not found, use null or empty array.'
            },
            {
              role: 'user',
              content: `Extract company name, position title, and job details from this job posting:\n\n${pageContent.substring(0, 10000)}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });
    } catch (fetchError) {
      console.error('Network error calling AI API:', fetchError);
      throw new Error('Network error while calling AI service');
    }

    if (!jobInfoResponse.ok) {
      const errorText = await jobInfoResponse.text();
      console.error('Job info AI API error status:', jobInfoResponse.status);
      console.error('Job info AI API error body:', errorText);
      throw new Error(`AI API returned status ${jobInfoResponse.status}: ${errorText}`);
    }

    console.log('AI response received, parsing...');
    const jobInfoData = await jobInfoResponse.json();
    console.log('AI response parsed successfully');
    const jobInfoContent = jobInfoData.choices[0].message.content;
    
    let company = null;
    let position = null;
    let roleSummary = null;

    try {
      const cleaned = jobInfoContent.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const jobInfo = JSON.parse(cleaned);
      company = jobInfo.company;
      position = jobInfo.position;
      roleSummary = jobInfo.summary;
      console.log('Extracted job info');
    } catch (e) {
      console.error('Failed to parse job info:', e);
      throw new Error('Failed to parse job information');
    }

    // Update application with extracted company, position, and summary
    const updateData: any = {};
    if (company) updateData.company = company;
    if (position) updateData.position = position;
    if (roleSummary) updateData.role_summary = roleSummary;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId);

      if (updateError) {
        console.error('Error updating application:', updateError);
        throw new Error('Failed to update application');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        company: company,
        position: position,
        roleSummary: roleSummary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in refresh-job-description function:', error);
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