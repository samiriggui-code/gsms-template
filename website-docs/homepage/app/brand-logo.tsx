import Image from "next/image";
import { homeAssets } from "../../shared/header";
import { company } from "./company/data";

/** Titres marque en en-tête (lisibles, sans crop du SVG). */
export function BrandLockup() {
  return (
    <span className="wk-brand-lockup">
      <span className="wk-brand-name">{company.brandName}</span>
      <span className="wk-brand-tagline">{company.brandTagline}</span>
    </span>
  );
}

/** Logo Global-IT-SS (pied de page). */
export function BrandLogo({ priority = false }: { priority?: boolean }) {
  return (
    <span className="wk-logo-gis-mark">
      <Image
        src={`${homeAssets}/brand-gis/logo-transparent.svg`}
        alt={`${company.brandName} — ${company.brandTagline}`}
        width={300}
        height={149}
        priority={priority}
        className="wk-logo-gis-img"
      />
    </span>
  );
}
