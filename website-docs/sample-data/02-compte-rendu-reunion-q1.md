# Compte rendu de réunion produit — planification Q1 2024

**Sujet** : revue des priorités Q1 — gamme domotique  
**Date** : 2024-01-15, 14:00–16:30  
**Lieu** : salle Wutong, 3e ét., bâtiment A, siège  
**Rédaction** : Li Wei (opérations produit)

## Participants

| Nom | Département | Rôle |
| --- | --- | --- |
| Chen Hao | Produit | Directeur produit |
| Zhang Ming | R&D | Responsable base de connaissances et module IA |
| Wang Xue | Design | Responsable UX |
| Zhao Lei | QA | Responsable tests |
| Liu Yang | Ventes | Directeur ventes Est de la Chine |

## 1. Objectifs Q1

1. **Firmware hub Pro 3.5** : certification Matter 1.2, release grise fin mars.
2. **NovaHome App 4.0** : refonte liste d’appareils et éditeur de scénarios, bêta interne mi-février.
3. **Assistant connaissances entreprise** : RAG interne pour le SAV (installation / dépannage), POC porté par l’équipe Zhang Ming.

## 2. Priorités fonctionnelles (MoSCoW)

| Priorité | Fonctionnalité | Responsable | Échéance |
| --- | --- | --- | --- |
| Must | Correctifs stabilité pont Matter | Groupe hardware | 2024-02-01 |
| Must | Refonte éditeur de scénarios (drag-and-drop) | Wang Xue | 2024-02-15 |
| Must | POC base connaissances SAV en intranet | Zhang Ming | 2024-03-01 |
| Should | Reconnaissance vocale offline (pack local) | Groupe voix | 2024-03-15 |
| Could | Rapport hebdo consommation énergétique | Data | reporté Q2 |

## 3. Décisions clés

### 3.1 Périmètre POC base de connaissances SAV

- **Corpus initial** : manuels produit, guides d’installation, Top 50 FAQ tickets (~200 documents).
- **Critères d’acceptation** : 100 questions SAV aléatoires, taux de hit Top-3 ≥ 85 %, réponses avec lien source obligatoire.
- **Stack** : instance WeKnora privée, embedding local, LLM via passerelle API groupe.
- **Responsables** : Zhang Ming (tech) ; Li Wei (produit).

### 3.2 Principes App 4.0

- Liste d’appareils par **pièce** par défaut, bascule « par type » en un clic.
- Édition de scénarios : cartes + timeline plutôt que formulaires, pour réduire la courbe d’apprentissage.

### 3.3 Retours ventes

Liu Yang : clients Est de la Chine insistent sur **disponibilité sans réseau** et **cascade multi-hubs** (villas). Faisabilité cascade en pré-étude Q2 ; ce trimestre : note de faisabilité uniquement.

## 4. Risques et dépendances

| Risque | Impact | Atténuation |
| --- | --- | --- |
| Planning certification Matter serré | Retard firmware | Soumettre pré-certification 2 semaines plus tôt |
| Qualité corpus SAV inégale | Précision Q&R insuffisante | Échantillonnage et annotation par QA, revue hebdo |
| Limitation débit passerelle API | Démo POC lente | Quota dédié, tenant démo isolé |

## 5. Actions

- [ ] Zhang Ming : environnement WeKnora + premier import corpus avant le 20 jan. (ressources approuvées par Chen Hao)
- [ ] Wang Xue : prototype haute fidélité éditeur de scénarios avant le 25 jan.
- [ ] Li Wei : e-mail hebdo d’avancement POC chaque vendredi
- [ ] Zhao Lei : Excel FAQ Top 50 nettoyé avant le 1er fév.

## 6. Prochaine réunion

- **Date** : 2024-02-05, 14:00  
- **Ordre du jour** : retours bêta App 4.0, revue mi-parcours POC base de connaissances
