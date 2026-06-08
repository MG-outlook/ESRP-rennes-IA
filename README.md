# ESRP Rennes IA

Application Next.js (App Router, TypeScript, Tailwind v4) pour la fresque IA de l'ESRP Rennes.

L'application se trouve désormais à la **racine du dépôt** (auparavant imbriquée dans `Claude/ESRP-IA/fresque-ia`). Vercel détecte donc automatiquement le framework Next.js, sans `vercel.json` ni `package.json` d'enrobage.

## Développement

```bash
npm install
npm run dev
```

L'application démarre sur http://localhost:3000.

## Variables d'environnement

Créer un fichier `.env.local` à la racine :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<projet>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé anon>
# Optionnel : repli pour la connexion équipe si l'auth anonyme est désactivée
SUPABASE_SERVICE_ROLE_KEY=<clé service role>
```

## Connexion équipe

Les participants rejoignent via `/join?code=XXXX` (code à 4 chiffres). Le flux :

1. `POST /api/team/join` tente d'abord une session **anonyme** Supabase (`signInAnonymously`).
2. En repli, si `SUPABASE_SERVICE_ROLE_KEY` est défini, une session équipe est créée via le service role.
3. La RPC `join_team(p_code)` enregistre la session dans `team_sessions` et redirige vers `/porte`.

> **Important :** pour que la connexion fonctionne en production, l'une de ces deux conditions doit être remplie côté Supabase :
> - **Anonymous sign-ins activé** (Authentication → Sign In / Providers → Anonymous), recommandé ; ou
> - `SUPABASE_SERVICE_ROLE_KEY` défini sur Vercel **et** le provider Email activé.

## Scripts utiles

- `scripts/bootstrap-workshop.ts` — génère les codes équipes et réinitialise l'état de l'atelier.
- `scripts/warmup-functions.ts` — préchauffe les fonctions.
- `scripts/load-test.ts` — test de charge.

## Documentation

Voir le dossier [`docs/`](./docs) (plan général, plan B jour J, specs).
