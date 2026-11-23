import type { Metadata } from "next";
import { Chakra_Petch, Fira_Code, IBM_Plex_Sans } from "next/font/google";
import { profile } from "@/content/profile";
import { SiteNav } from "@/components/site-nav";
import { CockpitFrame } from "@/components/cockpit-frame";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: `${profile.name} | ${profile.role}`,
    template: `%s | ${profile.name}`,
  },
  description: `${profile.headline} ${profile.subline}`,
  applicationName: `${profile.name} portfolio`,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: `${profile.name} portfolio`,
    title: `${profile.name} | ${profile.role}`,
    description: `${profile.headline} ${profile.subline}`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "An original amber orbital star and ship on a dark background" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} | ${profile.role}`,
    description: `${profile.headline} ${profile.subline}`,
    images: [{ url: "/opengraph-image", alt: "An original amber orbital star and ship on a dark background" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${chakraPetch.variable} ${ibmPlexSans.variable} ${firaCode.variable}`}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteNav />
        <CockpitFrame />
        {children}
      </body>
    </html>
  );
}
