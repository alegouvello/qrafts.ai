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

interface FAQSchemaProps {
  type: 'faq';
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

interface SoftwareAppSchemaProps {
  type: 'softwareApplication';
  name: string;
  description: string;
  applicationCategory: string;
  offers?: {
    price: string;
    priceCurrency: string;
  };
}

interface BreadcrumbSchemaProps {
  type: 'breadcrumb';
  items: Array<{
    name: string;
    url: string;
  }>;
}

type StructuredDataProps = OrganizationSchemaProps | ArticleSchemaProps | WebsiteSchemaProps | FAQSchemaProps | SoftwareAppSchemaProps | BreadcrumbSchemaProps;

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

    if (props.type === 'faq') {
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": props.questions.map(q => ({
          "@type": "Question",
          "name": q.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": q.answer
          }
        }))
      };
    }

    if (props.type === 'softwareApplication') {
      return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": props.name,
        "description": props.description,
        "applicationCategory": props.applicationCategory,
        "operatingSystem": "Web Browser",
        "offers": props.offers ? {
          "@type": "Offer",
          "price": props.offers.price,
          "priceCurrency": props.offers.priceCurrency
        } : undefined,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "127"
        }
      };
    }

    if (props.type === 'breadcrumb') {
      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": props.items.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url
        }))
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
