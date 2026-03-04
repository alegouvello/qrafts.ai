import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
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

// Common job board hostnames to ignore when deriving company domain
const JOB_BOARD_PATTERNS = [
  /lever\.co$/i, /greenhouse\.io$/i, /workday\.com$/i, /myworkdayjobs\.com$/i,
  /ashbyhq\.com$/i, /icims\.com$/i, /smartrecruiters\.com$/i, /jobvite\.com$/i,
  /applytojob\.com$/i, /breezy\.hr$/i, /recruitee\.com$/i, /bamboohr\.com$/i,
  /jazz\.co$/i, /jazzhq\.com$/i, /workable\.com$/i, /taleo\.net$/i,
  /oraclecloud\.com$/i, /successfactors\.com$/i, /ultipro\.com$/i,
  /paylocity\.com$/i, /paycom\.com$/i, /adp\.com$/i, /phenom\.com$/i,
  /eightfold\.ai$/i, /avature\.net$/i, /cornerstoneondemand\.com$/i,
  /pinpointhq\.com$/i, /teamtailor\.com$/i, /personio\.de$/i, /personio\.com$/i,
  /gem\.com$/i, /wellfound\.com$/i, /angel\.co$/i, /ycombinator\.com$/i,
  /workatastartup\.com$/i, /dover\.com$/i, /rippling\.com$/i, /gusto\.com$/i,
  /deel\.com$/i, /remote\.com$/i, /oysterhr\.com$/i, /linkedin\.com$/i,
  /indeed\.com$/i, /ziprecruiter\.com$/i, /glassdoor\.com$/i, /monster\.com$/i,
  /careerbuilder\.com$/i, /dice\.com$/i, /simplyhired\.com$/i, /snagajob\.com$/i,
  /flexjobs\.com$/i, /builtin\.com$/i, /themuse\.com$/i, /hired\.com$/i,
  /triplebyte\.com$/i, /otta\.com$/i, /cord\.co$/i, /getro\.com$/i,
];

