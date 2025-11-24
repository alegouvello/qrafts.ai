import { Helmet } from 'react-helmet-async';

interface OrganizationSchemaProps {
  type: 'organization';
}

interface ArticleSchemaProps {
  type: 'article';
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url: string;
}

interface WebsiteSchemaProps {
  type: 'website';
  name: string;
  description: string;
  url: string;
}

type StructuredDataProps = OrganizationSchemaProps | ArticleSchemaProps | WebsiteSchemaProps;

export const StructuredData = (props: StructuredDataProps) => {
  const getSchema = () => {
    if (props.type === 'organization') {
      return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "QRAFTS",
        "url": "https://qrafts.app",
        "logo": "https://qrafts.app/qraft-logo.png",
        "description": "Smart job application tracking and AI-powered interview preparation platform",
        "sameAs": [
          "https://www.linkedin.com/company/qrafts",
          "https://twitter.com/qrafts"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "Customer Support",
          "email": "support@qrafts.app"
        }
      };
    }

    if (props.type === 'article') {
      return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": props.title,
        "description": props.description,
        "image": props.image || "https://qrafts.app/qraft-logo.png",
        "author": {
          "@type": "Organization",
          "name": props.author
        },
        "publisher": {
          "@type": "Organization",
          "name": "QRAFTS",
          "logo": {
            "@type": "ImageObject",
            "url": "https://qrafts.app/qraft-logo.png"
          }
        },
        "datePublished": props.datePublished,
        "dateModified": props.dateModified || props.datePublished,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": props.url
        }
      };
    }

    if (props.type === 'website') {
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": props.name,
        "description": props.description,
        "url": props.url,
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${props.url}/blog?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      };
    }

    return {};
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(getSchema())}
      </script>
    </Helmet>
  );
};
