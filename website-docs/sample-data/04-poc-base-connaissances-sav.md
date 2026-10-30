# Dossier technique — POC base de connaissances SAV

**Code projet** : Nova-KB-POC  
**Version** : 0.3 (brouillon)  
**Auteur** : Zhang Ming (R&D)  
**Relecteurs** : Chen Hao (produit), Zhao Lei (QA)  
**Dernière mise à jour** : 2024-01-18

## 1. Contexte et objectifs

Le SAV NovaTech traite ~400 tickets installation / dépannage par jour. La recherche Confluence renvoie des paragraphes sans phrase prête à envoyer au client.

Objectifs du POC :

1. Importer manuels, comptes rendus, FAQ internes ;
2. Questions en langage naturel → réponse + **source traçable** ;
3. Démo intranet en 4 semaines pour la revue mi-Q1.

## 2. Architecture

```text
[Sources]  Export Confluence / Markdown / PDF manuels
      ↓
[WeKnora]  docreader → découpage → recherche hybride vecteur + BM25
      ↓
[Modèles]  Embedding : bge-m3 local
            LLM : passerelle API groupe → DeepSeek-V3
      ↓
[Accès]    iframe dans l’outil tickets (phase 2)
```

### 2.1 Rôles

| Rôle | Nom | Mission |
| --- | --- | --- |
| Responsable technique | Zhang Ming | Déploiement, pipeline corpus, tuning retrieval |
| Produit | Li Wei | Priorités, banque de validation |
| QA | Zhao Lei | 100 questions de recette, métriques |
| Sponsor | Chen Hao | Ressources, périmètre |

### 2.2 Lien avec le hub domotique

Corpus initial centré sur le **hub domotique Pro** (*Manuel produit — Hub domotique Pro*), complété par le *Compte rendu de réunion produit — planification Q1 2024* (jalons, responsables) pour les questions « qui » / « quand ».

## 3. Corpus (premier lot)

| # | Document | Format | Chunks estimés |
| --- | --- | --- | --- |
| 1 | Manuel produit — Hub domotique Pro | Markdown / PDF | 40 |
| 2 | Compte rendu planification Q1 2024 | Markdown | 25 |
| 3 | Manuel employé — remboursements (contexte SAV terrain) | Markdown | 30 |
| 4 | Top 50 FAQ tickets | Import Excel | 50 |

**~145 unités de connaissance**, minimum pour la démo intranet du 1er mars.

## 4. Stratégie de recherche

- **Par défaut** : hybride vecteur + BM25, fusion RRF, Top-5 au LLM.
- **Option** : rerank `bge-reranker-v2-m3` pour homonymes.
- **Hors scope POC** : graphe (Neo4j absent), génération Wiki auto.

### 4.1 Découpage (recommandé)

| Paramètre | Valeur | Note |
| --- | --- | --- |
| chunk_size | 512 | Aligné sur paragraphes manuel |
| chunk_overlap | 64 | Contexte tableaux |
| Parent-enfant | activé | Hit enfant, génération sur parent |

## 5. Exemples de recette

| Question | Points attendus | Source attendue |
| --- | --- | --- |
| Nombre max d’appareils sur hub Pro ? | 256, recommandation ≤ 120 | Manuel produit · specs |
| Date d’acceptation POC KB Q1 ? | 2024-03-01 intranet | Compte rendu Q1 |
| Plafond hôtel tier 1 ? | 600 ¥ / nuit | Manuel employé · voyage |
| Version Matter visée ? | Firmware 3.5, grise fin mars | Compte rendu Q1 |
| Responsable POC KB SAV ? | Zhang Ming | CR / ce dossier |

Zhao Lei étend à 100 questions officielles.

## 6. Risques

1. **Corpus obsolète** : manuel v2.1 vs v2.2 imminent → rôle « owner corpus », revue mensuelle Li Wei.
2. **Hallucinations** : prompt imposant « répondre uniquement d’après les citations ; sinon je ne sais pas ».
3. **Permissions** : tenant unique en POC ; production = ACL par région SAV.

## 7. Jalons

| Date | Livrable |
| --- | --- |
| 2024-01-20 | Environnement WeKnora + 3 Markdown importés |
| 2024-02-01 | FAQ Excel, tuning hybride + rerank |
| 2024-02-05 | Démo revue mi-parcours |
| 2024-03-01 | Rapport sur 100 questions |
