import { Badge } from "@/components/ui/badge";

interface FormattedNotesProps {
  notes: string;
}

export const FormattedNotes = ({ notes }: FormattedNotesProps) => {
  // Parse notes into sections
  const sections = parseNotes(notes);

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <div key={index} className="space-y-2">
          {section.title && (
            <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
              <Badge variant="outline" className="text-xs font-semibold">
                {section.title}
              </Badge>
            </div>
          )}
          <div className="space-y-2 pl-1">
            {section.items.map((item, itemIndex) => (
              <div key={itemIndex} className="text-sm text-muted-foreground">
                {item.isMainPoint ? (
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{item.text}</p>
                  </div>
                ) : item.isBullet ? (
                  <div className="flex gap-2 items-start">
                    <span className="text-primary mt-1">•</span>
                    <p className="flex-1 leading-relaxed">{item.text}</p>
                  </div>
                ) : (
                  <p className="leading-relaxed text-muted-foreground/80">{item.text}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Parse notes into structured sections
function parseNotes(notes: string) {
  const lines = notes.split('\n').filter(line => line.trim());
  const sections: Array<{ title: string | null; items: Array<{ text: string; isMainPoint: boolean; isBullet: boolean }> }> = [];
  
  let currentSection: { title: string | null; items: Array<{ text: string; isMainPoint: boolean; isBullet: boolean }> } = {
    title: null,
    items: []
  };

  // Known section headers
  const sectionHeaders = [
    'CURRENT ROLE',
    'EXPERIENCE',
    'EDUCATION',
    'SKILLS',
    'BACKGROUND',
    'ACHIEVEMENTS',
    'CERTIFICATIONS',
    'PUBLICATIONS',
    'PROJECTS',
    'INTERESTS'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this is a section header
    if (sectionHeaders.includes(line.toUpperCase())) {
      // Save the current section if it has content
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      // Start a new section
      currentSection = {
        title: line.toUpperCase(),
        items: []
      };
    } else if (line.startsWith('-') || line.startsWith('•')) {
      // This is a bullet point
      currentSection.items.push({
        text: line.replace(/^[-•]\s*/, ''),
        isMainPoint: false,
        isBullet: true
      });
    } else if (line.includes('|') && (line.includes('20') || line.includes('yrs'))) {
      // This looks like a job/education entry with dates
      currentSection.items.push({
        text: line,
        isMainPoint: true,
        isBullet: false
      });
    } else if (line.length > 0) {
      // Regular text content
      // Check if it's a continuation of a bullet point
      const lastItem = currentSection.items[currentSection.items.length - 1];
      if (lastItem && lastItem.isBullet && !line.match(/^\w+:/)) {
        // Append to the last bullet point
        lastItem.text += ' ' + line;
      } else {
        currentSection.items.push({
          text: line,
          isMainPoint: false,
          isBullet: false
        });
      }
    }
  }

  // Add the last section
  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}
