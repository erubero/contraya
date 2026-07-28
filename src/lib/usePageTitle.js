import { useEffect } from 'react';

const DEFAULT_TITLE = 'Contraya | Contract Reader & Reminder App';
const DEFAULT_DESCRIPTION =
  'Contraya reads your contracts, explains them in plain English, and reminds you before every deadline: renewal notices, payments, notice windows, and end dates.';
const SITE_ORIGIN = 'https://usecontraya.com';

function upsertMeta(name, content) {
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!content) {
    if (name === 'robots' && tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href) {
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

// Keeps title, meta description, canonical, and robots in sync with the
// current page. Search engines render this SPA, so per-route tags set here
// are what they index.
export function usePageMeta({ title, description, canonicalPath, noindex = false } = {}) {
  useEffect(() => {
    document.title = title ? `${title} | Contraya` : DEFAULT_TITLE;
    upsertMeta('description', description || DEFAULT_DESCRIPTION);
    upsertCanonical(`${SITE_ORIGIN}${canonicalPath || '/'}`);
    upsertMeta('robots', noindex ? 'noindex' : null);

    return () => {
      document.title = DEFAULT_TITLE;
      upsertMeta('description', DEFAULT_DESCRIPTION);
      upsertCanonical(`${SITE_ORIGIN}/`);
      upsertMeta('robots', null);
    };
  }, [title, description, canonicalPath, noindex]);
}

// Back-compat for app screens that only need a tab title.
export function usePageTitle(title) {
  usePageMeta({ title });
}
