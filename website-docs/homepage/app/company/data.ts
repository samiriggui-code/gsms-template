/** Contenu vitrine Global-IT-SS (FR) — migré depuis l’ancien package `landing/`. */

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost").replace(/\/$/, "");
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const DEFAULT_CONTACT_EMAIL = "contact@globalitss.com";

export const company = {
  brandName: "Global-IT-SS",
  brandTagline: "IT Services & Sales",
  hero: {
    eyebrow: "IT Services & Sales",
    title: "L'informatique, orchestrée avec exigence.",
    titleHighlight: "exigence.",
    subtitle:
      "Neuf pôles d'expertise, une seule équipe. Global-IT-SS conçoit, sécurise et fait vivre l'infrastructure numérique des particuliers, des indépendants et des entreprises.",
    primary: "Demander un devis",
    secondary: "Découvrir nos pôles",
    stats: [
      { value: "9", label: "pôles d'expertise" },
      { value: "24/7", label: "suivi des incidents" },
      { value: "FR · EN", label: "support bilingue" },
    ],
  },
  poles: {
    eyebrow: "Nos pôles",
    title: "Neuf expertises, un interlocuteur.",
    subtitle: "De l'infrastructure à la formation, chaque pôle s'appuie sur les autres pour livrer une solution cohérente.",
    cta: "En discuter",
  },
  engine: {
    eyebrow: "Moteur IA",
    title: "Vos connaissances, mises au travail.",
    subtitle:
      "Notre moteur s'appuie sur WeKnora (open source Tencent) : RAG, agents, Wiki et mémoire d'équipe, déployables chez vous ou chez nous. Vos données restent sous votre contrôle.",
    features: [
      { title: "Réponses sourcées", text: "Recherche sémantique et par mots-clés. Chaque réponse cite ses sources, vérifiables en un clic." },
      { title: "Agents qui agissent", text: "Pièces jointes, base de connaissances, outils MCP et skills pour mener une tâche en plusieurs étapes." },
      { title: "Wiki automatique", text: "Documents transformés en pages liées et graphe de connaissances, modifiables et versionnés." },
      { title: "Mémoire d'équipe", text: "Contexte de projets et capitalisation des savoir-faire d'une mission à l'autre." },
    ],
    cta: "Voir le moteur en détail",
    productAnchor: "#product",
  },
  trust: {
    eyebrow: "Confiance",
    title: "Une méthode, des engagements.",
    subtitle: "Ce que vous pouvez attendre de nous, à chaque mission.",
    values: [
      { title: "Réactivité mesurée", text: "Chaque demande devient un ticket suivi, priorisé et assigné. Vous savez toujours où en est votre dossier." },
      { title: "Sécurité par défaut", text: "Moindre privilège, sauvegardes vérifiées, mises à jour planifiées : la sécurité n'est pas une option." },
      { title: "Transparence", text: "Devis détaillés, factures claires, comptes rendus d'intervention. Aucun frais caché." },
      { title: "Accompagnement humain", text: "Un interlocuteur identifié, en français comme en anglais — jargon technique ou langage simple." },
    ],
  },
  booking: {
    eyebrow: "Rendez-vous & devis",
    title: "Parlons de votre projet.",
    subtitle: "Choisissez un créneau ou décrivez votre besoin : nous revenons vers vous sous un jour ouvré.",
    tabs: { appointment: "Rendez-vous", quote: "Devis", question: "Question" },
    fields: {
      name: "Nom complet",
      email: "E-mail",
      pole: "Pôle concerné",
      poleAny: "Je ne sais pas encore",
      date: "Date souhaitée",
      time: "Heure",
      duration: "Durée",
      subject: "Sujet",
      message: "Votre besoin",
    },
    durations: { "30": "30 minutes", "60": "1 heure", "90": "1 h 30" },
    submit: { appointment: "Réserver ce créneau", quote: "Envoyer ma demande de devis", question: "Envoyer ma question" },
    sending: "Envoi…",
    success: "Merci ! Votre demande est bien reçue — nous vous répondons très vite.",
    errorGeneric: "L'envoi a échoué. Réessayez ou écrivez-nous directement.",
    notePrefix: { quote: "Demande de devis", question: "Question" },
    side: {
      title: "Ce qui se passe ensuite",
      steps: ["Nous accusons réception de votre demande.", "Un expert du pôle concerné vous contacte.", "Vous recevez un devis clair, sans engagement."],
    },
  },
  contact: {
    eyebrow: "Contact",
    title: "Une question ? Écrivez-nous.",
    email: "E-mail",
    phone: "Téléphone",
    hours: "Horaires",
    hoursValue: "Lun – Ven · 9 h – 18 h",
    zone: "Zone d'intervention",
    zoneValue: "Sur site ou à distance",
    emailValue: DEFAULT_CONTACT_EMAIL,
    phoneValue: null as string | null,
  },
  footer: {
    tagline: "Services & ventes informatiques.",
    proSpace: "Espace pro",
    engineCredit: "Moteur IA : WeKnora (open source Tencent · MIT)",
  },
};

export const POLES = [
  { slug: "infogerance", name: "Infogérance", description: "Gestion et supervision de votre parc informatique." },
  { slug: "reseau", name: "Réseau", description: "Conception, déploiement et maintenance de réseaux." },
  { slug: "cybersecurite", name: "Cybersécurité", description: "Audit, protection et réponse aux incidents." },
  { slug: "cloud", name: "Cloud", description: "Migration, hébergement et exploitation cloud." },
  { slug: "developpement", name: "Développement", description: "Applications web et sur mesure." },
  { slug: "ia", name: "Intelligence artificielle", description: "Assistants, automatisation et intégration de modèles." },
  { slug: "domotique", name: "Domotique", description: "Maison et bâtiments connectés." },
  { slug: "depannage", name: "Dépannage", description: "Intervention rapide sur site ou à distance." },
  { slug: "formation", name: "Formation", description: "Formations pour particuliers et équipes." },
] as const;
