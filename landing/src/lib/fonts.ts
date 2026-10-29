import { Almarai, Montserrat } from "next/font/google";

// Polices du guide de marque : Montserrat 700 (titres), Almarai 300 (texte)
export const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-montserrat", display: "swap" });
export const almarai = Almarai({ subsets: ["arabic"], weight: ["300", "400", "700"], variable: "--font-almarai", display: "swap" });
