import type { Metadata } from "next";
import { ModelLeaderboard } from "../../model-leaderboard";

export const metadata: Metadata = {
  title: "Benchmarks WeKnora · Chat / Embed / Rerank",
  description:
    "Comparaison des modèles Chat, Embed et Rerank sur les mêmes jeux de données et paramètres, avec classements par métrique.",
};

export default function Page() {
  return <ModelLeaderboard />;
}
