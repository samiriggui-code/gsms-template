import { Booking } from "@/components/site/booking";
import { Contact, type ContactInfo } from "@/components/site/contact";
import { Engine } from "@/components/site/engine";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { Poles, type PoleView } from "@/components/site/poles";
import { Trust } from "@/components/site/trust";
import { getDictionary } from "@/lib/i18n";
import type { ContentPublic, Lang } from "@/lib/types";

export interface LandingData {
  poles: (PoleView & { id?: number })[];
  references: ContentPublic[];
  contact: ContactInfo;
}

/** Landing complète — composant pur : les données viennent de la page (ou des tests). */
export function Landing({ lang, data }: { lang: Lang; data: LandingData }) {
  const t = getDictionary(lang);
  const bookingPoles = data.poles
    .filter((p): p is PoleView & { id: number } => typeof p.id === "number")
    .map((p) => ({ id: p.id, slug: p.slug, label: lang === "en" ? p.name_en || p.name_fr : p.name_fr }));

  return (
    <>
      <Header lang={lang} t={t.nav} />
      <main>
        <Hero t={t.hero} />
        <Poles lang={lang} poles={data.poles} t={t.poles} />
        <Engine t={t.engine} />
        <Trust t={t.trust} references={data.references} />
        <Booking lang={lang} t={t.booking} poles={bookingPoles} />
        <Contact t={t.contact} info={data.contact} />
      </main>
      <Footer lang={lang} t={t.footer} nav={t.nav} />
    </>
  );
}
