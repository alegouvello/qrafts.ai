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
  const addWrappedText = (text: string, fontSize: number, maxWidth: number, lineHeight: number = 5) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    }
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('PROFESSIONAL SUMMARY', margin, yPos);
    yPos += 7;
    
    doc.setTextColor(...TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const summaryText = stripHTML(data.summary);
    addWrappedText(summaryText, 10, contentWidth, 5);
    yPos += 3;
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('SKILLS', margin, yPos);
    yPos += 7;
    
    doc.setTextColor(...TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const skillsText = data.skills.join('  •  ');
    addWrappedText(skillsText, 10, contentWidth, 5);
    yPos += 3;
  }

  // Experience
  if (data.experience && data.experience.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('PROFESSIONAL EXPERIENCE', margin, yPos);
    yPos += 7;
    
    data.experience.forEach((exp, index) => {
      checkPageBreak(25);
      
      // Position and Company
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SECONDARY_COLOR);
      const position = exp.position || exp.title || 'Position';
      doc.text(position, margin, yPos);
      yPos += 5;
      
      // Company and Duration
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      const duration = exp.duration || (exp.start_date && exp.end_date ? `${exp.start_date} - ${exp.end_date}` : '');
      doc.text(`${exp.company}${duration ? ` | ${duration}` : ''}`, margin, yPos);
      yPos += 5;
      
      // Description
      if (exp.description) {
        const descText = stripHTML(exp.description);
        addWrappedText(descText, 9, contentWidth, 4.5);
      }
      
      if (index < data.experience.length - 1) {
        yPos += 3;
      }
    });
    yPos += 3;
  }

  // Education
  if (data.education && data.education.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('EDUCATION', margin, yPos);
    yPos += 7;
    
    data.education.forEach((edu, index) => {
      checkPageBreak(15);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SECONDARY_COLOR);
      doc.text(edu.degree, margin, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      const school = edu.school || edu.institution || '';
      const year = edu.year || (edu.start_date && edu.end_date ? `${edu.start_date} - ${edu.end_date}` : '');
      doc.text(`${school}${year ? ` | ${year}` : ''}`, margin, yPos);
      yPos += 5;
      
      if (edu.field) {
        doc.setFontSize(9);
        doc.text(`Field: ${edu.field}`, margin, yPos);
        yPos += 4;
      }
      
      if (index < data.education.length - 1) {
        yPos += 2;
      }
    });
    yPos += 3;
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('CERTIFICATIONS', margin, yPos);
    yPos += 7;
    
    data.certifications.forEach((cert) => {
      checkPageBreak(10);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      // Handle both string and object formats
      if (typeof cert === 'string') {
        doc.text(`• ${cert}`, margin, yPos);
        yPos += 4;
      } else {
        doc.text(`• ${cert.name}`, margin, yPos);
        yPos += 4;
        
        if (cert.issuer || cert.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`  ${cert.issuer || ''}${cert.date ? ` | ${cert.date}` : ''}`, margin, yPos);
          yPos += 4;
        }
      }
    });
    yPos += 3;
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('PROJECTS', margin, yPos);
    yPos += 7;
    
    data.projects.forEach((project) => {
      checkPageBreak(12);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      doc.text(`• ${project.name}`, margin, yPos);
      yPos += 4;
      
      if (project.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        addWrappedText(`  ${stripHTML(project.description)}`, 9, contentWidth - 5, 4);
      }
    });
    yPos += 3;
  }

  // Publications
  if (data.publications && data.publications.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('PUBLICATIONS', margin, yPos);
    yPos += 7;
    
    data.publications.forEach((pub) => {
      checkPageBreak(10);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      // Handle both string and object formats
      if (typeof pub === 'string') {
        doc.text(`• ${pub}`, margin, yPos);
        yPos += 4;
      } else {
        doc.text(`• ${pub.title}`, margin, yPos);
        yPos += 4;
        
        if (pub.publisher || pub.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`  ${pub.publisher || ''}${pub.date ? ` | ${pub.date}` : ''}`, margin, yPos);
          yPos += 4;
        }
      }
    });
    yPos += 3;
  }

  // Awards
  if (data.awards && data.awards.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('AWARDS & HONORS', margin, yPos);
    yPos += 7;
    
    data.awards.forEach((award) => {
      checkPageBreak(10);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      
      // Handle both string and object formats
      if (typeof award === 'string') {
        doc.text(`• ${award}`, margin, yPos);
        yPos += 4;
      } else {
        const awardTitle = award.title || award.name || 'Award';
        doc.text(`• ${awardTitle}`, margin, yPos);
        yPos += 4;
        
        if (award.issuer || award.date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`  ${award.issuer || ''}${award.date ? ` | ${award.date}` : ''}`, margin, yPos);
          yPos += 4;
        }
      }
    });
    yPos += 3;
  }

  // Languages
  if (data.languages && data.languages.length > 0) {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('LANGUAGES', margin, yPos);
    yPos += 7;
    
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
    
    addWrappedText(languagesText, 10, contentWidth, 5);
  }

  // Save PDF
  const fileName = `${data.full_name || 'Resume'}_Resume.pdf`;
  doc.save(fileName);
}
