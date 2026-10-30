import Image from "next/image";
import { homeAssets } from "../../shared/header";

/** Logo produit WeKnora (sections moteur). */
export function WeknoraLogo({ priority = false }: { priority?: boolean }) {
  return (
    <span className="wk-logo wk-logo--product">
      <Image src={`${homeAssets}/brand/weknora-original.png`} alt="WeKnora" width={945} height={650} priority={priority} />
    </span>
  );
}
