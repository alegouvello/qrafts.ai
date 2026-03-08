import DOMPurify from "dompurify";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  MapPin,
  Trophy,
  BookMarked,
  Lightbulb,
  Globe,
  Heart,
  ExternalLink,
} from "lucide-react";

interface ParsedResume {
  full_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  website_url?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    position: string;
    company: string;
    location?: string;
    start_date: string;
    end_date: string;
    description: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field?: string;
    start_date: string;
    end_date: string;
    location?: string;
    gpa?: string;
    honors?: string[];
    thesis?: string;
    achievements?: string[];
  }>;
  certifications?: (string | { name: string; issuer: string; date: string })[];
  publications?: (string | { title: string; publisher: string; date: string; url?: string })[];
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
  awards?: (string | { title: string; issuer: string; date: string })[];
  languages?: (string | { language: string; proficiency: string })[];
  volunteer_work?: Array<{
    role: string;
    organization: string;
    description: string;
  }>;
  interests?: string[];
  additional_skills?: string[];
  _sectionOrder?: string[];
}

interface ProfileSectionsProps {
  parsedData: ParsedResume;
}

const renderSection = (parsedData: ParsedResume, sectionKey: string) => {
  switch (sectionKey) {
    case "summary":
      if (!parsedData.summary) return null;
      return (
        <Card key="summary" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold">Professional Summary</h2>
            </div>
            <div
              className="prose prose-sm max-w-none text-foreground/80 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80 [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedData.summary) }}
            />
          </CardContent>
        </Card>
      );

    case "experience":
      if (!parsedData.experience?.length) return null;
      return (
        <Card key="experience" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Experience</h2>
            </div>
            <div className="space-y-8">
              {parsedData.experience.map((exp, index) => (
                <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-primary before:to-transparent">
                  <div className="absolute left-0 top-1 w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-foreground">{exp.position}</h3>
                    <p className="text-primary font-medium">{exp.company}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {(exp.start_date || exp.end_date) && (
                        <span>{exp.start_date} {exp.start_date && exp.end_date && "- "} {exp.end_date}</span>
                      )}
                      {(exp.start_date || exp.end_date) && exp.location && <span>•</span>}
                      {exp.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {exp.location}
                        </span>
                      )}
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-foreground/80 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1 [&_ul_ul]:list-circle [&_ul_ul]:ml-6 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(exp.description) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "education":
      if (!parsedData.education?.length) return null;
      return (
        <Card key="education" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Education</h2>
            </div>
            <div className="space-y-6">
              {parsedData.education.map((edu, index) => (
                <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:w-0.5 before:h-full before:bg-gradient-to-b before:from-primary before:to-transparent">
                  <div className="absolute left-0 top-1 w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-foreground">{edu.institution}</h3>
                    <p className="text-primary font-medium">
                      {edu.degree}{edu.field && ` in ${edu.field}`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {(edu.start_date || edu.end_date) && (
                        <span>{edu.start_date} {edu.start_date && edu.end_date && "- "} {edu.end_date}</span>
                      )}
                      {(edu.start_date || edu.end_date) && edu.gpa && <span>•</span>}
                      {edu.gpa && <span className="font-medium">GPA: {edu.gpa}</span>}
                      {((edu.start_date || edu.end_date || edu.gpa) && edu.location) && <span>•</span>}
                      {edu.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {edu.location}
                        </span>
                      )}
                    </div>
                    {edu.honors && edu.honors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {edu.honors.map((honor, honorIndex) => (
                          <span key={honorIndex} className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-success/10 to-success/5 text-success rounded-full text-xs font-medium border border-success/20">
                            <Trophy className="h-3 w-3" />
                            {honor}
                          </span>
                        ))}
                      </div>
                    )}
                    {edu.thesis && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-start gap-2">
                          <BookMarked className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Thesis</div>
                            <div className="text-sm text-foreground">{edu.thesis}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {edu.achievements && edu.achievements.length > 0 && (
                      <div className="mt-3">
                        <ul className="space-y-1 text-sm text-foreground/80">
                          {edu.achievements.map((achievement, achievementIndex) => (
                            <li key={achievementIndex} className="pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "skills":
      if (!parsedData.skills?.length) return null;
      return (
        <Card key="skills" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {parsedData.skills.map((skill, index) => (
                <span key={index} className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors">
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "publications":
      if (!parsedData.publications?.length) return null;
      return (
        <Card key="publications" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookMarked className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Publications</h2>
            </div>
            <div className="grid gap-4">
              {parsedData.publications.map((pub, index) => {
                const pubData = typeof pub === "string" ? { title: pub } : pub;
                return (
                  <div key={index} className="group relative p-5 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-primary/20 transition-all duration-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{pubData.title}</h3>
                        {typeof pub !== "string" && (pub.publisher || pub.date) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {pub.publisher && <span>{pub.publisher}</span>}
                            {pub.publisher && pub.date && <span>•</span>}
                            {pub.date && <span>{pub.date}</span>}
                          </div>
                        )}
                      </div>
                      {typeof pub !== "string" && pub.url && (
                        <a href={pub.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-2 rounded-lg hover:bg-primary/10 transition-colors group/link" aria-label={`View ${pubData.title}`}>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/link:text-primary transition-colors" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );

    case "certifications":
      if (!parsedData.certifications?.length) return null;
      return (
        <Card key="certifications" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Certifications</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {parsedData.certifications.map((cert, index) => (
                <span key={index} className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors">
                  {typeof cert === "string" ? cert : (
                    <span>
                      <span className="font-medium">{cert.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({cert.issuer}, {cert.date})</span>
                    </span>
                  )}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "awards":
      if (!parsedData.awards?.length) return null;
      return (
        <Card key="awards" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Awards & Honors</h2>
            </div>
            <ul className="space-y-3">
              {parsedData.awards.map((award, index) => (
                <li key={index} className="text-foreground/80 leading-relaxed pl-6 relative before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-primary before:rounded-full">
                  {typeof award === "string" ? award : (
                    <div>
                      <div className="font-medium">{award.title}</div>
                      <div className="text-sm text-muted-foreground">{award.issuer} • {award.date}</div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );

    case "projects":
      if (!parsedData.projects?.length) return null;
      return (
        <Card key="projects" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Projects</h2>
            </div>
            <div className="space-y-6">
              {parsedData.projects.map((project, index) => (
                <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:w-0.5 before:h-full before:bg-gradient-to-b before:from-primary before:to-transparent">
                  <div className="absolute left-0 top-1 w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                  <h3 className="text-lg font-semibold mb-2">
                    {project.name}
                    {project.url && (
                      <a href={project.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-sm text-primary hover:underline">(View)</a>
                    )}
                  </h3>
                  <p className="text-foreground/80 leading-relaxed">{project.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "languages":
      if (!parsedData.languages?.length) return null;
      return (
        <Card key="languages" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Languages</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {parsedData.languages.map((lang, index) => (
                <span key={index} className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors">
                  {typeof lang === "string" ? lang : (
                    <span>
                      <span className="font-medium">{lang.language}</span>
                      <span className="text-xs text-muted-foreground ml-2">({lang.proficiency})</span>
                    </span>
                  )}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "volunteer_work":
      if (!parsedData.volunteer_work?.length) return null;
      return (
        <Card key="volunteer_work" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Volunteer Work</h2>
            </div>
            <div className="space-y-6">
              {parsedData.volunteer_work.map((work, index) => (
                <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:w-0.5 before:h-full before:bg-gradient-to-b before:from-primary before:to-transparent">
                  <div className="absolute left-0 top-1 w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                  <h3 className="text-lg font-semibold">{work.role}</h3>
                  <p className="text-primary font-medium">{work.organization}</p>
                  <p className="text-foreground/80 leading-relaxed mt-2">{work.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "interests":
      if (!parsedData.interests?.length && !parsedData.additional_skills?.length) return null;
      return (
        <Card key="interests" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="space-y-8">
              {parsedData.interests && parsedData.interests.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold">Interests</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {parsedData.interests.map((interest, index) => (
                      <span key={index} className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {parsedData.additional_skills && parsedData.additional_skills.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold">Additional Skills</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {parsedData.additional_skills.map((skill, index) => (
                      <span key={index} className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
};

export const ProfileSections = ({ parsedData }: ProfileSectionsProps) => {
  const getCurrentSectionOrder = () => {
    const order: string[] = [];
    if (parsedData.summary) order.push("summary");
    if (parsedData.experience?.length) order.push("experience");
    if (parsedData.education?.length) order.push("education");
    if (parsedData.skills?.length) order.push("skills");
    if (parsedData.publications?.length) order.push("publications");
    if (parsedData.certifications?.length) order.push("certifications");
    if (parsedData.awards?.length) order.push("awards");
    if (parsedData.projects?.length) order.push("projects");
    if (parsedData.languages?.length) order.push("languages");
    if (parsedData.volunteer_work?.length) order.push("volunteer_work");
    if (parsedData.interests?.length || parsedData.additional_skills?.length) order.push("interests");
    return order;
  };

  const sectionOrder = parsedData._sectionOrder || getCurrentSectionOrder();

  return <>{sectionOrder.map((sectionKey) => renderSection(parsedData, sectionKey))}</>;
};
