import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import JSZip from 'https://esm.sh/jszip@3.10.1';

// PDF text extraction function using pdfjs-serverless
async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  // Dynamic import to avoid build issues
  // deno-lint-ignore no-explicit-any
  const pdfjsServerless: any = await import('https://esm.sh/pdfjs-serverless@0.4.0?bundle');
  
  // Try to get the function from different export patterns
  let getDocument = pdfjsServerless.getDocument || pdfjsServerless.default?.getDocument;
  
  if (!getDocument && pdfjsServerless.resolvePDFJS) {
    // Fallback: resolve PDF.js and get the function
    const pdfjs = await pdfjsServerless.resolvePDFJS();
    getDocument = pdfjs.getDocument;
  }
  
  if (!getDocument) {
    throw new Error('Could not load PDF.js library');
  }
  
  const document = await getDocument({ data, useSystemFonts: true }).promise;
  return await extractPagesText(document);
}

// deno-lint-ignore no-explicit-any
async function extractPagesText(document: any): Promise<string> {
  let fullText = '';
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const textContent = await page.getTextContent();
    // deno-lint-ignore no-explicit-any
    const pageText = textContent.items
      .filter((item: any) => item.str != null)
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText.trim();
}

// OCR function using AI vision for scanned PDFs
async function extractTextWithOCR(pdfData: Uint8Array, lovableApiKey: string): Promise<string> {
  console.log('Using AI vision for OCR on scanned PDF...');
  
  // Convert PDF bytes to base64 for the vision API
  const base64Pdf = btoa(String.fromCharCode(...pdfData));
  
  // Use Lovable AI vision model to extract text from the PDF
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a scanned PDF resume. Please perform OCR and extract ALL text from this document exactly as it appears. Preserve the structure including:
- All headings and section titles
- All bullet points and their nesting
- All dates, locations, and contact information
- All job titles, company names, and descriptions
- Education details, certifications, skills
- Any URLs or links visible

Output the raw text content only, preserving the original formatting and structure as much as possible. Do not add any commentary.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OCR API error:', response.status, errorText);
    throw new Error('Failed to perform OCR on scanned PDF');
  }

  const data = await response.json();
  const extractedText = data.choices?.[0]?.message?.content || '';
  
  console.log('OCR extracted text length:', extractedText.length);
  return extractedText;
}

