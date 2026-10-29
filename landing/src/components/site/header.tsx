"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Header({ lang, t }: { lang: Lang; t: Dictionary["nav"] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#poles", label: t.poles },
    { href: "#engine", label: t.engine },
    { href: "#trust", label: t.trust },
    { href: "#booking", label: t.booking },
    { href: "#contact", label: t.contact },
  ];
  const other: Lang = lang === "fr" ? "en" : "fr";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled || open ? "border-b bg-background/75 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href={`/${lang}`} aria-label="Global-IT-SS" className="flex items-center">
          <Image src="/brand/logo-transparent.svg" alt="Global-IT-SS — IT Services & Sales" width={150} height={75} priority className="h-11 w-auto" />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={`/${other}`}
            hrefLang={other}
            aria-label={`${t.language}: ${other.toUpperCase()}`}
            className="rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            {other}
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <a href="#booking">{t.cta}</a>
          </Button>
          <button
            type="button"
            aria-label={t.menu}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-full p-2 hover:bg-muted md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Mobile" className="flex flex-col gap-1 border-t px-5 pb-5 pt-3 md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-lg hover:bg-muted">
              {l.label}
            </a>
          ))}
          <Button asChild className="mt-2">
            <a href="#booking" onClick={() => setOpen(false)}>
              {t.cta}
            </a>
          </Button>
        </nav>
      )}
    </header>
  );
}
