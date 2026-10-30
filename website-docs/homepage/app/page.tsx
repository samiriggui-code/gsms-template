import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import { BrandLogo } from "./brand-logo";
import { WeknoraLogo } from "./weknora-logo";
import { CompanyHero, CompanyPoles, CompanyEngineIntro, CompanyTrust, CompanyBooking, CompanyContact, CompanyFooterExtras } from "./company/sections";
import { Icon } from "./ui";
import { homeAssets } from "../../shared/header";
import { ProductGallery, type GalleryShot, type GallerySlide } from "./product-gallery";
import { Header, ProductVideo } from "./interactive";
import { clients, dataSources, modelProviders, IntegrationMark } from "./brands";
import s from "./home.module.css";

const repo = "https://github.com/Tencent/WeKnora";
const docs = "/docs/";
const guide = (path: string) => `${docs}${path}.html`;
const modes = [
  { number: "01", icon: "search", label: "RAG", title: "Des réponses étayées", description: "Recherche sémantique et par mots-clés dans le texte, avec embeddings multimodaux pour les images. Cliquez sur une citation dans la réponse pour retrouver le passage source.", tags: ["Recherche hybride", "Embeddings multimodaux", "Citation à la source"], link: "03-features/05-retrieval-engines", related: [
    { label: "Recherche texte et images", href: guide("03-features/02-knowledge-base") + "#multimodal-embedding" },
    { label: "Citations et sources", href: guide("03-features/18-chat-experience") },
  ] },
  { number: "02", icon: "agent", label: "Agent", title: "Accomplir des tâches avec vos connaissances et vos outils", description: "Lecture à la demande des pièces jointes (texte et images), recherche dans la base, appels d’outils MCP et skills. Exécution dans un sandbox ou le navigateur local ; vous pouvez affiner, brancher ou revenir en arrière dans la conversation.", tags: ["Lecture des pièces jointes à la demande", "Raisonnement multi-étapes", "Skills et sandbox", "Navigateur local", "Outils MCP", "Mémoire longue durée"], link: "03-features/07-agent", related: [
    { label: "Pièces jointes et dialogue", href: guide("03-features/18-chat-experience") },
  ] },
  { number: "03", icon: "wiki", label: "Wiki", title: "Transformer vos documents en Wiki", description: "Génération de pages Wiki liées entre elles et d’un graphe de connaissances à partir des documents sources, avec navigation, édition et retour aux versions antérieures.", tags: ["Organisation automatique", "Graphe de connaissances", "Retour arrière de version"], link: "03-features/14-wiki", related: [] },
];
const releaseExtras = [
  { name: "Sandbox réutilisable par utilisateur", link: "03-features/22-skills-sandbox" },
  { name: "Pipeline de traitement d’images", link: "03-features/03-document-parsing" },
  { name: "Synchronisation Feishu / Lark", link: "03-features/24-feishu-drive" },
  { name: "Améliorations recherche et parsing", link: "03-features/05-retrieval-engines" },
];

