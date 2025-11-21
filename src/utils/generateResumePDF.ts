import jsPDF from 'jspdf';

interface ResumeData {
  full_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  website_url?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    position?: string;
    title?: string;
    company: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    school?: string;
    institution?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    year?: string;
    field?: string;
  }>;
  certifications?: (string | { name: string; issuer?: string; date?: string })[];
  projects?: Array<{
    name: string;
    description?: string;
    url?: string;
  }>;
  publications?: (string | { title: string; publisher?: string; date?: string })[];
  awards?: (string | { title?: string; name?: string; issuer?: string; date?: string })[];
  languages?: (string | { language: string; proficiency?: string })[];
  volunteer_work?: Array<{
    role: string;
    organization: string;
    description?: string;
  }>;
  interests?: string[];
}

const PRIMARY_COLOR: [number, number, number] = [41, 128, 185]; // Professional blue
const SECONDARY_COLOR: [number, number, number] = [52, 73, 94]; // Dark gray
const TEXT_COLOR: [number, number, number] = [44, 62, 80]; // Text gray
const LIGHT_GRAY: [number, number, number] = [236, 240, 241];

export function generateResumePDF(data: ResumeData, layout: 'single' | 'two-column' = 'single', preview: boolean = false): string | void {
  if (layout === 'two-column') {
    return generateTwoColumnPDF(data, preview);
  } else {
    return generateSingleColumnPDF(data, preview);
  }
}

