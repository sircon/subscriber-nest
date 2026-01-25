import type { NextRequest } from 'next/server';
import satori from 'satori';
import React from 'react';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export const runtime = 'nodejs';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const DEFAULT_TITLE = 'Keep your audience safe and backed up';

const fontCandidates = {
  body: [
    path.join(
      process.cwd(),
      'node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff',
    ),
    path.join(
      process.cwd(),
      '..',
      '..',
      'node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff',
    ),
  ],
  bodyMedium: [
    path.join(
      process.cwd(),
      'node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff',
    ),
    path.join(
      process.cwd(),
      '..',
      '..',
      'node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff',
    ),
  ],
  display: [
    path.join(
      process.cwd(),
      'node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff',
    ),
    path.join(
      process.cwd(),
      '..',
      '..',
      'node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff',
    ),
  ],
};

const iconCandidates = [
  path.join(
    process.cwd(),
    'public/web-app-manifest-192x192.png',
  ),
  path.join(
    process.cwd(),
    'apps/frontend/public/web-app-manifest-192x192.png',
  ),
  path.join(
    process.cwd(),
    '..',
    '..',
    'apps/frontend/public/web-app-manifest-192x192.png',
  ),
];

let fontCache: {
  body: Buffer;
  bodyMedium: Buffer;
  display: Buffer;
} | null = null;

let iconCache: string | null = null;

async function loadFonts() {
  if (fontCache) {
    return fontCache;
  }

  const body = await readFromCandidates(fontCandidates.body);
  const bodyMedium = await readFromCandidates(fontCandidates.bodyMedium);
  const display = await readFromCandidates(fontCandidates.display);

  fontCache = {
    body,
    bodyMedium,
    display,
  };

  return fontCache;
}

async function loadIcon() {
  if (iconCache) {
    return iconCache;
  }

  const iconBuffer = await readFromCandidates(iconCandidates);
  iconCache = `data:image/png;base64,${iconBuffer.toString('base64')}`;
  return iconCache;
}

async function readFromCandidates(paths: string[]) {
  let lastError: unknown = null;

  for (const candidate of paths) {
    try {
      return await readFile(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function buildOgMarkup(title: string, subtitle: string, iconData: string) {
  const isDefaultTitle = title === DEFAULT_TITLE;

  return React.createElement(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        background:
          'linear-gradient(135deg, #0a0a0a 0%, #141414 55%, #0b0b0b 100%)',
        color: '#f5f0e6',
        fontFamily: 'DM Sans',
        position: 'relative',
        overflow: 'hidden',
      },
    },
    React.createElement('div', {
      style: {
        position: 'absolute',
        inset: 0,
        opacity: 0.25,
        backgroundImage:
          'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      },
    }),
    React.createElement('div', {
      style: {
        position: 'absolute',
        inset: 0,
        border: '1px solid rgba(245, 158, 11, 0.15)',
        borderRadius: '32px',
        opacity: 0.6,
      },
    }),
    React.createElement('div', {
      style: {
        position: 'absolute',
        top: '-140px',
        right: '-120px',
        width: '420px',
        height: '420px',
        borderRadius: '999px',
        background: 'rgba(245, 158, 11, 0.18)',
        filter: 'blur(2px)',
      },
    }),
    React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: '-180px',
        left: '-120px',
        width: '420px',
        height: '420px',
        borderRadius: '999px',
        background: 'rgba(120, 113, 108, 0.22)',
        filter: 'blur(2px)',
      },
    }),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          React.createElement('img', {
            src: iconData,
            width: '28px',
            height: '28px',
          }),
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textTransform: 'uppercase',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: '18px',
                letterSpacing: '0.35em',
                color: '#f59e0b',
                fontFamily: 'DM Sans',
                fontWeight: 500,
              },
            },
            'Audience',
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: '18px',
                letterSpacing: '0.35em',
                color: '#f5f0e6',
                fontFamily: 'DM Sans',
                fontWeight: 500,
              },
            },
            'Safe',
          ),
        ),
      ),
      React.createElement(
        'div',
        {
          style: {
            padding: '10px 18px',
            borderRadius: '999px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '16px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#f59e0b',
            fontFamily: 'DM Sans',
            fontWeight: 500,
          },
        },
        'Protect your most valuable asset',
      ),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        },
      },
      isDefaultTitle
        ? React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: '74px',
                fontWeight: 600,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                maxWidth: '960px',
                color: '#f8f3ea',
                fontFamily: 'Fraunces',
              },
            },
            'Keep your audience',
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: '74px',
                fontWeight: 600,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                maxWidth: '960px',
                fontFamily: 'Fraunces',
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
                flexWrap: 'wrap',
              },
            },
            React.createElement(
              'span',
              {
                style: {
                  color: '#f59e0b',
                  fontStyle: 'italic',
                },
              },
              'safe',
            ),
            ' and backed up',
          ),
        )
        : React.createElement(
          'div',
          {
            style: {
              fontSize: '72px',
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              maxWidth: '960px',
              color: '#f8f3ea',
              fontFamily: 'Fraunces',
            },
          },
          title,
        ),
      React.createElement(
        'div',
        {
          style: {
            fontSize: '28px',
            fontWeight: 400,
            lineHeight: 1.4,
            color: 'rgba(245, 240, 230, 0.72)',
            maxWidth: '820px',
            fontFamily: 'DM Sans',
          },
        },
        subtitle,
      ),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          fontSize: '20px',
          color: '#e2d6c8',
        },
      },
      ['Synced every day', 'Export anytime', 'Secure & encrypted'].map(
        (text) =>
          React.createElement(
            'div',
            {
              key: text,
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '16px',
                color: 'rgba(245, 240, 230, 0.8)',
              },
            },
            React.createElement('div', {
              style: {
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.8)',
              },
            }),
            text,
          ),
      ),
    ),
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || DEFAULT_TITLE;
  const subtitle =
    searchParams.get('subtitle') ||
    'Your subscribers are priceless. Sync daily and export anytime.';

  const [fonts, iconData] = await Promise.all([loadFonts(), loadIcon()]);

  const svg = await satori(buildOgMarkup(title, subtitle, iconData), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      {
        name: 'DM Sans',
        data: fonts.body,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'DM Sans',
        data: fonts.bodyMedium,
        weight: 500,
        style: 'normal',
      },
      {
        name: 'Fraunces',
        data: fonts.display,
        weight: 600,
        style: 'normal',
      },
    ],
  });

  const pngData = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(pngData, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
