import type { Lang } from "./types";

export const LANGS: Lang[] = ["fr", "en"];
export const DEFAULT_LANG: Lang = "fr";

export function isLang(value: string): value is Lang {
  return (LANGS as string[]).includes(value);
}

const fr = {
  meta: {
    title: "Global-IT-SS — Services & ventes informatiques",
    description:
      "Infogérance, réseau, cybersécurité, cloud, développement, IA, domotique, dépannage et formation : neuf pôles d'expertise réunis sous un même toit.",
  },
  nav: { poles: "Pôles", engine: "Moteur IA", trust: "Confiance", booking: "Rendez-vous", contact: "Contact", cta: "Prendre rendez-vous", admin: "Espace pro", language: "Langue", menu: "Menu" },
  hero: {
    eyebrow: "IT Services & Sales",
    title: "L'informatique, orchestrée avec exigence.",
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
      "Notre moteur IA s'appuie sur vos documents pour répondre, agir et retenir. Il se déploie sur votre infrastructure ou la nôtre, et vos données restent sous votre contrôle.",
    features: [
      { title: "Réponses sourcées", text: "Recherche sémantique et par mots-clés dans vos documents. Chaque réponse cite ses sources, vérifiables en un clic." },
      { title: "Agents qui agissent", text: "Les agents lisent vos pièces jointes, interrogent la base de connaissances et utilisent des outils pour mener une tâche en plusieurs étapes." },
      { title: "Wiki automatique", text: "Vos documents deviennent des pages reliées entre elles et un graphe de connaissances, modifiables et versionnés." },
      { title: "Mémoire d'équipe", text: "Le moteur retient le contexte de vos projets et de votre équipe, et capitalise les savoir-faire d'une mission à l'autre." },
    ],
    cta: "Demander une démonstration",
  },
  trust: {
    eyebrow: "Confiance",
    title: "Une méthode, des engagements.",
    subtitle: "Ce que vous pouvez attendre de nous, à chaque mission.",
    values: [
      { title: "Réactivité mesurée", text: "Chaque demande devient un ticket suivi, priorisé et assigné. Vous savez toujours où en est votre dossier." },
      { title: "Sécurité par défaut", text: "Moindre privilège, sauvegardes vérifiées, mises à jour planifiées : la sécurité n'est pas une option." },
      { title: "Transparence", text: "Devis détaillés, factures claires, comptes rendus d'intervention. Aucun frais caché." },
      { title: "Accompagnement humain", text: "Un interlocuteur identifié, qui parle votre langue — technique ou non — en français comme en anglais." },
    ],
    stack: "Technologies que nous maîtrisons",
    references: "Réalisations",
    referencesEmpty: "Nos études de cas arrivent bientôt.",
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
  },
  footer: {
    tagline: "Services & ventes informatiques.",
    sections: "Navigation",
    legal: "Tous droits réservés.",
    backoffice: "Espace professionnel",
  },
};

export type Dictionary = typeof fr;