const productShotExists = (src: string) => existsSync(join(process.cwd(), "public", src));
type SlideSource = Omit<GallerySlide, "shots"> & ({ image: string; alt: string } | { shots: Omit<GalleryShot, "available">[] });
const withAvailability = (slide: SlideSource): GallerySlide => {
  const shots = "shots" in slide ? slide.shots : [{ image: slide.image, alt: slide.alt }];
  return { name: slide.name, icon: slide.icon, title: slide.title, description: slide.description, link: slide.link, external: slide.external, shots: shots.map(shot => ({ ...shot, available: productShotExists(`${homeAssets}/product/${shot.image}.png`) })) };
};
const releaseSlides = [
  { name: "Assistant WeKnora", icon: "agent", shots: [
    { label: "Questions produit", icon: "file", image: "assistant-release-guide", alt: "Demander à l’assistant WeKnora les nouveautés de la v0.9.0 à partir de la documentation produit" },
    { label: "Aide aux tâches", icon: "agent", image: "assistant-overview", alt: "Vue cartes de la base : l’assistant lit les documents d’un événement et propose des actions concrètes" },
  ], title: "Comprendre WeKnora, et avancer sur vos tâches", description: "Questions sur les versions, les fonctionnalités et la configuration. L’assistant s’appuie sur la page courante, agit en votre nom pour consulter, créer des agents, planifier des tâches ou modifier ce que vous êtes autorisé à gérer.", link: guide("03-features/26-weknora-assistant") },
  { name: "Collaboration multi-agents", icon: "channels", image: "agent-collaboration", title: "Plusieurs agents en parallèle", description: "Répartissez collecte, synthèse et vérification entre plusieurs agents. Chaque sous-tâche a son fil de dialogue ; progression et résultats restent visibles.", alt: "Plusieurs agents organisent des notes de club de lecture puis fusionnent le résultat", link: guide("03-features/26-weknora-assistant") + "#collaboration" },
  { name: "Automatisations", icon: "history", shots: [
    { label: "Configuration en une phrase", icon: "agent", image: "automation-conversation", alt: "Demander en une phrase à l’assistant de créer une automatisation et valider tâche et horaire" },
    { label: "Configuration manuelle", icon: "history", image: "automation-setup", alt: "Formulaire d’automatisation : récurrence, heure, fuseau et aperçu des prochaines exécutions" },
  ], title: "Une phrase suffit, ou configurez pas à pas", description: "Dites quoi faire et quand, ou remplissez le formulaire. Les tâches s’exécutent en votre nom selon le planning ; vous êtes notifié des résultats et des approbations en attente.", link: guide("03-features/27-automations") },
  { name: "Permissions d’exécution et approbations", icon: "shield", image: "assistant-permissions", title: "Choisir ce qui demande une confirmation", description: "Lecture seule, confirmation avant modification ou exécution automatique. Voyez l’action exacte avant d’approuver ; les opérations sensibles comme la suppression restent soumises à validation.", alt: "Base en cartes : vérification du document et du nouveau titre avant approbation", link: guide("03-features/28-agent-permissions") },
].map(withAvailability);
const browserSlides = [
  { name: "Exécuter des tâches", icon: "browser", title: "Dans votre propre navigateur",
    description: "L’agent ouvre des pages, cherche des informations, remplit des formulaires. Suivi en direct, pause à tout moment ; login ou CAPTCHA : vous reprenez la main, puis l’agent continue.",
    image: "local-browser-task", alt: "Agent sur le navigateur local : aperçu de tâche et contrôle pause dans le dialogue",
    link: guide("05-clients/09-local-browser"),
  },
  { name: "Connecter l’extension", icon: "plug", title: "Chrome ou Edge, prêt en quelques clics",
    description: "Installez l’extension open source BrowserSkill (Tencent), connectez le navigateur local depuis la boîte à outils, vérifiez l’état, puis déléguez la navigation à l’agent.",
    image: "browser-connection", alt: "Page de connexion navigateur : extension BrowserSkill connectée",
    link: guide("05-clients/09-local-browser"),
    external: { label: "BrowserSkill", href: "https://github.com/Tencent/BrowserSkill", logo: "browserskill.png" },
  },
].map(withAvailability);
const knowledgeSlides = [
  { name: "Parcours galerie", icon: "sources", image: "kb-image-gallery", title: "Toutes les images des documents au même endroit", description: "Graphiques, photos et captures regroupés. Filtrez par document source ou cherchez dans les descriptions et le texte reconnu.", alt: "Galerie de la base : images des documents, recherche et filtres par source", link: guide("03-features/02-knowledge-base") + "#image-gallery" },
  { name: "Détail d’image", icon: "search", image: "kb-image-gallery-detail", title: "L’image en grand, avec sa provenance", description: "Zoom sur l’image, description et texte OCR. Ouvrez le document source pour replacer l’image dans son contexte.", alt: "Détail galerie : image, description, OCR et lien vers le document source", link: guide("03-features/02-knowledge-base") + "#image-gallery" },
].map(withAvailability);
const wikiSlides = [
  { name: "Graphe de connaissances", icon: "channels", image: "wiki-graph-groups", title: "Vue d’ensemble, puis focus sur un groupe", description: "Pages liées regroupées avec description thématique. Zoomez sur un groupe, suivez les liens, revenez à la vue d’ensemble.", alt: "Graphe Wiki : groupes de pages, descriptions et entrées de focus", link: guide("03-features/14-wiki") + "#wiki-graph" },
  { name: "Navigation des pages", icon: "wiki", image: "wiki-browser", title: "Par thème, avec les sources", description: "Une fois le Wiki activé, personnes, produits et concepts extraits des documents deviennent des pages avec citations sources, organisées en arborescence.", alt: "Navigateur Wiki : sommaire thématique, page exemple et renvois aux documents" },
  { name: "Historique des versions", icon: "history", image: "wiki-revision-history", title: "Éditez, retrouvez chaque changement", description: "Révision directe ou aide de l’agent. Consultez les différences de version et revenez à un contenu antérieur si besoin.", alt: "Historique Wiki : liste des versions, différences de version et retour arrière" },
].map(withAvailability);
const sandboxSlides = [
  { name: "Sandbox par session", icon: "sandbox", image: "skill-sandbox-chat", title: "Poursuivre dans le même environnement", description: "Docker, E2B ou Cube. Un workspace partagé pour toute la session ; fichiers générés prévisualisables et téléchargeables. Sur macOS Lite, rattachement d’un dossier projet local.", alt: "Interface WeKnora : l’agent génère un document Word depuis la base et ouvre l’aperçu à côté du chat", link: guide("03-features/22-skills-sandbox") },
  { name: "Bureau graphique et terminal", icon: "monitor", shots: [
    { label: "Bureau graphique", icon: "monitor", image: "sandbox-desktop", alt: "Panneau sandbox : onglet bureau XFCE et gestionnaire de fichiers dans le conteneur" },
    { label: "Terminal interactif", icon: "terminal", image: "sandbox-terminal", alt: "Terminal sandbox listant les fichiers Word générés dans output/" },
  ], title: "Bureau et terminal pour voir chaque étape", description: "Terminal interactif Docker, E2B ou Cube à côté du chat ; avec les modèles bureau E2B/Cube, ouvrez le bureau graphique et intervenez vous-même.", link: guide("03-features/22-skills-sandbox") },
  { name: "Catalogue de skills", icon: "skills", image: "skill-catalog", title: "Installer, gérer, réutiliser", description: "Skills depuis ClawHub, SkillHub, Git ou ZIP, gérés dans l’espace de travail ; sur macOS Lite, installation et exécution de skills locaux.", alt: "Boîte à outils : skills docx, pptx, pdf et sandboxes associés", link: guide("03-features/22-skills-sandbox") },
].map(withAvailability);

