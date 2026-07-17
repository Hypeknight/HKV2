import type { Metadata } from 'next';

const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'https://hypeknight.fun';

const DEFAULT_SHARE_IMAGE = '/images/hypeknight-share.jpg';

export function getSiteUrl() {
  try {
    return new URL(DEFAULT_SITE_URL);
  } catch {
    return new URL('https://hypeknight.fun');
  }
}

export function absoluteUrl(
  value?: string | null
) {
  const siteUrl = getSiteUrl();

  if (!value) {
    return new URL(
      DEFAULT_SHARE_IMAGE,
      siteUrl
    ).toString();
  }

  try {
    return new URL(value).toString();
  } catch {
    return new URL(value, siteUrl).toString();
  }
}

export function cleanMetadataText(
  value?: string | null,
  fallback = ''
) {
  const cleaned = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || fallback;
}

export function truncateMetadataText(
  value: string,
  maximum = 180
) {
  if (value.length <= maximum) {
    return value;
  }

  return `${value.slice(0, maximum - 1).trim()}…`;
}

type ShareMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string | null;
  type?: 'website' | 'article';
};

export function buildShareMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  type = 'website',
}: ShareMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(
    path,
    siteUrl
  ).toString();

  const imageUrl = absoluteUrl(image);
  const safeTitle = cleanMetadataText(
    title,
    'HypeKnight'
  );

  const safeDescription =
    truncateMetadataText(
      cleanMetadataText(
        description,
        'Discover events, nightlife, venues, and live experiences on HypeKnight.'
      )
    );

  return {
    metadataBase: siteUrl,

    title: safeTitle,
    description: safeDescription,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      type,
      url: canonicalUrl,
      siteName: 'HypeKnight',
      title: safeTitle,
      description: safeDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt:
            cleanMetadataText(
              imageAlt,
              safeTitle
            ),
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title: safeTitle,
      description: safeDescription,
      images: [imageUrl],
    },

    other: {
      'og:image:secure_url': imageUrl,
    },
  };
}