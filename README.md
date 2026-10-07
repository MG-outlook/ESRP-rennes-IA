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
# Optionnel : code secret pour franchir la Porte instantanément (démonstration)
PORTE_BYPASS_CODE=<votre code personnel>
```

## Raccourci « Porte » pour les démonstrations

Pour gagner du temps lors d'une présentation, vous pouvez franchir la porte du
Gardien sans dérouler la conversation. Définissez la variable
`PORTE_BYPASS_CODE` (côté serveur uniquement — **pas** de préfixe
`NEXT_PUBLIC_`, le code n'est donc jamais envoyé au navigateur ni visible dans
le bundle), puis, sur la page `/porte`, saisissez ce code dans le champ de
réponse et validez : la porte s'ouvre immédiatement.

- Le code est vérifié côté serveur (`/api/porte-bypass`) par une comparaison à
  temps constant ; vous êtes le seul à le connaître.
- Il n'est **jamais** affiché à l'écran ni enregistré dans la conversation.
- Tant que `PORTE_BYPASS_CODE` n'est pas défini, le raccourci est inactif.
- Toute saisie qui ne correspond pas au code est traitée normalement comme un
  message adressé au Gardien.

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

## Charte graphique

Les tokens de design sont définis dans `app/globals.css` (bloc `@theme`) et s'utilisent comme classes Tailwind (`bg-brand`, `text-ink-2`, `border-line`…). La palette est volontairement restreinte à ces tokens : la palette Tailwind par défaut est désactivée.

- **Couleurs** reprises du logo Campus EPNAK (`public/logo-campus-epnak.png`) : `brand` (bleu, actions, liens, focus), `success` (vert, réussite, terminé), `sky` et `leaf` (décor uniquement, contraste insuffisant pour du texte). Textes : `ink`, `ink-2`, `muted` ; surfaces : `surface`, `line`, `control`. Tous les textes respectent au moins le niveau AA.
- **Typographie** : Atkinson Hyperlegible Next (texte) et Atkinson Hyperlegible Mono (codes, mots de passe, chronos), chargées via `next/font`.
- **Composants CSS** : `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-danger`, `.field` (champs), `.badge` (statuts), `.brand-stripe`.
- **Icônes** : `components/shared/Icon.tsx` (icônes au trait), pas d'emoji dans l'interface.
- **En-têtes** : `TeamHeader` et `BrandLogo` (`components/shared/Brand.tsx`), `AdminHeader` pour les écrans d'animation.

## Documentation

Voir le dossier [`docs/`](./docs) (plan général, plan B jour J, specs).
