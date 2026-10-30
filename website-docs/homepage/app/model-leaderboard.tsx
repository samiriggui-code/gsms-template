"use client";
import { useEffect, useRef } from "react";
import { Header } from "./interactive";

function paintMetricBars(root: ParentNode) {
  root.querySelectorAll("tbody[data-bar-col]").forEach((tbody) => {
    const cells = Array.from(tbody.querySelectorAll<HTMLElement>("td.metric[data-v]"));
    if (!cells.length) return;
    const vals = cells.map((cell) => parseFloat(cell.dataset.v || "0"));
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const span = max - min || 1;
    cells.forEach((cell) => {
      const bar = cell.querySelector<HTMLElement>(".bar i");
      if (!bar) return;
      const pct = 12 + ((parseFloat(cell.dataset.v || "0") - min) / span) * 88;
      bar.style.width = `${pct.toFixed(1)}%`;
    });
  });
}

function scrollToSection(behavior: ScrollBehavior) {
  const id = window.location.hash.replace(/^#/, "");
  if (!id) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : behavior;
  document.getElementById(id)?.scrollIntoView({ behavior: motion, block: "start" });
}

export function ModelLeaderboard() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    paintMetricBars(root);
    const cleanups: Array<() => void> = [];
    root.querySelectorAll<HTMLElement>("[data-tabs]").forEach((bar) => {
      const onClick = (event: Event) => {
        const btn = (event.target as HTMLElement).closest<HTMLElement>(".tab");
        if (!btn) return;
        bar.querySelectorAll(".tab").forEach((tab) => {
          tab.setAttribute("aria-selected", String(tab === btn));
        });
        const group = bar.dataset.tabs;
        root.querySelectorAll(`.panel[data-group="${group}"]`).forEach((panel) => {
          (panel as HTMLElement).hidden = panel.id !== btn.dataset.panel;
        });
      };
      bar.addEventListener("click", onClick);
      cleanups.push(() => bar.removeEventListener("click", onClick));
    });
    const onHash = () => scrollToSection("smooth");
    window.addEventListener("hashchange", onHash);
    scrollToSection("auto");
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  return (
    <div className="wk-models" ref={rootRef}>
      <a className="skip-link" href="#models-main">Aller au contenu</a>
      <Header />
      <div id="models-main">
<header className="hero">
  <div className="wrap hero-in">
    <h1>Classement des modèles</h1>
    <p className="lead">
      Sur les mêmes jeux de données et paramètres, comparaison des performances <strong>Chat</strong>, <strong>Embed</strong> et <strong>Rerank</strong>, avec classements par métrique.
    </p>
  </div>
</header>

<main className="wrap">

  {/* ================= 1. Chat ================= */}
  <section id="llm">
    <div className="sec-head">
      <span className="sec-idx">01</span>
      <h2>LLM</h2>
      <span className="sec-sub">Recherche et rerank fixes — seul le modèle Chat varie</span>
    </div>
    <div className="tabs" role="tablist" data-tabs="chat">
      <button className="tab" role="tab" aria-selected="true" data-panel="chat-agent">Raisonnement agent</button>
      <button className="tab" role="tab" aria-selected="false" data-panel="chat-knowledge">Q&amp;R rapide</button>
    </div>

    {/* 1.1 */}
    <div className="panel" id="chat-agent" data-group="chat">
      <div className="card">
        <div className="card-head">
          <h3>Raisonnement agent</h3>
          <span className="tag key">Tri : score composite 6:3:1</span>
        </div>
        <div className="card-body">
          <div className="scroll">
            <table>
              <thead><tr>
                <th className="rank">#</th><th>Chat</th><th>Think Effort</th>
                <th className="num metric">Score composite</th><th className="num">correctness</th><th className="num">completeness</th><th className="num">constraint</th>
                <th className="num">Taux hit corpus</th><th className="num">Corpus moy.</th><th className="num">P50 itérations</th><th className="num">P50 tokens</th>
              </tr></thead>
              <tbody data-bar-col="2">
                <tr className="lead-row"><td><span className="rk top">1</span></td><td className="model">Grok 4.7</td><td className="dim">défaut (high)</td><td className="metric" data-v="4.23"><span className="v">4.23</span><span className="bar"><i></i></span></td><td className="num">4.04</td><td className="num">4.41</td><td className="num">4.80</td><td className="num">95.19%</td><td className="num">3.69</td><td className="num">4</td><td className="num">344</td></tr>
                <tr className="lead-row"><td><span className="rk top2">2</span></td><td className="model">GPT-6 Astra</td><td className="dim">défaut (medium)</td><td className="metric" data-v="4.04"><span className="v">4.04</span><span className="bar"><i></i></span></td><td className="num">3.95</td><td className="num">3.93</td><td className="num">4.88</td><td className="num">85.19%</td><td className="num">1.76</td><td className="num">4</td><td className="num">217</td></tr>
                <tr><td><span className="rk top2">3</span></td><td className="model">Claude Opus 5</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.89"><span className="v">3.89</span><span className="bar"><i></i></span></td><td className="num">3.57</td><td className="num">4.42</td><td className="num">4.16</td><td className="num">94.09%</td><td className="num">4.70</td><td className="num">6</td><td className="num">702</td></tr>
                <tr><td><span className="rk">4</span></td><td className="model">GLM-5.3</td><td className="dim">high</td><td className="metric" data-v="3.85"><span className="v">3.85</span><span className="bar"><i></i></span></td><td className="num">3.50</td><td className="num">4.26</td><td className="num">4.70</td><td className="num">90.92%</td><td className="num">2.64</td><td className="num">4</td><td className="num">475</td></tr>
                <tr><td><span className="rk">5</span></td><td className="model">DeepSeek-V4.1-Flash</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.78"><span className="v">3.78</span><span className="bar"><i></i></span></td><td className="num">3.45</td><td className="num">4.30</td><td className="num">4.15</td><td className="num">92.93%</td><td className="num">3.26</td><td className="num">4</td><td className="num">654</td></tr>
                <tr><td><span className="rk">6</span></td><td className="model">GLM-5.3-Flash</td><td className="dim">high</td><td className="metric" data-v="3.75"><span className="v">3.75</span><span className="bar"><i></i></span></td><td className="num">3.35</td><td className="num">4.26</td><td className="num">4.61</td><td className="num">87.81%</td><td className="num">2.47</td><td className="num">4</td><td className="num">507</td></tr>
                <tr><td><span className="rk">7</span></td><td className="model">Hunyuan-3</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.74"><span className="v">3.74</span><span className="bar"><i></i></span></td><td className="num">3.39</td><td className="num">4.19</td><td className="num">4.55</td><td className="num">88.30%</td><td className="num">2.74</td><td className="num">4</td><td className="num">574</td></tr>
                <tr><td><span className="rk">8</span></td><td className="model">Hunyuan-4-preview</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.72"><span className="v">3.72</span><span className="bar"><i></i></span></td><td className="num">3.30</td><td className="num">4.39</td><td className="num">4.22</td><td className="num">94.82%</td><td className="num">4.04</td><td className="num">8</td><td className="num">696</td></tr>
                <tr><td><span className="rk">9</span></td><td className="model">Qwen3.8-Flash-Next</td><td className="dim">défaut (xhigh)</td><td className="metric" data-v="3.69"><span className="v">3.69</span><span className="bar"><i></i></span></td><td className="num">3.30</td><td className="num">4.29</td><td className="num">4.26</td><td className="num">92.81%</td><td className="num">3.69</td><td className="num">6</td><td className="num">601</td></tr>
                <tr><td><span className="rk">10</span></td><td className="model">Gemini-3.8-Flash</td><td className="dim">défaut (medium)</td><td className="metric" data-v="3.62"><span className="v">3.62</span><span className="bar"><i></i></span></td><td className="num">3.23</td><td className="num">4.05</td><td className="num">4.72</td><td className="num">86.17%</td><td className="num">2.08</td><td className="num">3</td><td className="num">391</td></tr>
                <tr><td><span className="rk">11</span></td><td className="model">GPT-5.6 Sol</td><td className="dim">défaut (medium)</td><td className="metric" data-v="3.59"><span className="v">3.59</span><span className="bar"><i></i></span></td><td className="num">3.26</td><td className="num">3.81</td><td className="num">4.89</td><td className="num">85.37%</td><td className="num">2.00</td><td className="num">4</td><td className="num">225</td></tr>
              </tbody>
            </table>
          </div>
          <div className="note">
            <strong>Recommandations</strong>
            <ul>
              <li><strong>Qualité : Grok 4.7</strong> — meilleur score composite, réponses plus fidèles à la base.</li>
              <li><strong>Open source : GLM-5.3</strong> — 4ᵉ au composite, peu d’itérations et volume de tokens modéré.</li>
            </ul>
          </div>
          <dl className="kv">
            <div><dt>correctness</dt><dd><b>Les affirmations sont-elles étayées par les preuves ?</b></dd></div>
            <div><dt>completeness</dt><dd><b>Les sous-questions clés sont-elles couvertes ?</b></dd></div>
            <div><dt>constraint</dt><dd><b>Les contraintes explicites sont-elles respectées ?</b></dd></div>
            <div><dt>Jeu de données</dt><dd><b>Benchmark WeKnora</b></dd></div>
            <div><dt>Modèle juge</dt><dd><b>GPT-6 Astra</b></dd></div>
            <div><dt>Découpage</dt><dd><code>chunk_size=1000</code>, <code>chunk_overlap=200</code></dd></div>
            <div><dt>Embed</dt><dd><b>nvidia/Nemotron-3-Embed-8B-BF16</b></dd></div>
            <div><dt>Rerank</dt><dd><b>Qwen/Qwen3-Reranker-8B</b></dd></div>
            <div><dt>Paramètres de recherche</dt><dd><code>embedding_top_k=50</code>, <code>vector_threshold=0.27</code>, <code>rerank_top_k=8</code>, <code>rerank_threshold=0.3</code>, <code>keyword_threshold=0.3</code></dd></div>
          </dl>
        </div>
      </div>
    </div>

    {/* 1.2 */}
    <div className="panel" id="chat-knowledge" data-group="chat" hidden>
      <div className="card">
        <div className="card-head">
          <h3>Q&amp;R rapide</h3>
          <span className="tag key">Tri : score composite 6:3:1</span>
        </div>
        <div className="card-body">
          <div className="scroll">
            <table>
              <thead><tr>
                <th className="rank">#</th><th>Chat</th><th>Think</th>
                <th className="num metric">Score composite</th><th className="num">correctness</th><th className="num">completeness</th><th className="num">constraint</th>
                <th className="num">P50 tokens</th>
              </tr></thead>
              <tbody data-bar-col="2">
                <tr className="lead-row"><td><span className="rk top">1</span></td><td className="model">GPT-6 Astra</td><td className="dim">défaut (medium)</td><td className="metric" data-v="4.20"><span className="v">4.20</span><span className="bar"><i></i></span></td><td className="num">4.37</td><td className="num">3.75</td><td className="num">4.50</td><td className="num">186</td></tr>
                <tr className="lead-row"><td><span className="rk top2">2</span></td><td className="model">GPT-5.6 Sol</td><td className="dim">défaut (medium)</td><td className="metric" data-v="3.99"><span className="v">3.99</span><span className="bar"><i></i></span></td><td className="num">4.03</td><td className="num">3.74</td><td className="num">4.55</td><td className="num">154</td></tr>
                <tr><td><span className="rk top2">3</span></td><td className="model">Gemini-3.8-Flash</td><td className="dim">défaut (medium)</td><td className="metric" data-v="3.98"><span className="v">3.98</span><span className="bar"><i></i></span></td><td className="num">4.00</td><td className="num">3.78</td><td className="num">4.45</td><td className="num">250</td></tr>
                <tr><td><span className="rk">4</span></td><td className="model">Hunyuan-3</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.96"><span className="v">3.96</span><span className="bar"><i></i></span></td><td className="num">4.00</td><td className="num">3.76</td><td className="num">4.32</td><td className="num">357</td></tr>
                <tr><td><span className="rk">5</span></td><td className="model">DeepSeek-V4.1-Flash</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.93"><span className="v">3.93</span><span className="bar"><i></i></span></td><td className="num">3.94</td><td className="num">3.79</td><td className="num">4.26</td><td className="num">378</td></tr>
                <tr><td><span className="rk">6</span></td><td className="model">Hunyuan-4-preview</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.93"><span className="v">3.93</span><span className="bar"><i></i></span></td><td className="num">3.98</td><td className="num">3.80</td><td className="num">4.02</td><td className="num">589</td></tr>
                <tr><td><span className="rk">7</span></td><td className="model">Qwen3.8-Flash-Next</td><td className="dim">défaut (xhigh)</td><td className="metric" data-v="3.88"><span className="v">3.88</span><span className="bar"><i></i></span></td><td className="num">3.86</td><td className="num">3.75</td><td className="num">4.35</td><td className="num">293</td></tr>
                <tr><td><span className="rk">8</span></td><td className="model">GLM-5.3-Flash</td><td className="dim">high</td><td className="metric" data-v="3.85"><span className="v">3.85</span><span className="bar"><i></i></span></td><td className="num">3.76</td><td className="num">3.84</td><td className="num">4.38</td><td className="num">375</td></tr>
                <tr><td><span className="rk">9</span></td><td className="model">GLM-5.3</td><td className="dim">high</td><td className="metric" data-v="3.83"><span className="v">3.83</span><span className="bar"><i></i></span></td><td className="num">3.74</td><td className="num">3.84</td><td className="num">4.38</td><td className="num">391</td></tr>
                <tr><td><span className="rk">10</span></td><td className="model">Grok 4.7</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.82"><span className="v">3.82</span><span className="bar"><i></i></span></td><td className="num">3.80</td><td className="num">3.71</td><td className="num">4.25</td><td className="num">270</td></tr>
                <tr><td><span className="rk">11</span></td><td className="model">Claude Opus 5</td><td className="dim">défaut (high)</td><td className="metric" data-v="3.73"><span className="v">3.73</span><span className="bar"><i></i></span></td><td className="num">3.61</td><td className="num">3.88</td><td className="num">3.98</td><td className="num">604</td></tr>
              </tbody>
            </table>
          </div>
          <div className="note">
            <strong>Recommandations</strong>
            <ul>
              <li><strong>Qualité : GPT-6 Astra</strong> — 1ᵉʳ au score composite.</li>
              <li><strong>Open source : Hunyuan-3</strong> — dans le second peloton au composite.</li>
            </ul>
          </div>
          <dl className="kv">
            <div><dt>correctness</dt><dd><b>Les affirmations sont-elles étayées par les preuves ?</b></dd></div>
            <div><dt>completeness</dt><dd><b>Les sous-questions clés sont-elles couvertes ?</b></dd></div>
            <div><dt>constraint</dt><dd><b>Les contraintes explicites sont-elles respectées ?</b></dd></div>
            <div><dt>Jeu de données</dt><dd><b>Benchmark WeKnora</b></dd></div>
            <div><dt>Modèle juge</dt><dd><b>GPT-6 Astra</b></dd></div>
            <div><dt>Découpage</dt><dd><code>chunk_size=1000</code>, <code>chunk_overlap=200</code></dd></div>
            <div><dt>Embed</dt><dd><b>nvidia/Nemotron-3-Embed-8B-BF16</b></dd></div>
            <div><dt>Rerank</dt><dd><b>Qwen/Qwen3-Reranker-8B</b></dd></div>
            <div><dt>Paramètres de recherche</dt><dd><code>embedding_top_k=50</code>, <code>vector_threshold=0.27</code>, <code>rerank_top_k=8</code>, <code>rerank_threshold=0.3</code>, <code>keyword_threshold=0.3</code></dd></div>
          </dl>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-head">
        <h3>Lecture du classement</h3>
      </div>
      <div className="card-body">
        <dl className="kv">
          <div><dt>Leader en agent ≠ leader en Q&amp;R rapide</dt><dd>La Q&amp;R rapide génère une réponse dans un contexte fixe ; le raisonnement agent teste aussi la planification de recherche, les outils et la fusion des preuves. Les deux modes se complètent : agent pour les questions complexes, Q&amp;R rapide pour les simples.</dd></div>
        </dl>
        <dl className="kv">
          <div><dt>Biais d’auto-évaluation</dt><dd>L’auto-évaluation par GPT-6 Astra favorise ce modèle, mais une re-notation par Qwen3.8-27B reste corrélée (0,80 en Q&amp;R rapide, 0,89 en agent). Le classement indique les pelotons et écarts nets ; les petits écarts de rang méritent plusieurs juges ou une revue aveugle.</dd></div>
        </dl>
        <dl className="kv">
          <div><dt>Intensité de réflexion</dt><dd>Privilégier la configuration par défaut de l’API. Pour GLM, le défaut « max » dépasse souvent la limite de contexte (16 384) — nous avons abaissé d’un cran.</dd></div>
        </dl>
      </div>
    </div>
  </section>

  {/* ================= 2. Embed ================= */}
  <section id="embed">
    <div className="sec-head">
      <span className="sec-idx">02</span>
      <h2>Embed</h2>
      <span className="sec-sub">Recherche vectorielle</span>
    </div>

    <div className="tabs" role="tablist" data-tabs="embed">
      <button className="tab" role="tab" aria-selected="true" data-panel="embed-rerank">2.1 Rappel</button>
      <button className="tab" role="tab" aria-selected="false" data-panel="embed-only">2.2 Classement</button>
    </div>

    {/* 2.1 */}
    <div className="panel" id="embed-rerank" data-group="embed">
      <div className="card">
        <div className="card-head">
          <h3>Rappel</h3>
          <span className="tag key">Tri : Recall@100</span>
          <span className="tag">Cas : embed puis rerank — produit avec modèle de rerank</span>
        </div>
        <div className="card-body">
          <div className="scroll" style={{ marginTop: 0 }}>
            <table>
              <thead><tr>
                <th className="rank">#</th><th>Modèle</th>
                <th className="num metric">Recall@100</th><th className="num">Recall@50</th><th className="num">Recall@10</th>
                <th className="num">retrieve k</th><th className="num">rerank / LLM k</th><th>vector_threshold</th>
              </tr></thead>
              <tbody data-bar-col="2">
                <tr className="lead-row"><td><span className="rk top">1</span></td><td className="model">nvidia/Nemotron-3-Embed-8B-BF16</td><td className="metric" data-v="0.92877"><span className="v">0.92877</span><span className="bar"><i></i></span></td><td className="num">0.91302</td><td className="num">0.85027</td><td className="num">50</td><td className="num">8</td><td className="dim">0.27</td></tr>
                <tr className="lead-row"><td><span className="rk top2">2</span></td><td className="model">tencent/KaLM-Embedding-Gemma3-12B-2511</td><td className="metric" data-v="0.92682"><span className="v">0.92682</span><span className="bar"><i></i></span></td><td className="num">0.90775</td><td className="num">0.82704</td><td className="num">50</td><td className="num">8</td><td className="dim">0.45</td></tr>
                <tr><td><span className="rk top2">3</span></td><td className="model">BAAI/bge-multilingual-gemma2</td><td className="metric" data-v="0.92134"><span className="v">0.92134</span><span className="bar"><i></i></span></td><td className="num">0.89952</td><td className="num">0.83392</td><td className="num">50</td><td className="num">8</td><td className="dim">0.25</td></tr>
                <tr><td><span className="rk">4</span></td><td className="model">nvidia/llama-embed-nemotron-8b</td><td className="metric" data-v="0.91899"><span className="v">0.91899</span><span className="bar"><i></i></span></td><td className="num">0.90133</td><td className="num">0.83465</td><td className="num">50</td><td className="num">8</td><td className="dim">0.28</td></tr>
                <tr><td><span className="rk">5</span></td><td className="model">Qwen/Qwen3-Embedding-8B</td><td className="metric" data-v="0.91704"><span className="v">0.91704</span><span className="bar"><i></i></span></td><td className="num">0.89429</td><td className="num">0.81379</td><td className="num">50–100</td><td className="num">8</td><td className="dim">0.44</td></tr>
                <tr><td><span className="rk">6</span></td><td className="model">infly/inf-retriever-v1</td><td className="metric" data-v="0.91663"><span className="v">0.91663</span><span className="bar"><i></i></span></td><td className="num">0.89984</td><td className="num">0.82624</td><td className="num">50</td><td className="num">8</td><td className="dim">0.52</td></tr>
                <tr><td><span className="rk">7</span></td><td className="model">Octen/Octen-Embedding-8B</td><td className="metric" data-v="0.91484"><span className="v">0.91484</span><span className="bar"><i></i></span></td><td className="num">0.89263</td><td className="num">0.81285</td><td className="num">50</td><td className="num">8</td><td className="dim">0.38</td></tr>
                <tr><td><span className="rk">8</span></td><td className="model">microsoft/harrier-oss-v1-27b</td><td className="metric" data-v="0.91351"><span className="v">0.91351</span><span className="bar"><i></i></span></td><td className="num">0.89578</td><td className="num">0.81882</td><td className="num">50</td><td className="num">8</td><td className="dim">Désactivé / ≤0.50</td></tr>
                <tr><td><span className="rk">9</span></td><td className="model">tencent/WeMM-Embedding-9B</td><td className="metric" data-v="0.91289"><span className="v">0.91289</span><span className="bar"><i></i></span></td><td className="num">0.89092</td><td className="num">0.80677</td><td className="num">50</td><td className="num">8</td><td className="dim">0.41</td></tr>
                <tr><td><span className="rk">10</span></td><td className="model">tencent/WeMM-Embedding-4B</td><td className="metric" data-v="0.91271"><span className="v">0.91271</span><span className="bar"><i></i></span></td><td className="num">0.88344</td><td className="num">0.80074</td><td className="num">50</td><td className="num">8</td><td className="dim">0.41</td></tr>
                <tr><td><span className="rk">11</span></td><td className="model">infly/inf-retriever-v1-1.5b</td><td className="metric" data-v="0.91175"><span className="v">0.91175</span><span className="bar"><i></i></span></td><td className="num">0.88785</td><td className="num">0.81424</td><td className="num">50</td><td className="num">8</td><td className="dim">Désactivé / ≤0.60</td></tr>
                <tr><td><span className="rk">12</span></td><td className="model">Alibaba-NLP/gte-Qwen2-7B-instruct</td><td className="metric" data-v="0.90712"><span className="v">0.90712</span><span className="bar"><i></i></span></td><td className="num">0.87931</td><td className="num">0.80102</td><td className="num">50</td><td className="num">8–10</td><td className="dim">0.44</td></tr>
                <tr><td><span className="rk">13</span></td><td className="model">Qwen/Qwen3-Embedding-4B</td><td className="metric" data-v="0.90702"><span className="v">0.90702</span><span className="bar"><i></i></span></td><td className="num">0.88952</td><td className="num">0.81706</td><td className="num">50</td><td className="num">8</td><td className="dim">0.45</td></tr>
                <tr><td><span className="rk">14</span></td><td className="model">google/embeddinggemma-300m</td><td className="metric" data-v="0.90589"><span className="v">0.90589</span><span className="bar"><i></i></span></td><td className="num">0.88321</td><td className="num">0.81084</td><td className="num">50</td><td className="num">8</td><td className="dim">0.37</td></tr>
                <tr><td><span className="rk">15</span></td><td className="model">codefuse-ai/F2LLM-v2-8B</td><td className="metric" data-v="0.90563"><span className="v">0.90563</span><span className="bar"><i></i></span></td><td className="num">0.88692</td><td className="num">0.79745</td><td className="num">50</td><td className="num">10</td><td className="dim">0.26</td></tr>
                <tr><td><span className="rk">16</span></td><td className="model">microsoft/harrier-oss-v1-0.6b</td><td className="metric" data-v="0.89011"><span className="v">0.89011</span><span className="bar"><i></i></span></td><td className="num">0.86811</td><td className="num">0.78097</td><td className="num">100</td><td className="num">10</td><td className="dim">0.49</td></tr>
                <tr><td><span className="rk">17</span></td><td className="model">BAAI/bge-m3</td><td className="metric" data-v="0.88338"><span className="v">0.88338</span><span className="bar"><i></i></span></td><td className="num">0.85892</td><td className="num">0.77859</td><td className="num">100</td><td className="num">10</td><td className="dim">0.47</td></tr>
                <tr><td><span className="rk">18</span></td><td className="model">Linq-AI-Research/Linq-Embed-Mistral</td><td className="metric" data-v="0.87430"><span className="v">0.87430</span><span className="bar"><i></i></span></td><td className="num">0.84657</td><td className="num">0.75117</td><td className="num">100</td><td className="num">10</td><td className="dim">0.45</td></tr>
                <tr><td><span className="rk">19</span></td><td className="model">jinaai/jina-embeddings-v5-text-small</td><td className="metric" data-v="0.86547"><span className="v">0.86547</span><span className="bar"><i></i></span></td><td className="num">0.84293</td><td className="num">0.76437</td><td className="num">100</td><td className="num">10</td><td className="dim">0.40</td></tr>
                <tr><td><span className="rk">20</span></td><td className="model">intfloat/multilingual-e5-large-instruct</td><td className="metric" data-v="0.83219"><span className="v">0.83219</span><span className="bar"><i></i></span></td><td className="num">0.80373</td><td className="num">0.71529</td><td className="num">100</td><td className="num">10</td><td className="dim">Désactivé</td></tr>
              </tbody>
            </table>
          </div>

          <div className="note">
            <strong>Recommandations</strong>
            <ul>
              <li><strong>nvidia/Nemotron-3-Embed-8B-BF16</strong> — meilleure couverture de rappel, utilisable en recherche directe ou avant rerank.</li>
              <li><strong>tencent/KaLM-Embedding-Gemma3-12B-2511</strong> — couverture proche ; retrieve 50 puis rerank.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    {/* 2.2 */}
    <div className="panel" id="embed-only" data-group="embed" hidden>
      <div className="card">
        <div className="card-head">
          <h3>Classement du rappel</h3>
          <span className="tag key">Tri : NDCG@10</span>
          <span className="tag">Cas : top-k vecteur envoyé directement au LLM, sans rerank</span>
        </div>
        <div className="card-body">

          <div className="scroll" style={{ marginTop: 0 }}>
            <table>
              <thead><tr>
                <th className="rank">#</th><th>Modèle</th>
                <th className="num metric">NDCG@10</th><th className="num">Recall@10</th><th className="num">P@1</th>
                <th className="num">embedding_top_k</th><th>vector_threshold</th>
              </tr></thead>
              <tbody data-bar-col="2">
                <tr className="lead-row"><td><span className="rk top">1</span></td><td className="model">nvidia/Nemotron-3-Embed-8B-BF16</td><td className="metric" data-v="0.80114"><span className="v">0.80114</span><span className="bar"><i></i></span></td><td className="num">0.85027</td><td className="num">0.76872</td><td className="num">5–8</td><td className="dim">0.27</td></tr>
                <tr className="lead-row"><td><span className="rk top2">2</span></td><td className="model">nvidia/llama-embed-nemotron-8b</td><td className="metric" data-v="0.77419"><span className="v">0.77419</span><span className="bar"><i></i></span></td><td className="num">0.83465</td><td className="num">0.73281</td><td className="num">5–8</td><td className="dim">0.28</td></tr>
                <tr><td><span className="rk top2">3</span></td><td className="model">BAAI/bge-multilingual-gemma2</td><td className="metric" data-v="0.77355"><span className="v">0.77355</span><span className="bar"><i></i></span></td><td className="num">0.83392</td><td className="num">0.72855</td><td className="num">5–8</td><td className="dim">0.25</td></tr>
                <tr><td><span className="rk">4</span></td><td className="model">infly/inf-retriever-v1</td><td className="metric" data-v="0.76031"><span className="v">0.76031</span><span className="bar"><i></i></span></td><td className="num">0.82624</td><td className="num">0.71333</td><td className="num">8</td><td className="dim">0.52</td></tr>
                <tr><td><span className="rk">5</span></td><td className="model">microsoft/harrier-oss-v1-27b</td><td className="metric" data-v="0.75208"><span className="v">0.75208</span><span className="bar"><i></i></span></td><td className="num">0.81882</td><td className="num">0.70907</td><td className="num">8</td><td className="dim">Désactivé / ≤0.50</td></tr>
                <tr><td><span className="rk">6</span></td><td className="model">tencent/KaLM-Embedding-Gemma3-12B-2511</td><td className="metric" data-v="0.75097"><span className="v">0.75097</span><span className="bar"><i></i></span></td><td className="num">0.82704</td><td className="num">0.69324</td><td className="num">8</td><td className="dim">0.45</td></tr>
                <tr><td><span className="rk">7</span></td><td className="model">Qwen/Qwen3-Embedding-4B</td><td className="metric" data-v="0.75008"><span className="v">0.75008</span><span className="bar"><i></i></span></td><td className="num">0.81706</td><td className="num">0.70481</td><td className="num">8</td><td className="dim">0.45</td></tr>
                <tr><td><span className="rk">8</span></td><td className="model">google/embeddinggemma-300m</td><td className="metric" data-v="0.75005"><span className="v">0.75005</span><span className="bar"><i></i></span></td><td className="num">0.81084</td><td className="num">0.70724</td><td className="num">8</td><td className="dim">0.37</td></tr>
                <tr><td><span className="rk">9</span></td><td className="model">Octen/Octen-Embedding-8B</td><td className="metric" data-v="0.74746"><span className="v">0.74746</span><span className="bar"><i></i></span></td><td className="num">0.81285</td><td className="num">0.70542</td><td className="num">8</td><td className="dim">0.38</td></tr>
                <tr><td><span className="rk">10</span></td><td className="model">infly/inf-retriever-v1-1.5b</td><td className="metric" data-v="0.74626"><span className="v">0.74626</span><span className="bar"><i></i></span></td><td className="num">0.81424</td><td className="num">0.69629</td><td className="num">8</td><td className="dim">Désactivé / ≤0.60</td></tr>
                <tr><td><span className="rk">11</span></td><td className="model">Qwen/Qwen3-Embedding-8B</td><td className="metric" data-v="0.74496"><span className="v">0.74496</span><span className="bar"><i></i></span></td><td className="num">0.81379</td><td className="num">0.69324</td><td className="num">8–10</td><td className="dim">0.44</td></tr>
                <tr><td><span className="rk">12</span></td><td className="model">tencent/WeMM-Embedding-9B</td><td className="metric" data-v="0.73072"><span className="v">0.73072</span><span className="bar"><i></i></span></td><td className="num">0.80677</td><td className="num">0.67438</td><td className="num">10</td><td className="dim">0.41</td></tr>
                <tr><td><span className="rk">13</span></td><td className="model">tencent/WeMM-Embedding-4B</td><td className="metric" data-v="0.72771"><span className="v">0.72771</span><span className="bar"><i></i></span></td><td className="num">0.80074</td><td className="num">0.67498</td><td className="num">10</td><td className="dim">0.41</td></tr>
                <tr><td><span className="rk">14</span></td><td className="model">Alibaba-NLP/gte-Qwen2-7B-instruct</td><td className="metric" data-v="0.72140"><span className="v">0.72140</span><span className="bar"><i></i></span></td><td className="num">0.80102</td><td className="num">0.66951</td><td className="num">10</td><td className="dim">0.44</td></tr>
                <tr><td><span className="rk">15</span></td><td className="model">codefuse-ai/F2LLM-v2-8B</td><td className="metric" data-v="0.71855"><span className="v">0.71855</span><span className="bar"><i></i></span></td><td className="num">0.79745</td><td className="num">0.66525</td><td className="num">10</td><td className="dim">0.26</td></tr>
                <tr><td><span className="rk">16</span></td><td className="model">BAAI/bge-m3</td><td className="metric" data-v="0.70954"><span className="v">0.70954</span><span className="bar"><i></i></span></td><td className="num">0.77859</td><td className="num">0.65673</td><td className="num">10</td><td className="dim">0.47</td></tr>
                <tr><td><span className="rk">17</span></td><td className="model">microsoft/harrier-oss-v1-0.6b</td><td className="metric" data-v="0.70865"><span className="v">0.70865</span><span className="bar"><i></i></span></td><td className="num">0.78097</td><td className="num">0.65307</td><td className="num">10</td><td className="dim">0.49</td></tr>
                <tr><td><span className="rk">18</span></td><td className="model">jinaai/jina-embeddings-v5-text-small</td><td className="metric" data-v="0.69806"><span className="v">0.69806</span><span className="bar"><i></i></span></td><td className="num">0.76437</td><td className="num">0.64820</td><td className="num">10</td><td className="dim">0.40</td></tr>
                <tr><td><span className="rk">19</span></td><td className="model">Linq-AI-Research/Linq-Embed-Mistral</td><td className="metric" data-v="0.66628"><span className="v">0.66628</span><span className="bar"><i></i></span></td><td className="num">0.75117</td><td className="num">0.60316</td><td className="num">10</td><td className="dim">0.45</td></tr>
                <tr><td><span className="rk">20</span></td><td className="model">intfloat/multilingual-e5-large-instruct</td><td className="metric" data-v="0.63496"><span className="v">0.63496</span><span className="bar"><i></i></span></td><td className="num">0.71529</td><td className="num">0.57091</td><td className="num">10</td><td className="dim">Désactivé</td></tr>
              </tbody>
            </table>
          </div>

          <div className="note">
            <strong>Recommandations</strong>
            <ul>
              <li><strong>nvidia/Nemotron-3-Embed-8B-BF16</strong> — meilleure qualité en tête ; top 5–8 vers le LLM.</li>
              <li><strong>google/embeddinggemma-300m</strong> si ressources limitées — 300M param., NDCG@10 proche de Qwen3-4B.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>


  </section>

  {/* ================= 3. Rerank ================= */}
  <section id="rerank">
    <div className="sec-head">
      <span className="sec-idx">03</span>
      <h2>Rerank</h2>
      <span className="sec-sub">100 candidats du rappel vectoriel fixe — comparaison des modèles de rerank</span>
    </div>
    <div className="card" style={{ marginTop: 22 }}>
      <div className="card-head">
        <h3>Modèles de rerank</h3>
        <span className="tag key">Tri : NDCG@10</span>
      </div>
      <div className="card-body">
        <div className="scroll">
          <table>
            <thead><tr>
              <th className="rank">#</th><th>Modèle</th>
              <th className="num metric">NDCG@10</th><th className="num">P@1</th><th className="num">MRR@10</th><th className="num">Recall@10</th>
            </tr></thead>
            <tbody data-bar-col="2">
              <tr className="lead-row"><td><span className="rk top">1</span></td><td className="model">Qwen/Qwen3-Reranker-8B</td><td className="metric" data-v="0.83609"><span className="v">0.83609</span><span className="bar"><i></i></span></td><td className="num">0.81984</td><td className="num">0.87762</td><td className="num">0.87138</td></tr>
              <tr className="lead-row"><td><span className="rk top2">2</span></td><td className="model">jinaai/jina-reranker-v3.5</td><td className="metric" data-v="0.83271"><span className="v">0.83271</span><span className="bar"><i></i></span></td><td className="num">0.83019</td><td className="num">0.87968</td><td className="num">0.85638</td></tr>
              <tr><td><span className="rk top2">3</span></td><td className="model">nvidia/llama-nemotron-rerank-1b-v2</td><td className="metric" data-v="0.82449"><span className="v">0.82449</span><span className="bar"><i></i></span></td><td className="num">0.81010</td><td className="num">0.87286</td><td className="num">0.86411</td></tr>
              <tr><td><span className="rk">4</span></td><td className="model">BAAI/bge-reranker-v2-gemma</td><td className="metric" data-v="0.81764"><span className="v">0.81764</span><span className="bar"><i></i></span></td><td className="num">0.79732</td><td className="num">0.85972</td><td className="num">0.85650</td></tr>
              <tr><td><span className="rk">5</span></td><td className="model">Qwen/Qwen3-Reranker-0.6B</td><td className="metric" data-v="0.81003"><span className="v">0.81003</span><span className="bar"><i></i></span></td><td className="num">0.78211</td><td className="num">0.84985</td><td className="num">0.85363</td></tr>
              <tr><td><span className="rk">6</span></td><td className="model">BAAI/bge-reranker-v2-m3</td><td className="metric" data-v="0.80751"><span className="v">0.80751</span><span className="bar"><i></i></span></td><td className="num">0.79245</td><td className="num">0.84903</td><td className="num">0.84452</td></tr>
              <tr><td><span className="rk">7</span></td><td className="model">mixedbread-ai/mxbai-rerank-base-v2</td><td className="metric" data-v="0.80574"><span className="v">0.80574</span><span className="bar"><i></i></span></td><td className="num">0.78515</td><td className="num">0.84358</td><td className="num">0.84680</td></tr>
              <tr><td><span className="rk">8</span></td><td className="model">zeroentropy/zerank-2-reranker</td><td className="metric" data-v="0.79841"><span className="v">0.79841</span><span className="bar"><i></i></span></td><td className="num">0.77115</td><td className="num">0.83475</td><td className="num">0.84777</td></tr>
              <tr><td><span className="rk">9</span></td><td className="model">Alibaba-NLP/gte-multilingual-reranker-base</td><td className="metric" data-v="0.78978"><span className="v">0.78978</span><span className="bar"><i></i></span></td><td className="num">0.76019</td><td className="num">0.82483</td><td className="num">0.83848</td></tr>
              <tr><td><span className="rk">10</span></td><td className="model">jinaai/jina-reranker-v2-base-multilingual</td><td className="metric" data-v="0.78093"><span className="v">0.78093</span><span className="bar"><i></i></span></td><td className="num">0.75593</td><td className="num">0.82146</td><td className="num">0.82864</td></tr>
              <tr><td><span className="rk">11</span></td><td className="model">Alibaba-NLP/gte-reranker-modernbert-base</td><td className="metric" data-v="0.71176"><span className="v">0.71176</span><span className="bar"><i></i></span></td><td className="num">0.66586</td><td className="num">0.74086</td><td className="num">0.77675</td></tr>
              <tr><td><span className="rk">12</span></td><td className="model">Qwen/Qwen3-Reranker-4B</td><td className="metric" data-v="0.70408"><span className="v">0.70408</span><span className="bar"><i></i></span></td><td className="num">0.64760</td><td className="num">0.73794</td><td className="num">0.77447</td></tr>
            </tbody>
          </table>
        </div>
        <div className="note">
          <strong>Recommandations</strong>
          <ul>
            <li><strong>Qwen/Qwen3-Reranker-8B</strong> — meilleure qualité de classement pour le rerank.</li>
            <li><strong>jinaai/jina-reranker-v3.5</strong> si ressources limitées — 0,6B param., NDCG proche du leader, bon P@1.</li>
          </ul>
        </div>
        <dl className="kv">
          <div><dt>Embed fixe</dt><dd><b>nvidia/Nemotron-3-Embed-8B-BF16</b></dd></div>
          <div><dt>Pool de candidats</dt><dd>Top 100 Nemotron-3-Embed</dd></div>
          <div><dt>Recall@100</dt><dd><b>0.92877</b></dd></div>
        </dl>
      </div>
    </div>
  </section>

  {/* ================= 4. Dataset ================= */}
  <section id="dataset">
    <div className="sec-head">
      <span className="sec-idx">04</span>
      <h2>Jeu de données</h2>
      <span className="sec-sub">Types de questions et corpus</span>
    </div>
    <div className="card dataset-card" style={{ marginTop: 22 }}>
      <div className="card-body">
        <dl className="dataset-facts">
          <div className="dataset-count">
            <dt>Volume</dt>
            <dd><b>1,6K</b> paires Q/R, <b>40K</b> segments de corpus</dd>
          </div>
          <div>
            <dt>Types de questions</dt>
            <dd>
              <ul>
                <li>Compétences de base</li>
                <li>Détails précis</li>
                <li>Raisonnement multi-sauts</li>
                <li>Contre-intuitif</li>
                <li>Sans réponse</li>
                <li>Négatifs distracteurs</li>
                <li>Versions multiples</li>
                <li>Extraction structurée</li>
              </ul>
            </dd>
          </div>
          <div>
            <dt>Types de corpus</dt>
            <dd>
              <ul>
                <li>Encyclopédies</li>
                <li>Livres</li>
                <li>Actualités</li>
                <li>Vulgarisation</li>
                <li>FAQ</li>
                <li>Articles WeChat</li>
              </ul>
              <span className="dataset-more">et autres sources</span>
            </dd>
          </div>
        </dl>
        <div className="note info dataset-note">
          <strong>Données et protocole bientôt open source</strong>
          Jeu de benchmark, pipeline d’évaluation et résultats additionnels sont en cours de publication ; dépôt et liens de téléchargement seront ajoutés ici.
        </div>
      </div>
    </div>
  </section>

</main>

<footer>
  <div className="wrap foot-in">
    <span>Benchmarks WeKnora</span>
    <span>Données au 2026-10-08</span>
    <span>WeKnora v0.8.0</span>
  </div>
</footer>
      </div>
    </div>
  );
}
