# ESRP Rennes IA

Application Next.js située dans `Claude/ESRP-IA/fresque-ia`.

Le fichier `vercel.json` à la racine force Vercel à installer, construire et servir cette application imbriquée afin que la page d'accueil `/` ne soit pas publiée comme un projet vide.

## Déploiement Vercel

Vercel détecte le framework depuis le `package.json` à la racine du dépôt. Les dépendances `next`, `react` et `react-dom` y sont donc déclarées pour éviter l'erreur "No Next.js version detected", tandis que `vercel.json` construit toujours l'application située dans `Claude/ESRP-IA/fresque-ia`.
