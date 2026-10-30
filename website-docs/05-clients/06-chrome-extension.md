# Extension Chrome (assistant de gestion des connaissances)

L’extension Chrome « Assistant de gestion des connaissances » permet d’interroger une base de connaissances depuis la barre latérale d’une page web, de capturer la page courante et d’enregistrer des notes Markdown.

Installez-la depuis le [Chrome Web Store](https://chromewebstore.google.com/detail/jpemjbopikggjlmikmclgbmkhhopjdgd). Elle nécessite une instance WeKnora existante. Le contenu importé est stocké sur l’instance connectée.

<Screenshot
  src="/screenshots/chrome-extension.png"
  caption="Extension Chrome : Q&R dans la barre latérale et capture de contenu"
  hint="Barre latérale ouverte sur une page web (panneau Q&R et sélecteur de base), plus sélection de zone lors de la capture." />

## Fonctionnalités principales {#fonctionnalites-principales}

| Capacité | Description |
| --- | --- |
| Q&R sur bases de connaissances | Panneau de conversation dans la barre latérale, bascule entre plusieurs bases ; modes rapide / approfondi / précis pour questionner sans quitter la navigation |
| Capture web | Enregistre l’URL, extrait le corps via l’IA ou sélection manuelle, écrit dans une base choisie |
| Notes Markdown | Éditeur intégré pour enregistrer du contenu en base |
| Raccourcis | Raccourcis personnalisables pour poser une question, ouvrir la barre latérale, etc. |

## Installation et connexion {#installation-et-connexion}

Consultez « Paramètres → Intégrations de publication → Extension Chrome » pour le guide et copiez l’URL API de l’instance. Étapes :

1. **Obtenir les identifiants API** : dans « Paramètres → Intégrations de publication → Intégration API », copiez la clé API et l’URL API (le bouton « Ouvrir les infos API » du guide y mène). Créez une clé dédiée et restreignez les capacités si besoin (au minimum recherche et ingestion ; voir le chapitre clés API dans [Espace, utilisateurs et authentification](../03-features/01-tenant-auth.md)) ;
2. **Port fixe (desktop recommandé)** : avec WeKnora Desktop, fixez un port dans la page « Intégration API » (ex. 37841). Sinon le port change à chaque lancement et l’extension ne se connecte plus ;
3. **Installer l’extension** : depuis le Chrome Web Store ;
4. **Connexion dans l’extension** : ouvrez les paramètres, mode « Entreprise / développeur », saisissez URL API et clé API.

Après connexion, listez les bases et lancez une question pour valider identifiants et réseau.

## Dépannage

| Symptôme | Points à vérifier |
| --- | --- |
| Impossible de se connecter | L’URL API est-elle joignable depuis la machine du navigateur (adresse conteneur, `localhost` sur déploiement distant) ; port fixe en desktop |
| 401 / 403 | Clé révoquée ; capacités couvrant recherche et ingestion ; si la clé est limitée à certaines bases, la cible est-elle autorisée |
| Rien en base après capture | Liste des documents et statut d’analyse ; `processing` = en cours ; détail de l’échec sur la fiche document |

## Documentation associée {#documentation-associee}

- Identifiants et capacités : [Espace, utilisateurs et authentification](../03-features/01-tenant-auth.md)
- Pipeline d’ingestion : [Pipeline documentaire](../02-architecture/03-document-pipeline.md)
- Autres intégrations : [Claw Skill](07-claw-skill.md), [CLI](02-cli.md), [Go SDK](03-go-sdk.md)
