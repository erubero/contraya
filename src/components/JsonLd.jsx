import { useEffect } from 'react';

// Injects a schema.org data block for the current page. JSON-LD script tags
// are inert data (never executed), so this is CSP-safe.
export default function JsonLd({ data }) {
  useEffect(() => {
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.text = JSON.stringify(data);
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [data]);

  return null;
}
