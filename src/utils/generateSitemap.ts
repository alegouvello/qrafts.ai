import { blogPosts } from "@/data/blogPosts";

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  image?: {
    loc: string;
    title: string;
  };
}

const baseUrl = "https://qrafts.app";

const staticPages: SitemapUrl[] = [
  {
    loc: `${baseUrl}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: 1.0,
    image: {
      loc: `${baseUrl}/hero-professional.jpg`,
      title: "QRAFTS - Smart Job Application Tracking Platform"
    }
  },
  {
    loc: `${baseUrl}/auth`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: `${baseUrl}/blog`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.9
  },
  {
    loc: `${baseUrl}/feedback`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    loc: `${baseUrl}/privacy`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.4
  },
  {
    loc: `${baseUrl}/terms`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.4
  }
];

export const generateSitemapXml = (): string => {
  const blogUrls: SitemapUrl[] = blogPosts.map(post => ({
    loc: `${baseUrl}/blog/${post.slug}`,
    lastmod: post.date,
    changefreq: 'monthly' as const,
    priority: 0.8,
    image: post.image ? {
      loc: post.image.startsWith('http') ? post.image : `${baseUrl}/${post.image.replace(/^\//, '')}`,
      title: post.title
    } : undefined
  }));

  const allUrls = [...staticPages, ...blogUrls];

  const urlsXml = allUrls.map(url => {
    const imageXml = url.image 
      ? `
    <image:image>
      <image:loc>${url.image.loc}</image:loc>
      <image:title>${escapeXml(url.image.title)}</image:title>
    </image:image>`
      : '';

    return `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>${imageXml}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlsXml}
</urlset>`;
};

const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const downloadSitemap = () => {
  const xml = generateSitemapXml();
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sitemap.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
