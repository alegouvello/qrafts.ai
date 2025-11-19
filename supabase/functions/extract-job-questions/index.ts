import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  applicationId: string;
  jobUrl: string;
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

    const { applicationId, jobUrl }: RequestBody = await req.json();
    
    console.log('Extracting questions for application:', applicationId, 'from URL:', jobUrl);

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
            content: 'You are an expert at analyzing job application forms (especially Greenhouse forms) and extracting all questions that applicants need to answer. Look for ALL form fields including: text inputs, textareas, select dropdowns, radio buttons, checkboxes, and any labeled fields. Extract the exact question text or label for each field. Common questions include: personal info fields (LinkedIn, phone), essay questions ("Why do you want to work here?", "Why this company?"), experience questions, salary expectations, visa sponsorship, relocation questions, start date, demographics, etc. Return ONLY a JSON array of question strings with the exact wording from the form. If you see field labels like "First Name *", just return "First Name". Be thorough and extract ALL questions you can find.'
          },
          {
            role: 'user',
            content: `Extract ALL application form questions from this job posting page (look especially for the application form section):\n\n${pageContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to analyze job posting with AI');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI response:', aiContent);

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

    console.log('Extracted questions:', questions);

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
