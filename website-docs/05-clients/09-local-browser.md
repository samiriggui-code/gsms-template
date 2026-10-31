# Connexion et déploiement du navigateur local

WeKnora connecte le navigateur de l’utilisateur aux conversations en mode raisonnement via le daemon BrowserSkill et l’extension [BrowserSkill](https://github.com/Tencent/BrowserSkill). L’extension prend en charge Chrome et Microsoft Edge (Chromium 125+), sans garantie pour les autres navigateurs Chromium. Le navigateur tourne sur la machine de l’utilisateur, le daemon côté app WeKnora, sans sandbox de skill. La capture web et la Q&R en barre latérale utilisent une autre [extension de gestion des connaissances](06-chrome-extension.md).

## Installation de l’extension

Version **0.3.1 ou supérieure**, installation au choix :

- Chrome : [Chrome Web Store](https://chromewebstore.google.com/detail/hhcmgoofomhgciiibhipgmgkgnoenaoi)
- Edge : [Compléments Edge](https://microsoftedge.microsoft.com/addons/detail/browserskill/emacgiaaaiojkkpkddmmdfhmokgmnikg)
- ZIP fourni : si les stores sont inaccessibles, télécharger « Installation manuelle (secours) » sur la page « Connexion navigateur ». Décompresser, activer le « Mode développeur » dans `chrome://extensions` (Edge : `edge://extensions`), « Charger l’extension non empaquetée ».

Une extension connectée &lt; 0.3.1 affiche une invite de mise à niveau sur « Connexion navigateur ».

## Appairage et utilisation

1. Ouvrir « Boîte à outils → Connexion navigateur ». L’ancien lien « Paramètres → Connexion navigateur » redirige ici.
2. Copier le lien d’appairage à usage unique généré sur la page ; coller dans l’extension « Paramètres de connexion → Connexion distante » et enregistrer.
3. Activer « Navigateur local » dans la zone de saisie du mode raisonnement, puis envoyer la tâche. Un appairage réussi n’active pas automatiquement le navigateur à chaque tour.
4. Le premier appel crée une fenêtre de tâche dédiée ; l’aperçu conversation permet de localiser la page, mettre en pause, reprendre ou terminer la tâche navigateur.

<Screenshot
  src="/screenshots/browser-connection.png"
  caption="Boîte à outils → Connexion navigateur : lien d’appairage, état et installation"
  hint="État en ligne appairé : statut sur l’onglet, infos appareil, zone de lien, entrées Chrome/Edge et « Installation manuelle (secours) », interrupteur « Afficher l’état dans la barre latérale » ; point vert à côté de la boîte à outils." />

L’état de connexion apparaît sur l’onglet « Connexion navigateur » (connecté, hors ligne, non appairé). Appairé, l’icône navigateur à droite de « Boîte à outils » dans la barre latérale indique un point : vert = connecté, orange = hors ligne. Désactiver « Afficher l’état dans la barre latérale » sur la page de connexion (paramètre local au navigateur). La même page permet de définir « Instruction de recherche navigateur » (moteur et URL préférés).

L’autorisation est enregistrée par espace et utilisateur ; plusieurs conversations du même espace partagent l’autorisation appareil mais ont chacune leur tâche. Un espace + utilisateur conserve une autorisation appareil ; activer un nouvel appareil remplace l’ancien.

Le lien d’appairage est valide cinq minutes. Le jeton appareil dure 90 jours, rotation automatique après 30 jours ; un nouveau lien ne déconnecte pas immédiatement l’ancien appareil — remplacement après activation réussie. Révoquer l’appareil, désactiver l’utilisateur ou retirer un membre bloque les usages suivants.

### Intervention humaine et reprise de tâche

La tâche peut agir sur les onglets qu’elle a créés ; dans la fenêtre de tâche, les nouveaux onglets ouverts par clic/touche et validés par la source restent utilisables et sont conservés à la fin. Fenêtres popup et onglets existants empruntés via `tab_borrow`, avec confirmation selon les paramètres du navigateur, rendus via `tab_return`. À la fin : fermeture des pages créées explicitement, restitution des emprunts.

Glisser-déposer dans la fenêtre de tâche n’équivaut pas à une autorisation ; une page non autorisée déjà dans la fenêtre doit être déplacée vers une fenêtre normale puis empruntée. La confirmation d’emprunt requiert une page HTTP(S) dans une fenêtre normale ; page de paramètres extension, nouvel onglet et popup dédiée ne conviennent pas. Si la fenêtre d’origine disparaît après emprunt, la restitution peut créer une fenêtre de secours ; la page rendue n’est pas fermée avec la tâche.

Connexion, CAPTCHA ou étapes d’autorisation passent par `request_help`. Suivre l’aperçu dans le navigateur, confirmer dans l’invite d’aide ; l’agent observe la page et continue. Dire « veuillez vous connecter » dans le chat seul ne crée pas d’invite de reprise. Attente d’aide max cinq minutes ; timeout ou annulation conserve la scène et met en pause.

La pause annule l’appel navigateur en cours sans révoquer l’appairage ; « Continuer » après la fin du tour de l’agent exige encore un message de continuation. Après incident ou redémarrage, les clics/soumissions ne sont pas rejoués automatiquement — vérifier la page après reprise.

Une tâche réussie se termine automatiquement ; conservation possible si l’utilisateur demande de garder la page, aide humaine ou interruption anormale. L’aperçu « Dernière image conservée » signifie l’arrêt du polling, pas la libération du contrôle navigateur. Terminer la tâche navigateur n’arrête pas toute la conversation.

## Déploiement mono-instance

L’image app fournie inclut daemon, ZIP d’extension et licence, chemins prédéfinis ; le Nginx frontend gère le WebSocket. Mettre à jour app, frontend et l’extension côté utilisateur ensemble.

Build natif à la racine du dépôt :

```bash
./scripts/build_browserskill.sh
```

Requiert Git, Node.js, Python 3, Rust/Cargo et un compilateur C ; CMake sur Linux. Version des sources : `scripts/browserskill-release.json`, build amont sans patch, sortie `artifacts/browserskill/`. Utiliser le daemon pour l’OS/architecture cible et configurer les chemins réels :

```dotenv
BROWSERSKILL_BINARY=/opt/weknora/browserskill/bsk
BROWSERSKILL_EXTENSION_PATH=/opt/weknora/browserskill/browser-skill-weknora-0.3.1.zip
BROWSERSKILL_MAX_CONNECTIONS=32
```

Par défaut, l’URL WSS d’appairage est dérivée de l’origin de la page courante (port conservé). En cas de passerelle ou chemin spécifique :

```dotenv
BROWSERSKILL_PUBLIC_URL=wss://weknora.example.com/api/v1/local-browser/extension
```

WS localhost en local ; WSS de confiance requis à distance. CA d’entreprise possible en intranet. `BROWSERSKILL_BINARY=` vide désactive la capacité ; après changement Docker : `docker compose up -d app frontend`.

Extension et daemon fournis doivent être mis à niveau ensemble (extension ≥ 0.3.1, store ou ZIP). Écraser le dossier décompressé et recharger préserve l’ID extension ; réinstallation avec nouvel ID → ré-appairage. Conserver `BrowserSkill-LICENSE` à la distribution.

## Multi-réplicas et proxy d’entrée

Toutes les apps partagent la base ; autorisations appareil, baux de connexion et marqueurs d’interruption sont persistés. Chaque app démarre un daemon partagé à la demande ; les autres réplicas délèguent via RPC interne signé au nœud qui détient la connexion extension.

```dotenv
# Différent par réplica, doit pointer directement vers le nœud, pas le load balancer
BROWSERSKILL_INTERNAL_URL=http://10.0.0.12:8080
# Identique pour tous les réplicas, secret aléatoire ≥ 32 caractères
BROWSERSKILL_CLUSTER_SECRET=<shared-random-secret>
```

Kubernetes : adresse directe via IP de pod. Ne pas remplacer une base partagée par des SQLite par réplica. HTTP interne pour réseau isolé de confiance ; HTTPS + certificats si confidentialité du transport requise.

Le proxy d’entrée doit :

- Transmettre l’Upgrade WebSocket pour `/api/v1/local-browser/extension` et le POST `/authorize`.
- Interdire l’accès public à `/api/v1/local-browser/internal` (appareils app uniquement). Le frontend fourni refuse déjà ce chemin ; idem si app ou Ingress custom exposés directement.
- Éviter de journaliser Authorization, Sec-WebSocket-Protocol et corps des requêtes d’autorisation.

Bail de connexion 45 s, renouvellement toutes les 10 s ; reprise après panne de nœud liée à l’expiration du bail et au backoff de reconnexion extension. Après restauration du service, vérifier l’état de la tâche ; pas de rejouage automatique d’actions au résultat inconnu.

## Dépannage et validation

| Symptôme | Piste |
| --- | --- |
| Pas de téléchargement extension ou capacité indisponible | Chemins daemon/extension, permissions d’exécution, architecture, version image app |
| Version extension trop basse | Mettre à niveau ≥ 0.3.1 (store ou ZIP), écraser le dossier décompressé et recharger |
| Auth OK mais échec WSS | URL/port public, certificat de confiance, Upgrade WebSocket du proxy |
| Appareil connecté mais tâche inactive | Interrupteur du tour, pause, attente emprunt d’onglet ou aide humaine |
| Pas d’invite d’aide humaine | `request_help` dans la trace ; aide humaine désactivée dans l’extension |
| Échec après changement de réplica | Base partagée, adresses directes nœuds, secret partagé, politique réseau |
| Aperçu bloqué | Page masquée, image conservée, timeout CDP dans l’extension ; aperçu = captures basse fréquence, pas vidéo |

La limite par défaut 32 protège les appareils actifs par nœud, sans garantie de débit. Valider appairage, reconnexion, révocation, aide humaine et routage inter-réplicas sur le cluster cible ; surveiller CPU/RSS daemon, trafic captures, latence RPC et temps de reconnexion. Tests extension : `internal/browserskill/extension_test.go` avec profil navigateur de test isolé.
