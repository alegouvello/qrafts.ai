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
      
      <CollapsibleContent className="space-y-5">
        {sections.map((section, index) => (
        <div key={index} className="space-y-2.5">
          {section.title && (
            <div className="mb-3">
              <Badge variant="secondary" className="text-xs font-bold tracking-wide">
                {section.title}
              </Badge>
            </div>
          )}
          <div className="space-y-2.5">
            {section.items.map((item, itemIndex) => (
              <div key={itemIndex} className="text-sm text-muted-foreground">
                {item.isMainPoint ? (
                  <div className="space-y-1 mb-2">
                    <p className="font-semibold text-foreground text-[15px]">{item.text}</p>
                  </div>
                ) : item.isBullet ? (
                  <div className="flex gap-2.5 items-start">
                    <span className="text-primary mt-1 text-base">•</span>
                    <p className="flex-1 leading-relaxed">{item.text}</p>
                  </div>
                ) : (
                  <p className="leading-relaxed text-muted-foreground/90">{item.text}</p>
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
