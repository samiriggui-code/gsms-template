import type { Metadata } from "next";
import { Almarai, Montserrat } from "next/font/google";
import "./globals.css";
import { themeInitializationScript } from "./theme";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});
const almarai = Almarai({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-almarai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Global-IT-SS — Services informatiques & moteur IA WeKnora",
  description:
    "Global-IT-SS : infogérance, réseau, cybersécurité, cloud, développement, IA, domotique, dépannage et formation. Moteur de connaissances WeKnora (RAG, agents, Wiki) en déploiement privé.",
  icons: { icon: "/docs/_home/brand-gis/icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full antialiased ${montserrat.variable} ${almarai.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
