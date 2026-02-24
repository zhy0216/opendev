# SEO Strategy

Use this skill when implementing SEO for this project.

## Technical SEO

### Robots.txt

**Public pages** - Allow indexing:
```
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml
```

**App (authenticated routes)** - Block from indexing:
```
User-agent: *
Disallow: /app/
Disallow: /dashboard/
```

### Meta Tags

Essential tags for every page:
- Title: 50-60 characters, primary keyword near beginning
- Description: 150-160 characters with CTA
- Open Graph: `og:title`, `og:description`, `og:image`
- Twitter Card: `twitter:card`, `twitter:title`, `twitter:description`
- Canonical URL

### Structured Data (JSON-LD)

**Organization**:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "YourApp",
  "url": "https://yourdomain.com"
}
```

**SoftwareApplication**:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "YourApp",
  "applicationCategory": "BusinessApplication"
}
```

### Core Web Vitals Targets

- **LCP**: < 2.5 seconds
- **FID**: < 100 milliseconds
- **CLS**: < 0.1

## On-Page SEO

### Title Tags

```
Feature Name - Brief Description | YourApp
Another Feature - What It Does | YourApp
```

### Meta Descriptions

```
Describe your app's value proposition in 150-160 characters. Include primary keyword and call-to-action.
```

### Heading Structure

- Single H1 per page with primary keyword
- H2 for main sections
- H3-H6 for subsections
- Logical hierarchy

### Image Optimization

- Descriptive file names: `visual-email-editor-interface.png`
- Alt text for all images
- WebP format
- Lazy loading for below-fold
- Specify width/height

## Keyword Strategy

### Primary Keywords
- Identify 5-6 main keywords for your product
- Focus on high-intent search terms

### Secondary Keywords
- Related terms and variations
- Feature-specific keywords

### Long-tail Keywords
- Question-based queries
- Specific use-case searches

## Content Strategy

### Blog Topics
- Best practices in your domain
- Tutorials and how-tos
- Industry trends
- Case studies
- Comparison guides

### Landing Pages
Create dedicated pages for:
- Each major feature
- Use cases by industry
- Pricing and comparisons

## React/Vite Implementation

### File Structure

```
apps/web/
├── src/
│   ├── components/
│   │   └── seo.tsx            # SEO component
│   └── routes/
│       └── index.tsx          # Homepage
└── public/
    ├── favicon.ico
    ├── apple-touch-icon.png
    └── og-image.png
```

### SEO Component with react-helmet-async

```typescript
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
}

export function SEO({ title, description, image = '/og-image.png' }: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
```

### Static sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com/</loc>
    <lastmod>2024-01-01</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>
```

### Static robots.txt

```
User-agent: *
Allow: /
Disallow: /app/
Sitemap: https://yourdomain.com/sitemap.xml
```

## Implementation Checklist

### Week 1
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] Meta tags (title, description, OG, Twitter)
- [ ] Structured data (JSON-LD)
- [ ] Canonical URLs
- [ ] Image alt text

### Month 1
- [ ] Google Search Console setup
- [ ] Google Analytics 4
- [ ] Initial blog content (5-10 posts)
- [ ] Landing pages for key features
- [ ] Internal linking strategy

### Quarter 1
- [ ] Comprehensive documentation
- [ ] Comparison pages
- [ ] Link building outreach
- [ ] Core Web Vitals optimization
- [ ] Keyword expansion

## Monitoring

### Tools
- Google Search Console
- Google Analytics 4
- Ahrefs or SEMrush (keyword tracking)

### Metrics to Track
- Organic traffic growth
- Keyword rankings
- Click-through rates
- Bounce rate
- Core Web Vitals scores
- Conversion rate from organic
