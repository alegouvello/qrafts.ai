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
    
    console.log('Extracting questions for application:', applicationId);

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
        waitFor: 5000, // Wait 5 seconds for dynamic content to load
      });

      if (!scrapeResult.success) {
        throw new Error('Firecrawl scraping failed');
      }

      // Get the markdown content which is cleaner for AI processing
      pageContent = scrapeResult.markdown || '';
      console.log('Scraped page content with Firecrawl, length:', pageContent.length);
    } catch (error) {
      console.error('Error scraping with Firecrawl:', error);
      throw new Error('Failed to scrape job posting page with Firecrawl');
    }

    // This function only extracts questions, not role details
    // Role details should be updated using the refresh-job-description function

    // Use Lovable AI to extract questions
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
            content: `You extract application form fields from job posting pages. Your goal is to find ONLY the fields that appear in the actual APPLICATION FORM — the part where a candidate fills in their information to apply.

STRICT RULES:
1. ONLY extract fields from the application/apply form section of the page
2. Look for: input fields, textareas, file uploads, dropdowns, radio buttons, checkboxes that candidates must fill out
3. DO extract: Name, Email, Phone, Resume/CV upload, Cover Letter, LinkedIn URL, Portfolio/Website, work authorization questions, visa sponsorship, salary expectations, start date, referral source, custom screening questions
4. DO NOT extract: job description content, requirements, responsibilities, qualifications, benefits, company info, navigation links, footer content, cookie notices
5. DO NOT invent or assume fields exist — only return fields you can actually see in the page content
6. Strip asterisks (*) and "Required" labels from field names
7. If the page content does NOT contain an application form (e.g., it's just a job description with an "Apply" button linking elsewhere), return an EMPTY array []

Return ONLY a valid JSON array of strings with the exact field labels. Example: ["First Name", "Last Name", "Resume", "Are you authorized to work in the US?"]
If no application form fields are found, return: []`
          },
          {
            role: 'user',
            content: `Extract ONLY the application form fields (not job description content) from this page. If there is no application form on this page, return an empty array.\n\n${pageContent.substring(0, 12000)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to analyze job posting with AI');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI response received');

    // Parse the AI response to get questions
    let questions: string[] = [];
    try {
      // Try to parse as JSON
      const cleaned = aiContent.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      questions = JSON.parse(cleaned);
      
      if (!Array.isArray(questions)) {
        questions = [];
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      questions = [];
    }

    console.log('Extracted questions count:', questions.length);

    // Insert questions into the database
    if (questions.length > 0) {
      const questionsToInsert = questions.map((q, index) => ({
        application_id: applicationId,
        question_text: q,
        question_order: index,
      }));

      const { error: insertError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (insertError) {
        console.error('Error inserting questions:', insertError);
        throw new Error('Failed to save questions to database');
      }

      // Also populate shared_questions for community use
      // Fetch application to get company + position
      const { data: appData } = await supabase
        .from('applications')
        .select('company, position, url')
        .eq('id', applicationId)
        .single();

      if (appData) {
        const sharedToInsert = questions.map((q) => ({
          company: appData.company,
          position: appData.position,
          question_text: q,
          contributed_by: user.id,
          source_url: appData.url,
        }));

        // Use upsert with onConflict to skip duplicates
        const { error: sharedError } = await supabase
          .from('shared_questions')
          .upsert(sharedToInsert, { onConflict: 'company,position,question_text', ignoreDuplicates: true });

        if (sharedError) {
          console.warn('Error inserting shared questions (non-fatal):', sharedError);
        } else {
          console.log('Shared questions populated for', appData.company, appData.position);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        questionsFound: questions.length,
        questions: questions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in extract-job-questions function:', error);
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