function generateSingleColumnPDF(data: ResumeData, preview: boolean = false): string | void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let yPos = margin;

  // Helper function to extract bullet points from HTML
  const extractBulletPoints = (html: string = ''): string[] => {
    const results: string[] = [];
    
    // First extract <p> tags (intro paragraphs)
    const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gi);
    if (pMatches && pMatches.length > 0) {
      pMatches.forEach(p => {
        const cleaned = p
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        if (cleaned.length > 0) {
          results.push(cleaned);
        }
      });
    }
    
    // Then extract <li> items
    const liMatches = html.match(/<li[^>]*>(.*?)<\/li>/gi);
    if (liMatches && liMatches.length > 0) {
      liMatches.forEach(li => {
        const cleaned = li
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        if (cleaned.length > 0) {
          results.push(cleaned);
        }
      });
    }
    
    // If we found p or li tags, return those
    if (results.length > 0) {
      return results;
    }
    
    // If no structured tags, strip HTML and split by bullets or newlines
    const stripped = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    // Split by bullet character or newlines
    const points = stripped.split(/[•\n]/);
    return points.map(p => p.trim()).filter(p => p.length > 0);
  };

  // Helper function to strip HTML tags
  const stripHTML = (html: string = ''): string => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper function to wrap and add text
  const addWrappedText = (text: string, fontSize: number, maxWidth: number, lineHeight: number = 6) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    }
  };

  // Helper to add section header
  const addSectionHeader = (title: string) => {
    checkPageBreak(25);
    yPos += 2; // Extra space before section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(title, margin, yPos);
    yPos += 2;
    
    // Add underline
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
  };

  // Header with name and contact info
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(data.full_name || 'Your Name', margin, 20);
  
  // Contact Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  yPos = 28;
  const contactInfo = [];
  if (data.email) contactInfo.push(data.email);
  if (data.phone) contactInfo.push(data.phone);
  if (data.location) contactInfo.push(data.location);
  
  doc.text(contactInfo.join('  •  '), margin, yPos);
  yPos += 4;
  
  const links = [];
  if (data.linkedin_url) links.push(data.linkedin_url.replace('https://', ''));
  if (data.website_url) links.push(data.website_url.replace('https://', ''));
  
  if (links.length > 0) {
    doc.text(links.join('  •  '), margin, yPos);
  }
  
  yPos = 55;
  doc.setTextColor(...TEXT_COLOR);

  // Professional Summary
  if (data.summary) {
    addSectionHeader('PROFESSIONAL SUMMARY');
    
    doc.setTextColor(...TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Check if summary has bullet points
    const summaryBullets = extractBulletPoints(data.summary);
    
    if (summaryBullets.length > 1) {
      // Has multiple items - check if first is intro paragraph
      const firstParagraph = summaryBullets[0];
      let hasIntroParagraph = false;
      
      // If first item is long and doesn't start with bold label, it's an intro paragraph
      if (firstParagraph && firstParagraph.length > 100 && !(/^[A-Z][A-Za-z\s&]+\s*[–-]\s/.test(firstParagraph))) {
        addWrappedText(firstParagraph, 10, contentWidth, 5.5);
        yPos += 2;
        hasIntroParagraph = true;
      }
      
      // Print remaining items as bullet points
      summaryBullets.forEach((bullet, idx) => {
        // Skip first item if it was the intro paragraph
        if (idx === 0 && hasIntroParagraph) return;
        
        const cleanBullet = bullet.trim();
        if (cleanBullet) {
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(cleanBullet, contentWidth - 8);
          const bulletHeight = (lines.length * 5.5) + 2;
          
          checkPageBreak(bulletHeight);
          
          doc.setFontSize(12);
          doc.text('•', margin + 2, yPos);
          
          doc.setFontSize(10);
          lines.forEach((line: string) => {
            doc.text(line, margin + 8, yPos);
            yPos += 5.5;
          });
          yPos += 1;
        }
      });
    } else {
      // No bullet points - format as paragraph
      const summaryText = stripHTML(data.summary);
      addWrappedText(summaryText, 10, contentWidth, 5.5);
    }
    yPos += 4;
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    addSectionHeader('SKILLS');
    
    doc.setTextColor(...TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const skillsText = data.skills.join('  •  ');
    addWrappedText(skillsText, 10, contentWidth, 5.5);
    yPos += 4;
  }

  // Experience
  if (data.experience && data.experience.length > 0) {
    addSectionHeader('PROFESSIONAL EXPERIENCE');
    
    data.experience.forEach((exp, index) => {
      // Calculate minimum space needed for job header (title + company + at least one bullet)
      const minJobSpace = 35;
      checkPageBreak(minJobSpace);
      
      // Position
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SECONDARY_COLOR);
      const position = exp.position || exp.title || 'Position';
      doc.text(position, margin, yPos);
      yPos += 5.5;
      
      // Company and Duration
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      const duration = exp.duration || (exp.start_date && exp.end_date ? `${exp.start_date} - ${exp.end_date}` : '');
      doc.text(`${exp.company}${duration ? ` | ${duration}` : ''}`, margin, yPos);
      yPos += 6;
      
      // Description with bullet points
      if (exp.description) {
        doc.setFont('helvetica', 'normal');
        
        // Extract bullet points from HTML properly
        const bulletPoints = extractBulletPoints(exp.description);
        
        bulletPoints.forEach((point, idx) => {
          const cleanPoint = point.trim();
          if (cleanPoint) {
            // Calculate how much space this bullet point will need
            doc.setFontSize(9.5);
            const lines = doc.splitTextToSize(cleanPoint, contentWidth - 8);
            const bulletHeight = (lines.length * 5) + 2; // 5mm per line + 2mm gap
            
            // Check if entire bullet point fits, if not start new page
            checkPageBreak(bulletHeight);
            
            // Add bullet
            doc.setFontSize(12);
            doc.text('•', margin + 2, yPos);
            
            // Add text
            doc.setFontSize(9.5);
            lines.forEach((line: string) => {
              doc.text(line, margin + 8, yPos);
              yPos += 5;
            });
            yPos += 1; // Small gap between bullets
          }
        });
      }
      
      if (index < data.experience.length - 1) {
        yPos += 5;
      }
    });
    yPos += 6;
  }

  // Education
  if (data.education && data.education.length > 0) {
    addSectionHeader('EDUCATION');
    
    data.education.forEach((edu, index) => {
      // Ensure we have enough space for the entire education entry
      const minEduSpace = 22;
      checkPageBreak(minEduSpace);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SECONDARY_COLOR);
      doc.text(edu.degree, margin, yPos);
      yPos += 5.5;
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      const school = edu.school || edu.institution || '';
      const year = edu.year || (edu.start_date && edu.end_date ? `${edu.start_date} - ${edu.end_date}` : '');
      doc.text(`${school}${year ? ` | ${year}` : ''}`, margin, yPos);
      yPos += 5;
      
      if (edu.field) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text(`Field: ${edu.field}`, margin, yPos);
        yPos += 5;
      }
      
      if (index < data.education.length - 1) {
        yPos += 3;
      }
    });
    yPos += 4;
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    addSectionHeader('CERTIFICATIONS');
    
    data.certifications.forEach((cert) => {
      checkPageBreak(12);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      // Handle both string and object formats
      if (typeof cert === 'string') {
        doc.text(`• ${cert}`, margin, yPos);
        yPos += 5.5;
      } else {
        doc.text(`• ${cert.name}`, margin, yPos);
        yPos += 5;
        
        if (cert.issuer || cert.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.text(`  ${cert.issuer || ''}${cert.date ? ` | ${cert.date}` : ''}`, margin + 3, yPos);
          yPos += 5.5;
        }
      }
    });
    yPos += 4;
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    addSectionHeader('PROJECTS');
    
    data.projects.forEach((project) => {
      // Calculate total space needed for project
      if (project.description) {
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(stripHTML(project.description), contentWidth - 8);
        const projectHeight = 5.5 + (lines.length * 5) + 2; // title + description lines + gap
        checkPageBreak(projectHeight);
      } else {
        checkPageBreak(8);
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...TEXT_COLOR);
      doc.text(`• ${project.name}`, margin, yPos);
      yPos += 5.5;
      
      if (project.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(stripHTML(project.description), contentWidth - 8);
        lines.forEach((line: string) => {
          doc.text(line, margin + 8, yPos);
          yPos += 5;
        });
        yPos += 2;
      }
    });
    yPos += 4;
  }

  // Publications
  if (data.publications && data.publications.length > 0) {
    addSectionHeader('PUBLICATIONS');
    
    data.publications.forEach((pub) => {
      checkPageBreak(12);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      // Handle both string and object formats
      if (typeof pub === 'string') {
        doc.text(`• ${pub}`, margin, yPos);
        yPos += 5.5;
      } else {
        doc.text(`• ${pub.title}`, margin, yPos);
        yPos += 5;
        
        if (pub.publisher || pub.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.text(`  ${pub.publisher || ''}${pub.date ? ` | ${pub.date}` : ''}`, margin + 3, yPos);
          yPos += 5.5;
        }
      }
    });
    yPos += 4;
  }

  // Awards
  if (data.awards && data.awards.length > 0) {
    addSectionHeader('AWARDS & HONORS');
    
    data.awards.forEach((award) => {
      checkPageBreak(12);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      // Handle both string and object formats
      if (typeof award === 'string') {
        doc.text(`• ${award}`, margin, yPos);
        yPos += 5.5;
      } else {
        const awardTitle = award.title || award.name || 'Award';
        doc.text(`• ${awardTitle}`, margin, yPos);
        yPos += 5;
        
        if (award.issuer || award.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.text(`  ${award.issuer || ''}${award.date ? ` | ${award.date}` : ''}`, margin + 3, yPos);
          yPos += 5.5;
        }
      }
    });
    yPos += 4;
  }

  // Languages
  if (data.languages && data.languages.length > 0) {
    addSectionHeader('LANGUAGES');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_COLOR);
    
    // Handle both string and object formats
    const languagesText = data.languages.map(l => {
      if (typeof l === 'string') {
        return l;
      }
      return `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`;
    }).join('  •  ');
    
    addWrappedText(languagesText, 10, contentWidth, 5.5);
    yPos += 2;
  }

  // Save or return PDF
  if (preview) {
    return doc.output('dataurlstring');
  } else {
    const fileName = `${data.full_name || 'Resume'}_Resume.pdf`;
    doc.save(fileName);
  }
}