export default function Home() {
  return <div className={s.site}>
    <a className={s.skipLink} href="#main">Aller au contenu</a>
    <Header />
    <main id="main">
      <CompanyHero />
      <CompanyPoles />
      <CompanyEngineIntro />
      <section id="product" className={`${s.shell} ${s.hero} ${s.productBand}`} aria-labelledby="hero-title">
        <a href="#release" className={s.releaseLink}><span>v0.9.0</span> Assistant · Collaboration multi-agents · Automatisations · Permissions <Icon name="arrow" /></a>
        <div className={s.heroGrid}>
          <h1 id="hero-title">Trouvez la bonne réponse,<br /><em>et mettez la connaissance en action.</em></h1>
          <div className={s.heroAside}>
            <p className={s.eyebrow}>MOTEUR IA · WEKNORA · OPEN SOURCE TENCENT</p>
            <p className={s.heroDescription}>Framework open source de gestion des connaissances.<br />Centralisez les ressources de l’équipe pour le question-réponse, l’exécution de tâches et le Wiki.</p>
            <div className={s.actions}><a className={s.primary} href="#get-started">Commencer <Icon name="arrow" /></a><a className={s.secondary} href={repo} target="_blank" rel="noreferrer"><Icon name="github" /> GitHub</a></div>
            <p className={s.heroNote}>RAG / Agent / Wiki automatique</p>
          </div>
        </div>
        <ProductVideo />
        <div className={s.trustBar}><span><Icon name="github" /> Open source Tencent · Licence MIT</span><span><Icon name="server" /> Déploiement privé</span><span><Icon name="model" /> Modèles et stockage au choix</span></div>
      </section>
      <section id="capabilities" className={`${s.chapter}`} data-tone="base" aria-labelledby="capabilities-title"><div className={s.shell}>
        <div className={s.sectionHeading}><div><p className={s.eyebrow}>01 / KNOWLEDGE AT WORK</p><h2 id="capabilities-title">Question-réponse, tâches et Wiki automatique</h2></div><p>Le RAG pour interroger vos sources, l’Agent pour les tâches en plusieurs étapes,<br />le Wiki pour structurer — une seule base de connaissances.</p></div>
        <div className={s.modeGrid}>{modes.map(mode => <article className={s.mode} key={mode.label}>
          <div className={s.modeTop}><Icon name={mode.icon} /><span>{mode.number} / {mode.label.toUpperCase()}</span></div>
          <h3>{mode.title}</h3><p>{mode.description}</p><ul className={s.tags}>{mode.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
          <div className={s.slideLinks}>
            <a className={s.textLink} href={mode.label === "Wiki" ? "#wiki" : guide(mode.link)}>Découvrir {mode.label} <Icon name="arrow" /></a>
            {mode.related.map(item => <a className={s.textLink} href={item.href} key={item.href}>{item.label} <Icon name="arrow" /></a>)}
          </div>
        </article>)}</div>
      </div></section>
      <section id="release" className={`${s.chapter} ${s.chapterTint}`} data-tone="subtle" aria-labelledby="release-title"><div className={s.shell}>
        <div className={s.sectionHeading}><div><p className={s.eyebrow}>02 / INTRODUCING v0.9.0</p><h2 id="release-title">Assistant WeKnora, collaboration multi-agents et automatisations</h2></div><a className={s.textLink} href={guide("07-releases/v0.9.0")}>Notes de version et vidéo <Icon name="arrow" /></a></div>
        <ProductGallery id="release-gallery" label="v0.9.0" slides={releaseSlides} layout="compact" />
        <div className={s.releaseExtras}><span>Cette version inclut aussi</span>{releaseExtras.map(item => <a className={s.textLink} key={item.name} href={guide(item.link)}>{item.name} <Icon name="arrow" /></a>)}</div>
      </div></section>
      <section id="agent-workflow" className={`${s.chapter}`} data-tone="base" aria-labelledby="agent-workflow-title"><div className={s.shell}>
        <div className={s.sectionHeading}><div><p className={s.eyebrow}>03 / YOUR LOCAL BROWSER</p><h2 id="agent-workflow-title">Votre agent pilote votre navigateur</h2></div><a className={s.textLink} href={guide("05-clients/09-local-browser")}>Connecter le navigateur local <Icon name="arrow" /></a></div>
        <ProductGallery id="browser-gallery" label="Navigateur local" slides={browserSlides} layout="compact" />
      </div></section>
      <section id="skills-sandbox" className={`${s.chapter} ${s.chapterTint}`} data-tone="subtle" aria-labelledby="skills-sandbox-title"><div className={s.shell}>
        <div className={s.sectionHeading}><div><p className={s.eyebrow}>04 / SKILLS &amp; SANDBOX</p><h2 id="skills-sandbox-title">Skills exécutables et fichiers produits par l’agent.</h2></div><a className={s.textLink} href={guide("03-features/22-skills-sandbox")}>Skills et sandbox <Icon name="arrow" /></a></div>
        <ProductGallery id="sandbox-gallery" label="Skills et sandbox" slides={sandboxSlides} />
      </div></section>
      <section id="knowledge-gallery" className={s.chapter} data-tone="base" aria-labelledby="knowledge-gallery-title"><div className={s.shell}>
        <div className={s.sectionHeading}><div><p className={s.eyebrow}>05 / KNOWLEDGE &amp; GALLERY</p><h2 id="knowledge-gallery-title">Parcourir les images de la base en galerie</h2></div><a className={s.textLink} href={guide("03-features/02-knowledge-base") + "#image-gallery"}>Base de connaissances et galerie <Icon name="arrow" /></a></div>
        <ProductGallery id="knowledge-gallery-views" label="Base de connaissances et galerie" slides={knowledgeSlides} layout="compact" />
      </div></section>
      <section id="wiki" className={`${s.chapter} ${s.chapterTint} ${s.wiki}`} data-tone="subtle" aria-labelledby="wiki-title"><div className={s.shell}>
        <div className={s.sectionHeading}>
          <div><p className={s.eyebrow}>06 / AUTOMATIC WIKI</p><h2 id="wiki-title">Des documents structurés en Wiki navigable.</h2></div>
          <a className={s.textLink} href={guide("03-features/14-wiki")}>Utiliser le Wiki <Icon name="arrow" /></a>
        </div>
        <ProductGallery id="wiki-gallery" label="Wiki" slides={wikiSlides} />
      </div></section>
      <section id="ecosystem" className={s.chapter} data-tone="base" aria-labelledby="ecosystem-title"><div className={s.shell}>
        <div className={s.sectionHeading}><div><p className={s.eyebrow}>07 / INTEGRATIONS</p><h2 id="ecosystem-title">Sources de données et intégrations</h2></div><p>Synchronisez Feishu, Confluence, GitLab et d’autres sources,<br />puis interrogez via messagerie, extension navigateur, serveur MCP ou API.</p></div>
        <div className={s.ecosystem}>
          <div className={s.ecosystemColumn}><Icon name="sources" /><h3>Importer et synchroniser</h3><p>Fichiers, pages web ou connecteurs externes. Seafile et sources similaires : sync par dossier et mises à jour incrémentales.</p><div className={s.integrations}>{dataSources.map(item => <span key={item.name}><IntegrationMark item={item} /></span>)}</div><div className={s.slideLinks}><a className={s.textLink} href={guide("03-features/10-datasource")}>Connecteurs de données <Icon name="arrow" /></a><a className={s.textLink} href={guide("03-features/25-seafile")}>Connecter Seafile <Icon name="arrow" /></a></div></div>
          <div className={s.ecosystemCore}><WeknoraLogo /><span>Base d’équipe et agents</span><div>Comprendre · Rechercher · Raisonner · Agir</div></div>
          <div className={s.ecosystemColumn}><Icon name="channels" /><h3>Dans vos outils habituels</h3><p>Messagerie, extension navigateur, clients MCP et intégrations dev.</p><div className={s.integrations}>{clients.map(item => <span key={item.name}><IntegrationMark item={item} /></span>)}</div><a className={s.textLink} href={guide("03-features/12-im-integration")}>Clients et canaux <Icon name="arrow" /></a><div className={s.mcpEntry}><h4>Partager les connaissances via le serveur MCP</h4><p>Connectez Claude, Cursor et autres outils IA à la base de l’équipe pour interroger et citer vos sources.</p><a className={s.textLink} href={guide("03-features/08-mcp")}>Configurer le point de terminaison MCP <Icon name="arrow" /></a></div></div>
        </div>
        <div className={s.models}><span>Modèles à votre choix · 30 fournisseurs intégrés <a className={s.textLink} href={guide("03-features/06-models")}>Voir la liste <Icon name="arrow" /></a></span>{modelProviders.map(item => <p key={item.name}><IntegrationMark item={item} /></p>)}</div>
      </div></section>
      <section id="enterprise" className={`${s.chapter} ${s.chapterTint}`} data-tone="subtle" aria-labelledby="enterprise-title"><div className={s.shell}>
        <div className={s.sectionHeading}><div><p className={s.eyebrow}>08 / BUILT FOR YOUR TEAM</p><h2 id="enterprise-title">Déploiement privé,<br />droits adaptés à l’équipe.</h2></div><p>Stockage, membres et permissions,<br />journaux d’activité et suivi des tâches.</p></div>
        <div className={s.enterpriseGrid}><article><Icon name="server" /><h3>Déploiement et stockage</h3><p>Docker, Kubernetes, Helm, édition Lite ou application desktop. Modèles, base vectorielle et stockage interchangeables, inférence locale possible.</p></article><article><Icon name="shield" /><h3>Utilisateurs et ressources</h3><p>Comptes, administrateurs, rôles d’espace, partage, périmètre des clés API, OIDC et listes blanches de domaines.</p><a className={s.textLink} href={guide("03-features/20-platform-admin")}>Gestion des utilisateurs plateforme <Icon name="arrow" /></a></article><article><Icon name="trace" /><h3>Audit et supervision</h3><p>Journaux d’espace, file de tâches et traces Langfuse pour diagnostiquer et piloter l’exploitation.</p></article></div>
      </div></section>
      <section id="get-started" className={`${s.chapter} ${s.closing}`} data-tone="base" aria-labelledby="closing-title"><div className={s.shell}>
        <div className={s.sectionHeading}><div><p className={s.eyebrow}>GET STARTED</p><h2 id="closing-title">Choisissez votre mode d’utilisation.</h2></div></div>
        <div className={s.startGrid}>
          <article className={s.startCard}>
            <div className={s.startLabel}><Image className={s.startBrand} src={`${homeAssets}/brands/wechat-dialog.png`} alt="Logo WeChat Open Platform" width={32} height={32} /><span>En ligne</span></div>
            <h3>Plateforme WeChat Dialog Open</h3>
            <p>Gérez la base en ligne et branchez le Q&amp;R sur comptes officiels WeChat, mini-programmes, etc.</p>
            <a className={s.textLink} href="https://chatbot.weixin.qq.com/login" target="_blank" rel="noreferrer">Accéder à la plateforme <Icon name="external" /></a>
          </article>
          <article className={s.startCard}>
            <div className={s.startLabel}><Image className={s.startBrand} src={`${homeAssets}/brands/tencent-cloud.ico`} alt="Logo Tencent Cloud" width={32} height={32} /><span>Cloud</span></div>
            <h3>Tencent Cloud Lighthouse</h3>
            <p>Déployez WeKnora via un modèle d’application sur votre serveur cloud.</p>
            <a className={s.textLink} href="https://mc.tencent.com/s69nKCVz" target="_blank" rel="noreferrer">Déployer sur Tencent Cloud <Icon name="external" /></a>
          </article>
          <article className={s.startCard}>
            <div className={s.startLabel}><BrandLogo /><span>Auto-hébergement</span></div>
            <h3>Sur votre infrastructure</h3>
            <p>Docker ou Kubernetes, avec vos modèles, stockage et réseau.</p>
            <a className={s.textLink} href={guide("01-getting-started/02-installation")}>Guide d’installation <Icon name="arrow" /></a>
          </article>
        </div>
      </div></section>
      <CompanyTrust />
      <CompanyBooking />
      <CompanyContact />
    </main>
    <footer className={`${s.shell} ${s.footer}`}><a className={s.brand} href="/" aria-label="Accueil Global-IT-SS"><BrandLogo /></a><p>Global-IT-SS · WeKnora MIT · Tencent Open Source</p><CompanyFooterExtras /><nav aria-label="Navigation pied de page"><a href={docs}>Documentation</a><a href="#booking">Rendez-vous</a><a href={repo} target="_blank" rel="noreferrer">WeKnora sur GitHub <Icon name="external" /></a></nav></footer>
  </div>;
}
