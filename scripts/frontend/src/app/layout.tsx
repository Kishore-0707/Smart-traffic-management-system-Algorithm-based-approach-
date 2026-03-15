import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SUMO Traffic Monitor — Real-Time Dashboard',
  description: 'Real-time traffic simulation dashboard powered by SUMO and Next.js. Visualizes vehicle density per lane and congestion mode for a 4-arm intersection.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
