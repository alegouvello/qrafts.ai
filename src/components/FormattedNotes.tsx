import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface FormattedNotesProps {
  notes: string;
}

export const FormattedNotes = ({ notes }: FormattedNotesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sections = parseNotes(notes);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Notes</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                <span className="text-xs">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                <span className="text-xs">Expand</span>
              </>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className="space-y-6">
        {sections.map((section, index) => (
          <div key={index} className="space-y-3">
            {section.title && (
              <div className="mb-3">
                <Badge variant="secondary" className="text-xs font-bold tracking-wide">
                  {section.title}
                </Badge>
              </div>
            )}
            <div className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="text-sm">
                  {item.isMainPoint ? (
                    <p className="font-semibold text-foreground mb-1">{item.text}</p>
                  ) : item.isBullet ? (
                    <div className="flex gap-2 items-start">
                      <span className="text-primary mt-0.5">•</span>
                      <p className="flex-1 text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// Parse notes into structured sections
function parseNotes(notes: string) {
  // Clean the notes by removing HTML tags and separator lines
  const cleanedNotes = notes
    .replace(/<hr\s*\/?>/gi, '')
    .replace(/<\/hr>/gi, '');
  
  const lines = cleanedNotes.split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Remove empty lines
      if (line.length === 0) return false;
      
      // Remove lines that are purely separator characters
      // Match lines with 3+ consecutive underscores, dashes, or equals
      if (/^[_\-=]{3,}$/.test(line)) return false;
      
      // Remove lines where separator characters make up most of the content
      const separatorCount = (line.match(/[_\-=]/g) || []).length;
      const nonSpaceCount = line.replace(/\s/g, '').length;
      if (nonSpaceCount > 0 && separatorCount / nonSpaceCount > 0.7) return false;
      
      return true;
    });

  const sections: Array<{ 
    title: string | null; 
    items: Array<{ text: string; isMainPoint: boolean; isBullet: boolean }> 
  }> = [];
  
  let currentSection: { 
    title: string | null; 
    items: Array<{ text: string; isMainPoint: boolean; isBullet: boolean }> 
  } = {
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
    'INTERESTS',
    'OTHER NOTABLE INFO',
    'ABOUT'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
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
    } else {
      // Regular text content
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
