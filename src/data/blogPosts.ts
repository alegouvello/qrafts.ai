import blogJobBoardsHero from "@/assets/blog-job-boards-hero.jpg";
import { z } from "zod";

export const blogPostSchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  excerpt: z.string().min(1, "Excerpt is required").max(300, "Excerpt must be less than 300 characters"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  category: z.string().min(1, "Category is required"),
  readTime: z.string().regex(/^\d+\s+min\s+read$/, "Read time must be in format '8 min read'"),
  image: z.string().optional(),
});

export type BlogPost = z.infer<typeof blogPostSchema>;

const rawBlogPosts: BlogPost[] = [
  {
    slug: "why-job-boards-arent-enough",
    title: "Why Job Boards Aren't Enough: The Case for a Personal Application Tracker",
    excerpt: "Job boards have made job postings ubiquitous, but success rates remain dismally low. Learn why a personal application tracker is essential for modern job seekers.",
    author: "Qrafts Team",
    date: "2025-11-24",
    category: "Job Search Strategy",
    readTime: "8 min read",
    image: blogJobBoardsHero,
    content: `
# Why Job Boards Aren't Enough: The Case for a Personal Application Tracker

## Introduction

Job boards such as LinkedIn, Glassdoor and Indeed have made job postings ubiquitous. They've also turned job search into a numbers game: the average job seeker must submit between 32 and 200 applications to land one offer. Yet despite this flurry of activity, success rates remain dismally low — cold applications yield a 0.1–2% chance of getting hired. The result? Burnout, frustration and missed opportunities. This article explains why job boards alone aren't enough and argues for a personal application tracker like Qrafts.

## The rise of job boards

Over the past two decades, online job boards have become the dominant recruitment method. In Canada, the share of job vacancies advertised via online boards rose from 67% in 2015 to 79% in 2024. This shift has lowered hiring costs and increased the number of openings employers post. It has also flooded the market: each corporate job attracts roughly 250 applicants, yet only 2% (≈5 people) receive interviews.

## Job boards' limitations

Job boards broadcast openings to large audiences, but once an application is submitted the platform's job is done. The ClearCompany report contrasts this with an applicant‑tracking system (ATS): job boards are great for attracting applicants, "but once the resumes start rolling in, you're on your own". An ATS, however, centralises all candidate data, regardless of where it originated, and automates tasks like posting across multiple boards and sending reminders. It also provides analytics on metrics such as time‑to‑fill and candidate drop‑off rates, supports collaboration and ensures consistent, fair processes.

Individuals typically don't have access to ATS technology — they manage their search with spreadsheets, sticky notes and memory. When applying to dozens of roles, this quickly becomes unmanageable. Deadlines are missed, answers are repeated or lost, and there's no way to learn from past attempts.

## The job‑search funnel

To understand why organisation matters, consider the job search funnel. For a typical online job posting, 1,000 people view it, 100 complete the application, 25 make it past automated screening, 4–6 get interviewed, and one gets hired. This means that if you apply without tailoring your answers or tracking your progress, you're effectively a statistic. It also explains why job seekers often need to apply to 100+ jobs to land one offer.

## Networking and referrals

One of the starkest insights from recent research is the importance of networking: only 0.1–2% of cold applications result in offers, yet referred candidates are 5× more likely to be hired. Furthermore, 85% of jobs are filled through connections and 44% of hires come from candidates already in company databases. In other words, building relationships and staying memorable matters more than blasting out résumés.

## Why a personal application tracker?

A personal application tracker bridges the gap between job boards and the network‑driven hiring landscape. It gives individuals similar capabilities to an ATS:

1. **Centralised tracking**: Instead of juggling spreadsheets or old emails, you can capture every application, job description, question and response in one organised dashboard.

2. **Answer repository**: Rewriting cover letters and essay‑style responses wastes time; a tracker stores your past answers and tags them by skill or competency, so you can reuse and customise them efficiently.

3. **Data‑driven insights**: By analysing past applications, you can see which industries or job titles yield interview invitations and where to pivot. You can also track deadlines and follow‑up reminders.

4. **Long‑term value**: A tracker acts as your personal database. Even if a role doesn't work out, you have a record of contacts, interview questions and feedback that you can refer to later.

## Enter Qrafts

Qrafts takes the personal application tracker concept further. Inspired by ATS technology, it centralises job applications, stores each question from every application and the answers you provide, and uses AI to suggest improvements. When you paste a job‑application URL, Qrafts extracts all the questions, lets you answer them once and refines them over time. It also keeps a record of interview questions, so you can prepare for recurring themes.

## Complementary to job boards

It's important to note that Qrafts is not a replacement for platforms like LinkedIn, Glassdoor or Indeed. Those sites remain essential for discovering opportunities. Qrafts complements them by organising everything you do there, ensuring that your hard work doesn't get lost. Think of LinkedIn as your broadcast channel and Qrafts as your control room.

## Leveraging the network effect

Qrafts also recognises the power of networking. It includes features for tracking referrals and prompting you to cultivate relationships with people who might be able to open doors. Because employees who share job posts help their employer reach broader networks, Qrafts makes it easy to share opportunities and track referral outcomes, turning your network into an asset rather than an afterthought.

## Conclusion

Job boards have democratised access to vacancies, but they haven't solved the job seeker's pain points: high application volumes, low response rates and the inability to track progress. A personal application tracker like Qrafts fills this gap by bringing ATS‑style organisation, data and efficiency to individuals. If you're tired of feeling like applicant number 247, it's time to take control of your search.
    `
  }
];

// Validate all blog posts on initialization
export const blogPosts: BlogPost[] = rawBlogPosts.map(post => {
  const result = blogPostSchema.safeParse(post);
  if (!result.success) {
    console.error(`Blog post validation failed for "${post.slug}":`, result.error.format());
    throw new Error(`Invalid blog post: ${post.slug}`);
  }
  return result.data;
});

export const getBlogPost = (slug: string): BlogPost | undefined => {
  return blogPosts.find(post => post.slug === slug);
};

export const getRecentPosts = (limit: number = 3): BlogPost[] => {
  return blogPosts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};
