import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

export const SEO = ({ 
  title, 
  description, 
  keywords,
  ogImage = "https://qrafts.app/hero-professional.jpg",
  ogType = "website",
  canonicalUrl,
  noindex = false,
  publishedTime,
  modifiedTime,
  author = "QRAFTS",
  section,
  tags = []
}: SEOProps) => {
  const fullTitle = title.includes('QRAFTS') ? title : `${title} | QRAFTS`;
  const siteUrl = window.location.origin;
  const currentUrl = canonicalUrl || window.location.href;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="QRAFTS" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@QRAFTS" />
      <meta name="twitter:creator" content="@QRAFTS" />

      {/* Additional Meta Tags */}
      <meta name="author" content={author} />
      <meta property="og:locale" content="en_US" />
      <meta name="application-name" content="QRAFTS" />
      <meta name="apple-mobile-web-app-title" content="QRAFTS" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Article Specific Meta Tags */}
      {ogType === 'article' && publishedTime && (
        <>
          <meta property="article:published_time" content={publishedTime} />
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {section && <meta property="article:section" content={section} />}
          {author && <meta property="article:author" content={author} />}
          {tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Performance & Optimization */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
    </Helmet>
  );
};