const en: Dictionary = {
  meta: {
    title: "Global-IT-SS — IT services & sales",
    description:
      "Managed IT, networking, cybersecurity, cloud, development, AI, home automation, troubleshooting and training: nine areas of expertise under one roof.",
  },
  nav: { poles: "Services", engine: "AI engine", trust: "Trust", booking: "Book a call", contact: "Contact", cta: "Book a meeting", admin: "Staff area", language: "Language", menu: "Menu" },
  hero: {
    eyebrow: "IT Services & Sales",
    title: "IT, orchestrated with rigour.",
    subtitle:
      "Nine areas of expertise, one team. Global-IT-SS designs, secures and runs the digital infrastructure of individuals, freelancers and businesses.",
    primary: "Request a quote",
    secondary: "Explore our services",
    stats: [
      { value: "9", label: "areas of expertise" },
      { value: "24/7", label: "incident tracking" },
      { value: "FR · EN", label: "bilingual support" },
    ],
  },
  poles: {
    eyebrow: "Our services",
    title: "Nine skills, one point of contact.",
    subtitle: "From infrastructure to training, each practice builds on the others to deliver a coherent solution.",
    cta: "Let's talk",
  },
  engine: {
    eyebrow: "AI engine",
    title: "Your knowledge, put to work.",
    subtitle:
      "Our AI engine draws on your documents to answer, act and remember. It runs on your infrastructure or ours, and your data stays under your control.",
    features: [
      { title: "Sourced answers", text: "Semantic and keyword search across your documents. Every answer cites its sources, one click away." },
      { title: "Agents that act", text: "Agents read your attachments, query the knowledge base and use tools to carry out multi-step tasks." },
      { title: "Automatic wiki", text: "Your documents become linked pages and a knowledge graph, editable and versioned." },
      { title: "Team memory", text: "The engine keeps the context of your projects and team, and builds up know-how from one engagement to the next." },
    ],
    cta: "Request a demo",
  },
  trust: {
    eyebrow: "Trust",
    title: "One method, firm commitments.",
    subtitle: "What you can expect from us on every engagement.",
    values: [
      { title: "Measured responsiveness", text: "Every request becomes a tracked, prioritised and assigned ticket. You always know where your case stands." },
      { title: "Secure by default", text: "Least privilege, verified backups, scheduled updates: security is never optional." },
      { title: "Transparency", text: "Itemised quotes, clear invoices, intervention reports. No hidden fees." },
      { title: "Human support", text: "A named contact who speaks your language — technical or not — in French or English." },
    ],
    stack: "Technologies we master",
    references: "Case studies",
    referencesEmpty: "Our case studies are coming soon.",
  },
  booking: {
    eyebrow: "Meetings & quotes",
    title: "Let's talk about your project.",
    subtitle: "Pick a slot or describe your need: we get back to you within one business day.",
    tabs: { appointment: "Meeting", quote: "Quote", question: "Question" },
    fields: {
      name: "Full name",
      email: "Email",
      pole: "Service area",
      poleAny: "I don't know yet",
      date: "Preferred date",
      time: "Time",
      duration: "Duration",
      subject: "Subject",
      message: "Your need",
    },
    durations: { "30": "30 minutes", "60": "1 hour", "90": "1 h 30" },
    submit: { appointment: "Book this slot", quote: "Send my quote request", question: "Send my question" },
    sending: "Sending…",
    success: "Thank you! Your request has been received — we'll reply very soon.",
    errorGeneric: "Sending failed. Please try again or write to us directly.",
    notePrefix: { quote: "Quote request", question: "Question" },
    side: {
      title: "What happens next",
      steps: ["We acknowledge your request.", "An expert from the relevant practice contacts you.", "You receive a clear, no-obligation quote."],
    },
  },
  contact: {
    eyebrow: "Contact",
    title: "A question? Write to us.",
    email: "Email",
    phone: "Phone",
    hours: "Opening hours",
    hoursValue: "Mon – Fri · 9 am – 6 pm",
    zone: "Service area",
    zoneValue: "On site or remote",
  },
  footer: {
    tagline: "IT services & sales.",
    sections: "Navigation",
    legal: "All rights reserved.",
    backoffice: "Staff area",
  },
};

export const dictionaries: Record<Lang, Dictionary> = { fr, en };

export const getDictionary = (lang: Lang): Dictionary => dictionaries[lang];

/** Repli statique des 9 pôles (identique au seed du Core) quand l'API est injoignable. */
export const FALLBACK_POLES = [
  { slug: "infogerance", name_fr: "Infogérance", name_en: "Managed IT services", description_fr: "Gestion et supervision de votre parc informatique.", description_en: "Management and monitoring of your IT estate." },
  { slug: "reseau", name_fr: "Réseau", name_en: "Networking", description_fr: "Conception, déploiement et maintenance de réseaux.", description_en: "Design, deployment and maintenance of networks." },
  { slug: "cybersecurite", name_fr: "Cybersécurité", name_en: "Cybersecurity", description_fr: "Audit, protection et réponse aux incidents.", description_en: "Audit, protection and incident response." },
  { slug: "cloud", name_fr: "Cloud", name_en: "Cloud", description_fr: "Migration, hébergement et exploitation cloud.", description_en: "Cloud migration, hosting and operations." },
  { slug: "developpement", name_fr: "Développement", name_en: "Software development", description_fr: "Applications web et sur mesure.", description_en: "Web and bespoke applications." },
  { slug: "ia", name_fr: "Intelligence artificielle", name_en: "Artificial intelligence", description_fr: "Assistants, automatisation et intégration de modèles.", description_en: "Assistants, automation and model integration." },
  { slug: "domotique", name_fr: "Domotique", name_en: "Home automation", description_fr: "Maison et bâtiments connectés.", description_en: "Connected homes and buildings." },
  { slug: "depannage", name_fr: "Dépannage", name_en: "Troubleshooting", description_fr: "Intervention rapide sur site ou à distance.", description_en: "Fast on-site or remote assistance." },
  { slug: "formation", name_fr: "Formation", name_en: "Training", description_fr: "Formations pour particuliers et équipes.", description_en: "Training for individuals and teams." },
] as const;
