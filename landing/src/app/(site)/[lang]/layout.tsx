import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import "../../globals.css";
import { almarai, montserrat } from "@/lib/fonts";
import { LANGS, getDictionary, isLang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export const viewport: Viewport = { themeColor: "#04060c", colorScheme: "dark" };

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const { meta } = getDictionary(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: meta.title, template: "%s · Global-IT-SS" },
    description: meta.description,
    alternates: { canonical: `/${lang}`, languages: { fr: "/fr", en: "/en", "x-default": "/fr" } },
    // Images de partage : Social Media Kit (Facebook Cover / Twitter Header)
    openGraph: {
      type: "website",
      siteName: "Global-IT-SS",
      title: meta.title,
      description: meta.description,
      url: `/${lang}`,
      locale: lang === "fr" ? "fr_FR" : "en_GB",
      images: [{ url: "/brand/og-facebook.png", width: 1700, height: 630, alt: "Global-IT-SS — IT Services & Sales" }],
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description, images: ["/brand/og-twitter.png"] },
    icons: { icon: [{ url: "/favicon.ico" }, { url: "/brand/icon.png", type: "image/png" }], apple: "/brand/icon.png" },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} className={`${montserrat.variable} ${almarai.variable} theme-dark`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