function deriveCompanyDomain(url: string, companyName: string): string {
  try {
    const u = new URL(url);
    const hostname = u.hostname.replace(/^www\./, '');
    if (JOB_BOARD_PATTERNS.some((p) => p.test(hostname))) {
      return companyName.toLowerCase().replace(/\s+/g, '') + '.com';
    }
    return hostname;
  } catch {
    return companyName.toLowerCase().replace(/\s+/g, '') + '.com';
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

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    // Helper: strip HTML tags to plain text
    function stripHtml(html: string): string {
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Try Firecrawl first, fall back to direct HTTP fetch
    async function scrapePageContent(): Promise<string> {
      // Attempt Firecrawl if key is available
      if (firecrawlApiKey) {
        try {
          console.log('Trying Firecrawl API...', jobUrl);
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: jobUrl,
              formats: ['markdown'],
              onlyMainContent: true,
              waitFor: 5000,
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeResult = await scrapeResponse.json();
            const content = scrapeResult.data?.markdown || scrapeResult.markdown || '';
            if (content.length >= 50) {
              console.log('Firecrawl succeeded, content length:', content.length);
              return content;
            }
          } else {
            const errorText = await scrapeResponse.text();
            console.warn('Firecrawl failed (status', scrapeResponse.status, '), falling back to direct fetch');
          }
        } catch (e) {
          console.warn('Firecrawl error, falling back to direct fetch:', e instanceof Error ? e.message : e);
        }
      } else {
        console.log('No FIRECRAWL_API_KEY, using direct fetch');
      }

      // Fallback: direct HTTP fetch
      console.log('Direct-fetching page...', jobUrl);
      const directResponse = await fetch(jobUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!directResponse.ok) {
        throw new Error(`Direct fetch failed with status ${directResponse.status}`);
      }

      const html = await directResponse.text();
      const textContent = stripHtml(html);
      console.log('Direct fetch content length:', textContent.length);

      if (textContent.length < 50) {
        throw new Error('Page content too short — extraction may have failed');
      }

      return textContent;
    }

    // Core extraction logic wrapped for retry
    async function extractJobInfo(): Promise<{ company: string | null; position: string | null; roleSummary: any; extractedWebsite: string | null }> {
      const pageContent = await scrapePageContent();

      // AI extraction
      console.log('Calling AI to extract job information...');
      const jobInfoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: 'You are an expert at analyzing job postings. Extract the company name, position/job title, company website, and key job details. Return ONLY valid JSON with this exact structure: {"company": "Company Name", "position": "Job Title", "website": "https://company-domain.com or null", "summary": {"location": "Location", "salary_range": "Salary range or null", "description": "Brief role description", "responsibilities": ["resp1", "resp2"], "requirements": ["req1", "req2"], "benefits": ["benefit1", "benefit2"]}}. For the website field, look for the company\'s main website URL mentioned in the posting (e.g., "Learn more at harvey.ai", "Visit us at company.com", links in the footer, or the company\'s careers page domain). Extract the root domain (e.g., "harvey.ai" not "harvey.ai/careers"). If no website is found, use null.'
            },
            {
              role: 'user',
              content: `Extract company name, position title, company website URL, and job details from this job posting:\n\n${pageContent.substring(0, 10000)}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!jobInfoResponse.ok) {
        const errorText = await jobInfoResponse.text();
        console.error('AI API error:', jobInfoResponse.status, errorText);
        throw new Error(`AI API returned status ${jobInfoResponse.status}`);
      }

      const jobInfoData = await jobInfoResponse.json();
      const jobInfoContent = jobInfoData.choices[0].message.content;

      // Parse JSON response
      let cleaned = jobInfoContent.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      cleaned = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      try {
        const jobInfo = JSON.parse(cleaned);
        return {
          company: jobInfo.company,
          position: jobInfo.position,
          roleSummary: jobInfo.summary,
          extractedWebsite: jobInfo.website,
        };
      } catch (e) {
        console.error('Failed to parse job info JSON:', e);
        console.error('Raw AI content:', jobInfoContent?.substring(0, 500));
        throw new Error('Failed to parse job information');
      }
    }

    // Attempt extraction with one automatic retry
    let company: string | null = null;
    let position: string | null = null;
    let roleSummary: any = null;
    let extractedWebsite: string | null = null;

    try {
      const result = await extractJobInfo();
      company = result.company;
      position = result.position;
      roleSummary = result.roleSummary;
      extractedWebsite = result.extractedWebsite;
    } catch (firstError) {
      console.warn('First extraction attempt failed, retrying in 2s...', firstError instanceof Error ? firstError.message : firstError);
      await new Promise((r) => setTimeout(r, 2000));
      const result = await extractJobInfo();
      company = result.company;
      position = result.position;
      roleSummary = result.roleSummary;
      extractedWebsite = result.extractedWebsite;
      console.log('Retry succeeded');
    }

    // Update application with extracted company, position, summary, and company_domain
    const updateData: any = {};
    if (company) {
      updateData.company = company;
      // Prefer extracted website URL for domain, otherwise derive from job URL
      if (extractedWebsite) {
        try {
          const websiteUrl = new URL(extractedWebsite.startsWith('http') ? extractedWebsite : `https://${extractedWebsite}`);
          updateData.company_domain = websiteUrl.hostname.replace(/^www\./, '');
          console.log('Using extracted website domain:', updateData.company_domain);
        } catch {
          updateData.company_domain = deriveCompanyDomain(jobUrl, company);
          console.log('Failed to parse extracted website, using derived domain:', updateData.company_domain);
        }
      } else {
        updateData.company_domain = deriveCompanyDomain(jobUrl, company);
        console.log('No website extracted, using derived domain:', updateData.company_domain);
      }
    }
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