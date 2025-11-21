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

export function generateResumePDF(data: ResumeData) {
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
    checkPageBreak(15);
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
    
    const summaryText = stripHTML(data.summary);
    addWrappedText(summaryText, 10, contentWidth, 5.5);
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
      checkPageBreak(30);
      
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
        const descText = stripHTML(exp.description);
        
        // Split by bullet points or periods to create better readability
        const bulletPoints = descText.split(/[•\n]/).filter(text => text.trim().length > 0);
        
        bulletPoints.forEach((point, idx) => {
          checkPageBreak(8);
          const cleanPoint = point.trim();
          if (cleanPoint) {
            // Add bullet
            doc.setFontSize(12);
            doc.text('•', margin + 2, yPos);
            
            // Add text
            doc.setFontSize(9.5);
            const lines = doc.splitTextToSize(cleanPoint, contentWidth - 8);
            lines.forEach((line: string, lineIdx: number) => {
              if (lineIdx > 0) checkPageBreak(5);
              doc.text(line, margin + 8, yPos);
              yPos += 5;
            });
            yPos += 1; // Small gap between bullets
          }
        });
      }
      
      if (index < data.experience.length - 1) {
        yPos += 4;
      }
    });
    yPos += 4;
  }

  // Education
  if (data.education && data.education.length > 0) {
    addSectionHeader('EDUCATION');
    
    data.education.forEach((edu, index) => {
      checkPageBreak(18);
      
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
      checkPageBreak(15);
      
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
          checkPageBreak(5);
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

  // Save PDF
  const fileName = `${data.full_name || 'Resume'}_Resume.pdf`;
  doc.save(fileName);
}
