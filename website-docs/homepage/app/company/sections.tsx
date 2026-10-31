import Image from "next/image";
import { Icon } from "../ui";
import { homeAssets } from "../../../shared/header";
import { company, POLES } from "./data";
import { BookingForm } from "./booking-form";
import s from "../home.module.css";

export function CompanyHero() {
  const h = company.hero;
  const titleBase = h.title.replace(h.titleHighlight, "").trim();
  return (
    <section id="top" className={`${s.shell} ${s.gisHero}`} aria-labelledby="gis-hero-title">
      <div className={s.gisHeroGrid}>
        <div>
          <p className={s.gisBrandName}>{company.brandName}</p>
          <p className={s.gisEyebrow}>{h.eyebrow}</p>
          <h2 id="gis-hero-title" className={s.gisTitle}>
            {titleBase} <span className={s.gisGradient}>{h.titleHighlight}</span>
          </h2>
          <p className={s.gisLead}>{h.subtitle}</p>
          <div className={s.actions}>
            <a className={s.primary} href="#booking">{h.primary} <Icon name="arrow" /></a>
            <a className={s.secondary} href="#poles">{h.secondary} <Icon name="arrow" /></a>
          </div>
          <dl className={s.gisStats}>
            {h.stats.map(st => (
              <div key={st.label}>
                <dt>{st.value}</dt>
                <dd>{st.label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={s.gisSymbolWrap} aria-hidden>
          <Image src={`${homeAssets}/brand-gis/symbol.png`} alt="" width={420} height={420} className={s.gisSymbol} />
        </div>
      </div>
    </section>
  );
}

export function CompanyPoles() {
  const p = company.poles;
  return (
    <section id="poles" className={`${s.chapter} ${s.chapterTint}`} data-tone="subtle" aria-labelledby="poles-title">
      <div className={s.shell}>
        <div className={s.sectionHeading}>
          <div><p className={s.eyebrow}>{p.eyebrow.toUpperCase()}</p><h2 id="poles-title">{p.title}</h2></div>
          <p>{p.subtitle}</p>
        </div>
        <ul className={s.poleGrid}>
          {POLES.map((pole, i) => (
            <li key={pole.slug}>
              <article className={s.poleCard}>
                <span className={s.poleIndex}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{pole.name}</h3>
                <p>{pole.description}</p>
                <a className={s.textLink} href="#booking">{p.cta} <Icon name="arrow" /></a>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CompanyEngineIntro() {
  const e = company.engine;
  return (
    <section id="engine" className={s.chapter} data-tone="base" aria-labelledby="engine-title">
      <div className={s.shell}>
        <div className={s.sectionHeading}>
          <div><p className={s.eyebrow}>{e.eyebrow.toUpperCase()}</p><h2 id="engine-title">{e.title}</h2></div>
          <p>{e.subtitle}</p>
        </div>
        <ul className={s.engineGrid}>
          {e.features.map(f => (
            <li key={f.title}><article className={s.engineCard}><h3>{f.title}</h3><p>{f.text}</p></article></li>
          ))}
        </ul>
        <p className={s.engineCta}><a className={s.primary} href={e.productAnchor}>{e.cta} <Icon name="arrow" /></a></p>
      </div>
    </section>
  );
}

export function CompanyTrust() {
  const t = company.trust;
  return (
    <section id="trust" className={`${s.chapter} ${s.chapterTint}`} data-tone="subtle" aria-labelledby="trust-title">
      <div className={s.shell}>
        <div className={s.sectionHeading}>
          <div><p className={s.eyebrow}>{t.eyebrow.toUpperCase()}</p><h2 id="trust-title">{t.title}</h2></div>
          <p>{t.subtitle}</p>
        </div>
        <ul className={s.trustGrid}>
          {t.values.map(v => (
            <li key={v.title}><article className={s.trustCard}><h3>{v.title}</h3><p>{v.text}</p></article></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CompanyBooking() {
  const b = company.booking;
  return (
    <section id="booking" className={s.chapter} data-tone="base" aria-labelledby="booking-title">
      <div className={s.shell}>
        <div className={s.sectionHeading}>
          <div><p className={s.eyebrow}>{b.eyebrow.toUpperCase()}</p><h2 id="booking-title">{b.title}</h2></div>
          <p>{b.subtitle}</p>
        </div>
        <div className={s.bookingLayout}>
          <BookingForm />
          <aside className={s.bookingAside}>
            <h3>{b.side.title}</h3>
            <ol>{b.side.steps.map(step => <li key={step}>{step}</li>)}</ol>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function CompanyContact() {
  const c = company.contact;
  const rows = [
    { label: c.email, value: c.emailValue, href: `mailto:${c.emailValue}` },
    ...(c.phoneValue ? [{ label: c.phone, value: c.phoneValue, href: `tel:${c.phoneValue.replace(/\s/g, "")}` }] : []),
    { label: c.hours, value: c.hoursValue, href: undefined as string | undefined },
    { label: c.zone, value: c.zoneValue, href: undefined as string | undefined },
  ];
  return (
    <section id="contact" className={`${s.chapter} ${s.chapterTint}`} data-tone="subtle" aria-labelledby="contact-title">
      <div className={s.shell}>
        <div className={s.sectionHeading}>
          <div><p className={s.eyebrow}>{c.eyebrow.toUpperCase()}</p><h2 id="contact-title">{c.title}</h2></div>
        </div>
        <ul className={s.contactGrid}>
          {rows.map(row => (
            <li key={row.label}>
              <p className={s.contactLabel}>{row.label}</p>
              {row.href
                ? <a className={s.contactValue} href={row.href}>{row.value}</a>
                : <p className={s.contactValue}>{row.value}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CompanyFooterExtras() {
  const f = company.footer;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.global-it-ss.com").replace(/\/$/, "");
  return (
    <p className={s.footerTagline}>
      {f.tagline}{" "}
      <a className={s.textLink} href="#product">{f.engineCredit}</a>
      {" · "}
      <a className={s.textLink} href={appUrl} target="_blank" rel="noreferrer">{f.proSpace} <Icon name="external" /></a>
    </p>
  );
}
