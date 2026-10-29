import { notFound } from "next/navigation";

import { Landing } from "@/components/site/landing";
import { api } from "@/lib/api";
import { FALLBACK_POLES, isLang } from "@/lib/i18n";
import { contactFromSettings } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const [poles, references, settings] = await Promise.all([api.poles(), api.publicContents(lang, "realisation"), api.publicSettings()]);

  return (
    <Landing
      lang={lang}
      data={{
        // Si le Core est injoignable, la landing reste complète grâce au repli statique
        poles: poles.length ? poles.filter((p) => p.is_active).sort((a, b) => a.position - b.position) : [...FALLBACK_POLES],
        references,
        contact: contactFromSettings(settings, lang),
      }}
    />
  );
}
