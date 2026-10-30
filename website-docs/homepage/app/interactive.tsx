"use client";
import { BrandLockup, BrandLogo } from "./brand-logo";
import { useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./ui";
import { getThemeSnapshot, subscribeToTheme, toggleTheme } from "./theme";
import { siteNavigation, proAppUrl, headerIcons, homeAssets } from "../../shared/header";
import s from "./home.module.css";
const productFilms = [
  {
    id: "v090",
    label: "Sortie v0.9.0",
    title: "Assistant de travail v0.9.0",
    summary: "Assistant WeKnora, collaboration multi-agents, automatisations et permissions",
    duration: "02:45",
    durationLabel: "2 min 45 s",
    quality: "1080P · 60 FPS",
    audio: "Voix et sous-titres en anglais",
    source: "/docs/videos/weknora-v0.9.0-en.mp4",
    original: "https://github.com/user-attachments/assets/de0e490a-e738-405e-bb3a-64b63edd7278",
    poster: "/docs/videos/weknora-v0.9.0-poster.png",
  },
  {
    id: "overview",
    label: "Vue d’ensemble du produit",
    title: "Vue d’ensemble WeKnora",
    summary: "Question-réponse, agents et Wiki",
    duration: "02:25",
    durationLabel: "2 min 25 s",
    quality: "1080P",
    audio: "Voix anglaise / sous-titres EN-ZH",
    source: "https://github.com/user-attachments/assets/2819598d-3140-4623-814a-8162a22b653c",
    original: "https://github.com/user-attachments/assets/2819598d-3140-4623-814a-8162a22b653c",
    poster: `${homeAssets}/product/agent-chat.png`,
  },
];

function HeaderIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={headerIcons[name]} /></svg>;
}
function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);
  const label = dark ? "Passer en mode clair" : "Passer en mode sombre";
  return <button className="wk-theme-toggle" type="button" role="switch" aria-checked={dark} aria-label={label} title={label} onClick={toggleTheme}><HeaderIcon name={dark ? "moon" : "sun"} /></button>;
}
export function Header() {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  return <header className="wk-header" onKeyDown={event => { if (event.key === "Escape" && open) { setOpen(false); menu.current?.focus(); } }}>
    <div className="wk-header-inner">
      <a className="wk-brand" href="/" target="_self" aria-label="Accueil Global-IT-SS"><BrandLogo priority /><BrandLockup /></a>
      <nav id="main-navigation" className={`wk-navigation ${open ? "is-open" : ""}`} aria-label="Navigation principale" onClick={() => setOpen(false)}>
        {siteNavigation.map(item => {
          if (item.children?.length) {
            return (
              <div key={item.href} className="wk-nav-menu">
                <a href={item.href}>{item.label}{item.badge && <span className="wk-new-label">{item.badge}</span>}</a>
                <button type="button" className="wk-nav-caret" aria-label={`Rubrique ${item.label}`}><HeaderIcon name="chevron" /></button>
                <div className="wk-nav-dropdown">
                  {item.children.map(child => <a key={child.href} href={child.href}>{child.label}</a>)}
                </div>
              </div>
            );
          }
          return <a key={item.href} href={item.href}>{item.label}{item.badge && <span className="wk-new-label">{item.badge}</span>}</a>;
        })}
      </nav>
      <ThemeToggle />
      <a className="wk-header-github" href={proAppUrl} target="_blank" rel="noreferrer" title="Espace pro"><HeaderIcon name="external" /><span>Espace pro</span></a>
      <button ref={menu} type="button" className="wk-menu-toggle" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}><HeaderIcon name={open ? "close" : "menu"} /></button>
    </div>
  </header>;
}
export function ProductVideo() {
  const player = useRef<HTMLVideoElement>(null);
  const [selected, setSelected] = useState(0);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const film = productFilms[selected];
  function play() {
    setStarted(true);
    const video = player.current;
    if (video) {
      video.src = film.source;
      video.play().catch(() => { /* Keep native controls available when another playback gesture is required. */ });
      video.focus();
    }
  }
  return <figure id="demo" className={s.videoFigure}>
    <div className={s.videoTop}>
      <div className={s.videoChoices} role="group" aria-label="Choisir une vidéo de démonstration">
        {productFilms.map((entry, index) => <button key={entry.id} type="button" aria-label={entry.title} aria-pressed={selected === index} aria-controls="product-video-stage" onClick={() => {
          if (index === selected) return;
          const video = player.current;
          if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
          setSelected(index);
          setStarted(false);
          setFailed(false);
        }}>{entry.label}</button>)}
      </div>
      <span className={s.videoMeta}>{film.duration}<span className={s.videoQuality}> / {film.quality}</span></span>
    </div>
    <div id="product-video-stage" className={s.videoStage}>
      <video key={film.id} ref={player} controls={started} playsInline preload="none" poster={film.poster} aria-label={`${film.title}, ${film.audio}`} aria-describedby="video-caption" tabIndex={started ? 0 : -1} onError={() => setFailed(true)} />
      {!started && <button className={s.videoCover} onClick={play} aria-label={`Lire la vidéo ${film.title}, ${film.durationLabel}`}><span className={s.playCircle}><Icon name="play" /></span><span className={s.videoCoverHint}>Lecture · {film.durationLabel}</span></button>}
      {failed && <div className={s.videoError} role="status"><p>Impossible de charger la vidéo pour le moment</p><a href={film.original} target="_blank" rel="noreferrer">Ouvrir la vidéo originale sur GitHub <Icon name="external" /></a></div>}
    </div>
    <figcaption id="video-caption" className={s.videoCaption}><span>{film.summary}</span><a href={film.original} target="_blank" rel="noreferrer">{film.audio} <Icon name="external" /></a></figcaption>
  </figure>;
}