function generateTwoColumnPDF(data: ResumeData, preview: boolean = false): string | void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const sidebarWidth = 65;
  const mainMargin = sidebarWidth + 10;
  const margin = 8;
  const mainWidth = pageWidth - mainMargin - margin;
  let yPos = margin;
  let sidebarY = margin;

  // Helper function to extract bullet points from HTML
  const extractBulletPoints = (html: string = ''): string[] => {
    const results: string[] = [];
    
    // First extract <p> tags (intro paragraphs)
    const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gi);
    if (pMatches && pMatches.length > 0) {
      pMatches.forEach(p => {
        const cleaned = p
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        if (cleaned.length > 0) {
          results.push(cleaned);
        }
      });
    }
    
    // Then extract <li> items
    const liMatches = html.match(/<li[^>]*>(.*?)<\/li>/gi);
    if (liMatches && liMatches.length > 0) {
      liMatches.forEach(li => {
        const cleaned = li
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        if (cleaned.length > 0) {
          results.push(cleaned);
        }
      });
    }
    
    // If we found p or li tags, return those
    if (results.length > 0) {
      return results;
    }
    
    // If no structured tags, strip HTML and split by bullets or newlines
    const stripped = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    // Split by bullet character or newlines
    const points = stripped.split(/[•\n]/);
    return points.map(p => p.trim()).filter(p => p.length > 0);
  };

  // Helper function to strip HTML tags
  const stripHTML = (html: string = ''): string => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  // Helper function for page breaks
  const checkPageBreak = (requiredSpace: number, inSidebar = false) => {
    const currentY = inSidebar ? sidebarY : yPos;
    if (currentY + requiredSpace > pageHeight - margin) {
      doc.addPage();
      // Always draw sidebar background on new pages
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(0, 0, sidebarWidth, pageHeight, 'F');
      
      if (inSidebar) {
        sidebarY = margin;
      } else {
        yPos = margin;
      }
      return true;
    }
    return false;
  };

  // Draw sidebar background
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(0, 0, sidebarWidth, pageHeight, 'F');

  // SIDEBAR CONTENT
  
  // Contact Info in Sidebar
  if (data.full_name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...PRIMARY_COLOR);
    const nameLines = doc.splitTextToSize(data.full_name, sidebarWidth - 16);
    nameLines.forEach((line: string) => {
      doc.text(line, margin, sidebarY);
      sidebarY += 6;
    });
    sidebarY += 4;
  }

  // Contact details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_COLOR);

  if (data.email) {
    const emailLines = doc.splitTextToSize(data.email, sidebarWidth - 16);
    emailLines.forEach((line: string) => {
      doc.text(line, margin, sidebarY);
      sidebarY += 4;
    });
  }
  if (data.phone) {
    doc.text(data.phone, margin, sidebarY);
    sidebarY += 4;
  }
  if (data.location) {
    const locLines = doc.splitTextToSize(data.location, sidebarWidth - 16);
    locLines.forEach((line: string) => {
      doc.text(line, margin, sidebarY);
      sidebarY += 4;
    });
  }
  if (data.linkedin_url) {
    const linkedinLines = doc.splitTextToSize(data.linkedin_url.replace('https://', ''), sidebarWidth - 16);
    linkedinLines.forEach((line: string) => {
      doc.text(line, margin, sidebarY);
      sidebarY += 4;
    });
  }
  if (data.website_url) {
    const websiteLines = doc.splitTextToSize(data.website_url.replace('https://', ''), sidebarWidth - 16);
    websiteLines.forEach((line: string) => {
      doc.text(line, margin, sidebarY);
      sidebarY += 4;
    });
  }
  sidebarY += 6;

  // Skills in Sidebar
  if (data.skills && data.skills.length > 0) {
    checkPageBreak(20, true);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('SKILLS', margin, sidebarY);
    sidebarY += 2;
    doc.setLineWidth(0.3);
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.line(margin, sidebarY, sidebarWidth - margin, sidebarY);
    sidebarY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_COLOR);
    data.skills.forEach(skill => {
      checkPageBreak(6, true);
      const skillLines = doc.splitTextToSize(`• ${skill}`, sidebarWidth - 16);
      skillLines.forEach((line: string) => {
        doc.text(line, margin, sidebarY);
        sidebarY += 4;
      });
    });
    sidebarY += 4;
  }

  // Languages in Sidebar
  if (data.languages && data.languages.length > 0) {
    checkPageBreak(20, true);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('LANGUAGES', margin, sidebarY);
    sidebarY += 2;
    doc.setLineWidth(0.3);
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.line(margin, sidebarY, sidebarWidth - margin, sidebarY);
    sidebarY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_COLOR);
    data.languages.forEach(lang => {
      checkPageBreak(6, true);
      const langText = typeof lang === 'string' ? lang : `${lang.language}${lang.proficiency ? ` (${lang.proficiency})` : ''}`;
      const langLines = doc.splitTextToSize(`• ${langText}`, sidebarWidth - 16);
      langLines.forEach((line: string) => {
        doc.text(line, margin, sidebarY);
        sidebarY += 4;
      });
    });
  }

  // MAIN CONTENT AREA

  // Professional Summary
  if (data.summary) {
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('PROFESSIONAL SUMMARY', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_COLOR);
    
    // Check if summary has bullet points
    const summaryBullets = extractBulletPoints(data.summary);
    
    if (summaryBullets.length > 1) {
      // Has multiple items - check if first is intro paragraph
      const firstParagraph = summaryBullets[0];
      let hasIntroParagraph = false;
      
      // If first item is long and doesn't start with bold label, it's an intro paragraph
      if (firstParagraph && firstParagraph.length > 100 && !(/^[A-Z][A-Za-z\s&]+\s*[–-]\s/.test(firstParagraph))) {
        const introLines = doc.splitTextToSize(firstParagraph, mainWidth);
        introLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, mainMargin, yPos);
          yPos += 5;
        });
        yPos += 1;
        hasIntroParagraph = true;
      }
      
      // Print remaining items as bullet points
      summaryBullets.forEach((bullet, idx) => {
        // Skip first item if it was the intro paragraph
        if (idx === 0 && hasIntroParagraph) return;
        
        const cleanBullet = bullet.trim();
        if (cleanBullet) {
          doc.setFontSize(9);
          const lines = doc.splitTextToSize(cleanBullet, mainWidth - 6);
          const bulletHeight = (lines.length * 4.5) + 2;
          
          checkPageBreak(bulletHeight);
          
          doc.setFontSize(10);
          doc.text('•', mainMargin + 1, yPos);
          doc.setFontSize(9);
          lines.forEach((line: string) => {
            doc.text(line, mainMargin + 6, yPos);
            yPos += 4.5;
          });
          yPos += 1;
        }
      });
    } else {
      // No bullet points - format as paragraph
      const summaryText = stripHTML(data.summary);
      const summaryLines = doc.splitTextToSize(summaryText, mainWidth);
      summaryLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, mainMargin, yPos);
        yPos += 5;
      });
    }
    yPos += 4;
  }

  // Experience
  if (data.experience && data.experience.length > 0) {
    checkPageBreak(35);
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('PROFESSIONAL EXPERIENCE', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    data.experience.forEach((exp, index) => {
      // Calculate minimum space needed for job header (title + company + at least one bullet)
      const minJobSpace = 35;
      checkPageBreak(minJobSpace);

      // Position
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...SECONDARY_COLOR);
      const position = exp.position || exp.title || 'Position';
      doc.text(position, mainMargin, yPos);
      yPos += 5;

      // Company and Duration
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT_COLOR);
      const duration = exp.duration || (exp.start_date && exp.end_date ? `${exp.start_date} - ${exp.end_date}` : '');
      const companyLine = `${exp.company}${duration ? ` | ${duration}` : ''}`;
      doc.text(companyLine, mainMargin, yPos);
      yPos += 5;

      // Description
      if (exp.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const bulletPoints = extractBulletPoints(exp.description);

        bulletPoints.forEach((point) => {
          const cleanPoint = point.trim();
          if (cleanPoint) {
            // Calculate how much space this bullet point will need
            doc.setFontSize(9);
            const lines = doc.splitTextToSize(cleanPoint, mainWidth - 6);
            const bulletHeight = (lines.length * 4.5) + 2; // 4.5mm per line + 2mm gap
            
            // Check if entire bullet point fits, if not start new page
            checkPageBreak(bulletHeight);
            
            doc.setFontSize(10);
            doc.text('•', mainMargin + 1, yPos);
            doc.setFontSize(9);
            lines.forEach((line: string) => {
              doc.text(line, mainMargin + 6, yPos);
              yPos += 4.5;
            });
          }
        });
      }

      if (index < data.experience.length - 1) {
        yPos += 5;
      }
    });
    yPos += 6;
  }

  // Education
  if (data.education && data.education.length > 0) {
    checkPageBreak(30);
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('EDUCATION', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    data.education.forEach((edu, index) => {
      // Ensure we have enough space for the entire education entry
      const minEduSpace = 22;
      checkPageBreak(minEduSpace);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...SECONDARY_COLOR);
      doc.text(edu.degree, mainMargin, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT_COLOR);
      const school = edu.school || edu.institution || '';
      const year = edu.year || (edu.start_date && edu.end_date ? `${edu.start_date} - ${edu.end_date}` : '');
      doc.text(`${school}${year ? ` | ${year}` : ''}`, mainMargin, yPos);
      yPos += 4.5;

      if (edu.field) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Field: ${edu.field}`, mainMargin, yPos);
        yPos += 4.5;
      }

      if (index < data.education.length - 1) {
        yPos += 2;
      }
    });
    yPos += 4;
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    checkPageBreak(30);
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('PROJECTS', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    data.projects.forEach((project) => {
      // Calculate total space needed for project
      if (project.description) {
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(stripHTML(project.description), mainWidth - 6);
        const projectHeight = 4.5 + (lines.length * 4.5) + 1; // title + description lines + gap
        checkPageBreak(projectHeight);
      } else {
        checkPageBreak(10);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      doc.text(`• ${project.name}`, mainMargin, yPos);
      yPos += 4.5;

      if (project.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(stripHTML(project.description), mainWidth - 6);
        lines.forEach((line: string) => {
          doc.text(line, mainMargin + 6, yPos);
          yPos += 4.5;
        });
        yPos += 1;
      }
    });
  }

  // Publications
  if (data.publications && data.publications.length > 0) {
    checkPageBreak(30);
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('PUBLICATIONS', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    data.publications.forEach((pub) => {
      checkPageBreak(15);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      if (typeof pub === 'string') {
        const titleLines = doc.splitTextToSize(`• ${pub}`, mainWidth - 3);
        titleLines.forEach((line: string, index: number) => {
          doc.text(index === 0 ? line : `  ${line.trim()}`, mainMargin, yPos);
          yPos += 4.5;
        });
      } else {
        const titleLines = doc.splitTextToSize(`• ${pub.title}`, mainWidth - 3);
        titleLines.forEach((line: string, index: number) => {
          doc.text(index === 0 ? line : `  ${line.trim()}`, mainMargin, yPos);
          yPos += 4.5;
        });
        
        if (pub.publisher || pub.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`  ${pub.publisher || ''}${pub.date ? ` | ${pub.date}` : ''}`, mainMargin + 6, yPos);
          yPos += 4.5;
        }
      }
    });
    yPos += 4;
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    checkPageBreak(30);
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('CERTIFICATIONS', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    data.certifications.forEach((cert) => {
      checkPageBreak(15);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      if (typeof cert === 'string') {
        const certLines = doc.splitTextToSize(`• ${cert}`, mainWidth - 3);
        certLines.forEach((line: string, index: number) => {
          doc.text(index === 0 ? line : `  ${line.trim()}`, mainMargin, yPos);
          yPos += 4.5;
        });
      } else {
        const certLines = doc.splitTextToSize(`• ${cert.name}`, mainWidth - 3);
        certLines.forEach((line: string, index: number) => {
          doc.text(index === 0 ? line : `  ${line.trim()}`, mainMargin, yPos);
          yPos += 4.5;
        });
        
        if (cert.issuer || cert.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`  ${cert.issuer || ''}${cert.date ? ` | ${cert.date}` : ''}`, mainMargin + 6, yPos);
          yPos += 4.5;
        }
      }
    });
    yPos += 4;
  }

  // Awards
  if (data.awards && data.awards.length > 0) {
    checkPageBreak(30);
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('AWARDS & HONORS', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    data.awards.forEach((award) => {
      checkPageBreak(15);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      if (typeof award === 'string') {
        const awardLines = doc.splitTextToSize(`• ${award}`, mainWidth - 3);
        awardLines.forEach((line: string, index: number) => {
          doc.text(index === 0 ? line : `  ${line.trim()}`, mainMargin, yPos);
          yPos += 4.5;
        });
      } else {
        const awardTitle = award.title || award.name || 'Award';
        const awardLines = doc.splitTextToSize(`• ${awardTitle}`, mainWidth - 3);
        awardLines.forEach((line: string, index: number) => {
          doc.text(index === 0 ? line : `  ${line.trim()}`, mainMargin, yPos);
          yPos += 4.5;
        });
        
        if (award.issuer || award.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`  ${award.issuer || ''}${award.date ? ` | ${award.date}` : ''}`, mainMargin + 6, yPos);
          yPos += 4.5;
        }
      }
    });
    yPos += 4;
  }

  // Volunteer Work
  if (data.volunteer_work && data.volunteer_work.length > 0) {
    checkPageBreak(30);
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('VOLUNTEER WORK', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    data.volunteer_work.forEach((vol) => {
      if (vol.description) {
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(stripHTML(vol.description), mainWidth - 6);
        const volHeight = 4.5 + (lines.length * 4.5) + 1;
        checkPageBreak(volHeight);
      } else {
        checkPageBreak(10);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      const orgLines = doc.splitTextToSize(`• ${vol.organization}`, mainWidth - 3);
      orgLines.forEach((line: string, index: number) => {
        doc.text(index === 0 ? line : `  ${line.trim()}`, mainMargin, yPos);
        yPos += 4.5;
      });

      if (vol.role) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text(vol.role, mainMargin + 6, yPos);
        yPos += 4.5;
      }

      if (vol.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(stripHTML(vol.description), mainWidth - 6);
        lines.forEach((line: string) => {
          doc.text(line, mainMargin + 6, yPos);
          yPos += 4.5;
        });
        yPos += 1;
      }
    });
    yPos += 4;
  }

  // Interests
  if (data.interests && data.interests.length > 0) {
    checkPageBreak(25);
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('INTERESTS', mainMargin, yPos);
    yPos += 2;
    doc.setLineWidth(0.4);
    doc.line(mainMargin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_COLOR);
    
    const interestsText = data.interests.join('  •  ');
    const lines = doc.splitTextToSize(interestsText, mainWidth);
    lines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, mainMargin, yPos);
      yPos += 4.5;
    });
    yPos += 4;
  }

  // Save or return PDF
  if (preview) {
    return doc.output('dataurlstring');
  } else {
    const fileName = `${data.full_name || 'Resume'}_TwoColumn_Resume.pdf`;
    doc.save(fileName);
  }
}

// Generate PDF preview as data URL for preview display
export function generatePDFPreview(data: ResumeData, layout: 'single' | 'two-column' = 'single'): string {
  const result = generateResumePDF(data, layout, true);
  return typeof result === 'string' ? result : '';
}

