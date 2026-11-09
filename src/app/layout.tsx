import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { site } from '@/data/site';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import './globals.css';

/*
 * One family, two roles: Archivo at 125% width / 800 weight for display capitals,
 * and at its normal width for text. Covers Azerbaijani and Turkish (Ə ə İ ı Ş Ğ Ü).
 */
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
  display: 'swap',
  axes: ['wdth'],
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  openGraph: { title: site.title, description: site.description, type: 'website' },
};

export const viewport: Viewport = {
  themeColor: '#f3f2ee',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
