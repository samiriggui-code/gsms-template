# Manuel produit — Hub domotique Pro

**Modèle** : HUB-Pro-2024  
**Version du document** : v2.1  
**Firmware compatible** : ≥ 3.4.0

## 1. Vue d’ensemble

Le hub domotique Pro de NovaTech est le centre IoT domestique de l’entreprise ; il centralise l’éclairage, la climatisation, les stores, les capteurs de sécurité, etc. Les scénarios se pilotent via l’application mobile, un assistant vocal ou l’écran tactile local.

Atouts principaux :

- **Fonctionnement local hors ligne** : les scénarios configurés restent exécutables en LAN sans Internet
- **Multi-protocoles** : Matter, Zigbee 3.0, Wi-Fi et Bluetooth Mesh
- **IA embarquée** : modèle léger reconnaissant des formulations du type « je suis rentré », « mode cinéma »

## 2. Spécifications techniques

| Élément | Valeur |
| --- | --- |
| Processeur | Quad-core ARM Cortex-A55, 1,8 GHz |
| Mémoire / stockage | 4 Go RAM / 32 Go eMMC |
| Sans fil | Wi-Fi 6, Zigbee 3.0, Bluetooth 5.2, Thread |
| Filaire | Ethernet Gigabit ×1, USB-C (debug) ×1 |
| Alimentation | DC 12 V / 2 A, ~8 W en usage typique |
| Température de fonctionnement | 0 ℃ ~ 40 ℃ |
| Appareils max | 256 (≤ 120 recommandé pour la réactivité) |

## 3. Configuration initiale

1. Brancher l’alimentation : voyant bleu clignotant lent = attente de provisioning.
2. Ouvrir NovaHome App → « Ajouter un hub » → scanner le QR sur l’appareil.
3. Suivre l’assistant Wi-Fi ; avec Ethernet, l’étape Wi-Fi est optionnelle.
4. Vérifier le firmware ; mettre à jour avant d’ajouter des périphériques.

> **Attention** : lors du premier provisioning, le téléphone doit être sur le même réseau **2,4 GHz**. Sur un routeur 5 GHz uniquement, activer d’abord le mode 2,4 GHz.

## 4. Exemples de scénarios

### 4.1 « Mode rentrée »

Déclencheurs (l’un suffit) :

- GPS du téléphone entre dans le geofencing « domicile »
- Déverrouillage empreinte sur la porte d’entrée
- Commande vocale « je suis rentré »

Actions :

- Salon : luminosité 70 %, blanc chaud
- Climatisation : 26 ℃ refroidissement (modèle été uniquement)
- Désarmement de l’alarme

### 4.2 « Mode absence »

Déclencheur : tous les téléphones des membres quittent le geofencing pendant plus de 5 minutes.

Actions : extinction des lumières, arrêt climatisation, armement alarme, coupure gaz motorisée (si connectée).

## 5. FAQ

**Q : La voix fonctionne-t-elle si le hub est hors ligne ?**  
R : Avec reconnaissance cloud, sans Internet seuls l’App et l’écran local restent disponibles ; avec un pack vocal local, les commandes de base restent possibles.

**Q : Combien de hubs par compte ?**  
R : Particulier : 3 max ; entreprise : selon contrat, 50 par défaut.

**Q : Garantie ?**  
R : 24 mois sur l’appareil, 12 mois sur les pièces batterie ; exclusion ouverture non autorisée, dommages par l’eau.

## 6. Documents associés

- Câblage et installation : *Guide d’installation matérielle Hub Pro*
- Remboursements et déplacement avec matériel : *Manuel employé (extrait) — remboursements et congés*
- Roadmap Q1 : *Compte rendu de réunion produit — planification Q1 2024*
