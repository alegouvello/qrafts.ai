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

interface WordParagraph {
  text: string;
  isHeading: boolean;
  isBullet: boolean;
  level: number;
}

async function extractStructuredTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Extract document.xml which contains the main text
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) {
    throw new Error('Could not find document.xml in Word file');
  }

  // Extract relationships to get hyperlinks
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
  const relationships = new Map<string, string>();
  
  if (relsXml) {
    // Parse relationships for hyperlinks
    const relMatches = relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g);
    for (const match of relMatches) {
      relationships.set(match[1], match[2]);
    }
  }

  const paragraphs: WordParagraph[] = [];
  
  // Parse paragraphs with better structure detection
  const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
  let paragraphMatch;
  
  while ((paragraphMatch = paragraphRegex.exec(docXml)) !== null) {
    const paragraphContent = paragraphMatch[1];
    
    // Check if it's a heading
    const isHeading = /<w:pStyle[^>]+w:val="Heading[^"]*"/.test(paragraphContent);
    const headingMatch = paragraphContent.match(/<w:pStyle[^>]+w:val="Heading(\d+)"/);
    const level = headingMatch ? parseInt(headingMatch[1]) : 0;
    
    // Check if it's a bullet point
    const isBullet = /<w:numPr>/.test(paragraphContent);
    
    // Extract text from all text runs
    let text = '';
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let textMatch;
    
    while ((textMatch = textRegex.exec(paragraphContent)) !== null) {
      text += textMatch[1];
    }
    
    // Extract hyperlinks
    const hyperlinkRegex = /<w:hyperlink[^>]+r:id="([^"]+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/g;
    let hyperlinkMatch;
    
    while ((hyperlinkMatch = hyperlinkRegex.exec(paragraphContent)) !== null) {
      const relId = hyperlinkMatch[1];
      const linkContent = hyperlinkMatch[2];
      
      // Extract text from the hyperlink
      const linkTextRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let linkText = '';
      let linkTextMatch;
      
      while ((linkTextMatch = linkTextRegex.exec(linkContent)) !== null) {
        linkText += linkTextMatch[1];
      }
      
      // Add the link with its URL if available
      const url = relationships.get(relId);
      if (url && linkText) {
        text += ` [${linkText}](${url})`;
      }
    }
    
    // Clean and normalize the text
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (text) {
      paragraphs.push({ text, isHeading, isBullet, level });
    }
  }
  
  // Format the paragraphs into structured text
  let structuredText = '';
  for (const para of paragraphs) {
    if (para.isHeading) {
      structuredText += `\n${'#'.repeat(para.level)} ${para.text}\n`;
    } else if (para.isBullet) {
      structuredText += `• ${para.text}\n`;
    } else {
      structuredText += `${para.text}\n`;
    }
  }
  
  return structuredText.trim();
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
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      console.log('Processing Word document...');
      
      const arrayBuffer = await fileData.arrayBuffer();
      
      try {
        extractedText = await extractStructuredTextFromDocx(arrayBuffer);
        console.log('Extracted structured text from Word document, length:', extractedText.length);
      } catch (e) {
        console.error('Error processing Word document:', e);
        throw new Error('Failed to extract text from Word document');
      }
    } else {
      // Fallback for other formats
      console.log('Unsupported document format');
      throw new Error('Only DOC and DOCX files are supported');
    }

    console.log('Sending extracted text to AI for structuring...');

    // Enhanced AI prompt for better data extraction
    const systemPrompt = `You are an expert resume parser. Extract ALL information from the resume text into structured JSON format.

CRITICAL RULES:
1. Extract EVERY piece of information - do not skip any sections
2. Preserve dates, locations, and time periods exactly as written
3. For publications, extract title, publisher/platform, date, and URL (if present in markdown links)
4. For experience, include: company, position, location, start_date, end_date, and FULL description
5. For education, include: institution, degree, field, and dates
6. Identify and extract: skills, certifications, projects, awards, languages, volunteer work, interests

EXPERIENCE DESCRIPTION FORMATTING:
- Convert bullet points to proper HTML format
- Split descriptions by bullet character (•) or newline-separated points
- Wrap multiple bullet points in <ul><li> tags
- Preserve the exact text of each bullet point
- Example: "• Point 1 • Point 2" becomes "<ul><li>Point 1</li><li>Point 2</li></ul>"
- If no bullets, wrap in <p> tags

PUBLICATION EXTRACTION:
- Look for sections titled "Publications", "Articles", "Writing", "Papers"
- Extract URLs from markdown links: [Title](URL)
- Parse formats like "Title | Publisher • Date" or "Title - Publisher, Date"
- Capture all metadata: title, publisher, date, url

Return ONLY valid JSON with this structure:
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "linkedin_url": "string",
  "website_url": "string",
  "location": "string",
  "summary": "string (professional bio/summary)",
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "position": "string",
      "location": "string",
      "start_date": "string",
      "end_date": "string",
      "description": "string (HTML formatted with <ul><li> tags)"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "start_date": "string",
      "end_date": "string"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ],
  "publications": [
    {
      "title": "string",
      "publisher": "string",
      "date": "string",
      "url": "string (extract from markdown links or leave empty)"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "url": "string"
    }
  ],
  "awards": [
    {
      "title": "string",
      "issuer": "string",
      "date": "string"
    }
  ],
  "languages": [
    {
      "language": "string",
      "proficiency": "string"
    }
  ],
  "volunteer_work": [
    {
      "organization": "string",
      "role": "string",
      "start_date": "string",
      "end_date": "string",
      "description": "string"
    }
  ],
  "interests": ["string"],
  "additional_skills": ["string"]
}`;

    // Use AI to structure the extracted text
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Extract all information from this resume. Pay special attention to preserving structure, dates, locations, and URLs (especially in publications). Return structured JSON:\n\n${extractedText}`
          }
        ],
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

    console.log('AI response received, parsing JSON...');

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI response content:', content);
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
        website_url: extractedData.website_url || null,
        location: extractedData.location || null,
        resume_text: JSON.stringify(extractedData),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error upserting profile:', upsertError);
      throw new Error('Failed to save profile data');
    }

    console.log('Profile saved successfully');

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
