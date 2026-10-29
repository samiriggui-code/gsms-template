import Image from "next/image";
import Link from "next/link";

import type { Dictionary } from "@/lib/i18n";
import { APP_URL } from "@/lib/site";
import type { Lang } from "@/lib/types";

export function Footer({ lang, t, nav }: { lang: Lang; t: Dictionary["footer"]; nav: Dictionary["nav"] }) {
  const links = [
    { href: "#poles", label: nav.poles },
    { href: "#engine", label: nav.engine },
    { href: "#trust", label: nav.trust },
    { href: "#booking", label: nav.booking },
    { href: "#contact", label: nav.contact },
  ];
  return (
    <footer className="border-t bg-card/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          {/* Version niveaux de gris du logo, plus sobre en pied de page */}
          <Image src="/brand/logo-grayscale.svg" alt="Global-IT-SS" width={170} height={85} className="h-14 w-auto opacity-80" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">{t.tagline}</p>
        </div>
        <nav aria-label={t.sections}>
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.sections}</p>
          <ul className="space-y-2.5">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-sm hover:text-brand-cyan">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">{nav.language}</p>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/fr" hrefLang="fr" className={lang === "fr" ? "text-brand-cyan" : "hover:text-brand-cyan"}>
                Français
              </Link>
            </li>
            <li>
              <Link href="/en" hrefLang="en" className={lang === "en" ? "text-brand-cyan" : "hover:text-brand-cyan"}>
                English
              </Link>
            </li>
            <li className="pt-2">
              <a href={APP_URL} className="text-muted-foreground hover:text-brand-cyan">
                {t.backoffice}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Global-IT-SS — {t.legal}
      </div>
    </footer>
  );
}
