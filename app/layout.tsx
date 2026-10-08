import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono, Sora } from "next/font/google";
import { ContactDialogHost } from "@/components/contact/ContactDialogHost";
import { EmailRail } from "@/components/layout/EmailRail";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { getContactConfig } from "@/lib/contact/config";
import { profile, SITE_URL } from "@/lib/site";
import "./globals.css";

// Display face: the hero name is the LCP element, so only Sora is preloaded. Variable font: one file for every weight.
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", preload: false });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap", preload: false });

const description =
  "Nico Agustin is a fullstack web developer in Malolos, Bulacan, Philippines. Websites, CRMs and operations portals, reporting dashboards, and the marketing data behind them.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${profile.name} · ${profile.title}`, template: `%s · ${profile.name}` },
  description,
  applicationName: profile.name,
  authors: [{ name: profile.name, url: SITE_URL }],
  creator: profile.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: profile.name,
    title: `${profile.name} · ${profile.title}`,
    description,
    locale: "en_PH",
  },
  twitter: { card: "summary_large_image", title: `${profile.name} · ${profile.title}`, description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050914" },
    { media: "(prefers-color-scheme: light)", color: "#050914" },
  ],
  colorScheme: "dark light",
};

/*
 * Runs before paint: marks JS as available (reveal animations only hide content when JS runs) and applies the
 * visitor's stored theme (dark by default). Kept tiny and inline on purpose.
 */
const bootScript = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className={`${sora.variable} ${dmSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <SkipLink />
        <Header />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        <EmailRail />
        <SmoothScroll />
        <ContactDialogHost email={profile.email} configured={getContactConfig() !== null} />
      </body>
    </html>
  );
}
