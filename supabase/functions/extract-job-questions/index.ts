import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Fetch the job posting page
    let pageContent = '';
    try {
      const response = await fetch(jobUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch job posting: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Basic HTML to text conversion (strip tags)
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000); // Limit content size
      
      console.log('Fetched page content, length:', pageContent.length);
    } catch (error) {
      console.error('Error fetching job posting:', error);
      throw new Error('Failed to fetch job posting page');
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
            content: 'You are an expert at analyzing job postings and extracting application questions. Extract all questions that applicants need to answer, such as: "Why do you want to work here?", "Describe your experience with...", "What is your salary expectation?", etc. Return ONLY a JSON array of question strings, nothing else. If no questions are found, return an empty array [].'
          },
          {
            role: 'user',
            content: `Extract all application questions from this job posting:\n\n${pageContent}`
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
