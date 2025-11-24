export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
  image?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "5-tips-to-organize-job-applications",
    title: "5 Essential Tips to Organize Your Job Applications",
    excerpt: "Stop losing track of opportunities. Learn how to organize your job search like a pro and never miss a follow-up again.",
    author: "Qrafts Team",
    date: "2024-11-20",
    category: "Job Search Tips",
    readTime: "5 min read",
    content: `
# 5 Essential Tips to Organize Your Job Applications

Job hunting can be overwhelming, especially when you're juggling multiple applications at once. Here are five proven strategies to keep your job search organized and effective.

## 1. Track Everything in One Place

The biggest mistake job seekers make is spreading their application data across sticky notes, emails, and memory. Use a dedicated tool (like Qrafts!) to centralize all your application information:

- Company names and positions
- Application dates
- Contact information
- Interview schedules
- Follow-up reminders

## 2. Set Up a Consistent Follow-Up System

Don't let opportunities slip away due to poor follow-up. Create a schedule:

- **24-48 hours** after applying: Send a polite inquiry
- **1 week** after interview: Send thank-you note
- **2 weeks** after interview: Follow up on decision timeline

## 3. Customize Your Application Materials

Generic resumes and cover letters rarely get noticed. For each application:

- Tailor your resume to match job requirements
- Highlight relevant skills from the job description
- Use keywords from the posting
- Research the company culture

## 4. Keep Detailed Notes

After every interaction, document:

- Interviewer names and roles
- Questions they asked
- Company culture observations
- Your impressions
- Action items

These notes become invaluable for follow-ups and final decision-making.

## 5. Analyze Your Progress

Review your applications weekly:

- Which companies responded?
- What's your response rate?
- Which strategies work best?
- Where should you adjust?

## Ready to Get Organized?

Qrafts makes all of this easy with AI-powered insights, automated reminders, and intelligent tracking. Start organizing your job search today!
    `
  },
  {
    slug: "ai-powered-interview-preparation",
    title: "How AI is Revolutionizing Interview Preparation",
    excerpt: "Discover how artificial intelligence can help you prepare better, answer smarter, and land your dream job faster.",
    author: "Qrafts Team",
    date: "2024-11-18",
    category: "AI & Technology",
    readTime: "7 min read",
    content: `
# How AI is Revolutionizing Interview Preparation

The job interview landscape has changed dramatically. Today's candidates are leveraging AI technology to prepare more effectively than ever before. Here's how you can too.

## Understanding AI-Powered Interview Prep

AI tools can now:

- Analyze job descriptions to predict interview questions
- Provide real-time feedback on your answers
- Suggest improvements based on successful patterns
- Help you research companies and interviewers

## The Qrafts Advantage

Our AI assistant goes beyond basic preparation:

### 1. **Personalized Question Generation**

Based on the job description and company, our AI predicts likely interview questions specific to your role.

### 2. **Answer Optimization**

Get instant feedback on your responses:
- Are they too long or too short?
- Do they address the question fully?
- Could you add more specific examples?

### 3. **Company Research Insights**

Our AI analyzes:
- Recent company news
- Culture indicators
- Interview patterns from similar roles

## Best Practices for AI-Assisted Prep

1. **Start Early**: Begin using AI tools at least one week before your interview
2. **Practice Out Loud**: Don't just read AI suggestions—practice speaking them
3. **Personalize Everything**: Use AI as a starting point, not the final answer
4. **Stay Authentic**: AI should enhance your voice, not replace it

## Common Interview Questions AI Can Help With

- "Tell me about yourself"
- "Why do you want to work here?"
- "What's your greatest weakness?"
- Behavioral questions (STAR method)
- Technical questions specific to your field

## The Future of Interview Prep

AI technology will continue to evolve, offering:
- Virtual reality practice sessions
- Real-time interview coaching
- Deeper company culture analysis
- Predictive success scoring

## Get Started Today

Don't let your competition get ahead. Start using AI-powered interview preparation with Qrafts and increase your chances of landing that dream job.
    `
  },
  {
    slug: "common-job-search-mistakes",
    title: "10 Common Job Search Mistakes and How to Avoid Them",
    excerpt: "Learn from the most common job search mistakes that prevent talented professionals from landing their ideal positions.",
    author: "Qrafts Team",
    date: "2024-11-15",
    category: "Job Search Tips",
    readTime: "6 min read",
    content: `
# 10 Common Job Search Mistakes and How to Avoid Them

Even experienced professionals make critical mistakes during their job search. Here are the top ten pitfalls to avoid.

## 1. Applying to Everything

**The Mistake**: Sending generic applications to hundreds of jobs.

**The Fix**: Focus on quality over quantity. Target 5-10 carefully selected positions per week with customized applications.

## 2. Ignoring Your Network

**The Mistake**: Relying solely on online applications.

**The Fix**: 70% of jobs are filled through networking. Reach out to connections, attend industry events, and leverage LinkedIn.

## 3. Poor Follow-Up

**The Mistake**: Applying and waiting passively.

**The Fix**: Follow up strategically:
- Send thank-you emails within 24 hours
- Check in after one week
- Stay professional and persistent

## 4. Neglecting Your Online Presence

**The Mistake**: Outdated LinkedIn profile or unprofessional social media.

**The Fix**: 
- Update all professional profiles
- Remove questionable content
- Share industry insights regularly

## 5. Weak Resume and Cover Letter

**The Mistake**: Using the same documents for every application.

**The Fix**: Customize each application to match the job description and company culture.

## 6. Not Preparing for Interviews

**The Mistake**: Showing up without research or practice.

**The Fix**: 
- Research the company thoroughly
- Practice common questions
- Prepare thoughtful questions to ask
- Use tools like Qrafts for AI-powered prep

## 7. Talking Too Much (or Too Little)

**The Mistake**: Rambling answers or one-word responses.

**The Fix**: Use the STAR method (Situation, Task, Action, Result) to structure concise, complete answers.

## 8. Not Researching Salary Ranges

**The Mistake**: Accepting the first offer or asking for unrealistic compensation.

**The Fix**: Research salary ranges on Glassdoor, Levels.fyi, and industry reports before negotiations.

## 9. Losing Track of Applications

**The Mistake**: Forgetting which companies you applied to or interview schedules.

**The Fix**: Use an organized tracking system (hello, Qrafts!) to manage all applications, interviews, and follow-ups.

## 10. Giving Up Too Soon

**The Mistake**: Getting discouraged after a few rejections.

**The Fix**: Job hunting is a numbers game. Stay consistent, learn from rejections, and keep improving your approach.

## Your Path Forward

Avoiding these mistakes puts you ahead of most job seekers. Combine smart strategies with the right tools, and you'll land your ideal role faster than you think.

Ready to optimize your job search? Try Qrafts today and eliminate these common pitfalls automatically.
    `
  }
];

export const getBlogPost = (slug: string): BlogPost | undefined => {
  return blogPosts.find(post => post.slug === slug);
};

export const getRecentPosts = (limit: number = 3): BlogPost[] => {
  return blogPosts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};