// Check if text appears to be from a scanned PDF (too short or mostly whitespace)
function isLikelyScannedPdf(text: string): boolean {
  // Remove whitespace and check if there's meaningful content
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // If text is very short (less than 100 chars), it's likely scanned
  if (cleanText.length < 100) {
    console.log('PDF appears to be scanned (text too short):', cleanText.length, 'chars');
    return true;
  }
  
  // Check if text has very few recognizable words
  const words = cleanText.split(' ').filter(w => w.length > 2);
  if (words.length < 20) {
    console.log('PDF appears to be scanned (too few words):', words.length);
    return true;
  }
  
  return false;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  resumeUrl?: string;
  fileBase64?: string;
  fileName?: string;
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
    
    // Check if it's a bullet point and get indentation level
    const isBullet = /<w:numPr>/.test(paragraphContent);
    const indentMatch = paragraphContent.match(/<w:ilvl[^>]+w:val="(\d+)"/);
    const indentLevel = indentMatch ? parseInt(indentMatch[1]) : 0;
    
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
      paragraphs.push({ text, isHeading, isBullet, level: isBullet ? indentLevel : level });
    }
  }
  
  // Format the paragraphs into structured text with nested bullets
  let structuredText = '';
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    if (para.isHeading) {
      structuredText += `\n${'#'.repeat(para.level)} ${para.text}\n`;
    } else if (para.isBullet) {
      // Add indentation marker for nested bullets
      const indent = '  '.repeat(para.level);
      structuredText += `${indent}• ${para.text}\n`;
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

    const { resumeUrl, fileBase64, fileName: inputFileName }: RequestBody = await req.json();
    
    let extractedText = '';
    let fileArrayBuffer: ArrayBuffer;
    let fileName: string;

    // Handle base64 input (from UploadCustomResumeDialog)
    if (fileBase64 && inputFileName) {
      console.log('Processing base64 file:', inputFileName);
      fileName = inputFileName.toLowerCase();
      
      // Decode base64 to ArrayBuffer
      const binaryString = atob(fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileArrayBuffer = bytes.buffer;
    } 
    // Handle storage URL (from UploadResumeDialog)
    else if (resumeUrl) {
      console.log('Parsing resume from storage:', resumeUrl);
      fileName = resumeUrl.toLowerCase();

      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resumes')
        .download(resumeUrl);

      if (downloadError || !fileData) {
        console.error('Error downloading file:', downloadError);
        throw new Error('Failed to download resume file');
      }

      fileArrayBuffer = await fileData.arrayBuffer();
    } else {
      throw new Error('Either resumeUrl or fileBase64 with fileName must be provided');
    }

    console.log('File ready, detecting type and extracting text...');

    // Check if it's a Word document
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      console.log('Processing Word document...');
      
      try {
        extractedText = await extractStructuredTextFromDocx(fileArrayBuffer);
        console.log('Extracted structured text from Word document, length:', extractedText.length);
      } catch (e) {
        console.error('Error processing Word document:', e);
        throw new Error('Failed to extract text from Word document');
      }
    } 
    // Check if it's a PDF
    else if (fileName.endsWith('.pdf')) {
      console.log('Processing PDF document...');
      
      const pdfData = new Uint8Array(fileArrayBuffer);
      
      try {
        // First, try standard text extraction
        extractedText = await extractTextFromPdf(pdfData);
        console.log('Extracted text from PDF, length:', extractedText.length);
        
        // Check if this looks like a scanned PDF (no/little text extracted)
        if (isLikelyScannedPdf(extractedText)) {
          console.log('Detected scanned PDF, falling back to OCR...');
          extractedText = await extractTextWithOCR(pdfData, lovableApiKey);
        }
      } catch (e) {
        console.error('Error with standard PDF extraction, trying OCR:', e);
        
        // If standard extraction fails, try OCR as fallback
        try {
          extractedText = await extractTextWithOCR(pdfData, lovableApiKey);
        } catch (ocrError) {
          console.error('OCR also failed:', ocrError);
          throw new Error('Failed to extract text from PDF. Please paste the text manually.');
        }
      }
    }
    else {
      // Fallback for other formats
      console.log('Unsupported document format:', fileName);
      throw new Error('Only PDF, DOC, and DOCX files are supported. Please paste the text manually for other formats.');
    }

    console.log('Sending extracted text to AI for structuring...');

    // Enhanced AI prompt for better data extraction
    const systemPrompt = `You are an expert resume parser. Extract ALL information from the resume text into structured JSON format.

CRITICAL RULES:
1. Extract EVERY piece of information - do not skip any sections
2. Preserve dates, locations, and time periods exactly as written
3. For publications, extract title, publisher/platform, date, and URL (if present in markdown links)
4. For experience, include: company, position, location, start_date, end_date, and FULL description
5. For education, include: institution, degree, field, location, start_date, end_date, gpa, honors, thesis/dissertation, and academic achievements - extract ALL education entries including certifications and training programs
6. Extract academic honors like "Summa Cum Laude", "Magna Cum Laude", "Dean's List", etc.
7. Extract thesis or dissertation titles if mentioned
8. Identify academic achievements like scholarships, research grants, publications during studies, teaching assistant roles
9. Identify and extract: skills, certifications, projects, awards, languages, volunteer work, interests

SUMMARY FORMATTING:
- Convert bullet points to proper HTML format
- Split summary by bullet character (•) or newline-separated points
- Wrap multiple bullet points in <ul><li> tags
- Preserve the exact text of each bullet point
- Example: "• Point 1 • Point 2" becomes "<ul><li>Point 1</li><li>Point 2</li></ul>"
- If no bullets, wrap in <p> tags

EXPERIENCE DESCRIPTION FORMATTING:
- Detect and preserve nested bullet structures
- Main bullet points should have sub-points indented beneath them
- Convert to nested HTML <ul> lists when there are sub-bullets
- Main point format: "<li>Main point<ul><li>Sub-point 1</li><li>Sub-point 2</li></ul></li>"
- Look for patterns like "Point:" followed by sub-points
- Preserve exact text of each bullet and sub-bullet
- If no nesting, use flat <ul><li> structure

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
  "summary": "string (HTML formatted with <ul><li> tags or <p> tags)",
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
      "institution": "string (school or university name)",
      "degree": "string (degree or certification name)",
      "field": "string (field of study)",
      "location": "string (city, country)",
      "start_date": "string (e.g., '2009' or 'Sept 2009')",
      "end_date": "string (e.g., '2011' or 'Present')",
      "gpa": "string (e.g., '3.8/4.0' or '17.5/20')",
      "honors": ["string (e.g., 'Summa Cum Laude', 'Dean's List')"],
      "thesis": "string (title of thesis or dissertation if mentioned)",
      "achievements": ["string (academic achievements like scholarships, grants, publications, teaching roles)"]
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

    // Only save to user_profiles if this is a storage-based upload (not for custom resume uploads)
    if (resumeUrl) {
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile: extractedData,
        text: extractedText, // Return the raw extracted text for custom resume uploads
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
