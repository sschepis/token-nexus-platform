import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script' // Import Next.js Script component

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon and other static assets should be in the public folder */}
        {/* e.g., <link rel="icon" href="/favicon.ico" /> */}
        
        <meta name="description" content="Lovable Generated Project" />
        <meta name="author" content="Lovable" />

        <meta property="og:title" content="token-nexus-platform" />
        <meta property="og:description" content="Lovable Generated Project" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@lovable_dev" />
        <meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

        {/* Any other global links, fonts, etc. can go here */}
      </Head>
      <body>
        <Main />
        <NextScript />
        
        {/* IMPORTANT: DO NOT REMOVE THIS SCRIPT TAG OR THIS VERY COMMENT! */}
        {/* Using Next.js Script component for optimized loading. Strategy can be adjusted. */}
        <Script
          src="https://cdn.gpteng.co/gptengineer.js"
          strategy="afterInteractive"
          type="module"
        /> {/* Self-closed Script tag */}
      </body>
    </Html>
  )
}