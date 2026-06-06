# PLAN.md — Plan d'implémentation Claude Code

> **Projet** : Fresque de l'IA EPNAK — ESRP Rennes — 16 juillet 2026
> **Sprint** : 7 semaines (27 mai → 15 juillet 2026)
> **Mode de travail** : Claude Code en sessions de 1-2 h, jalon par jalon
> **Source de vérité pédagogique** : `docs/01-fiches-defis-v2.md`
> **Source de vérité technique** : ce fichier + `CLAUDE.md`

Ce plan est conçu pour être suivi linéairement. Chaque jalon a un critère de validation explicite. **Ne pas démarrer un jalon avant que le précédent soit validé**.

---

## Boussole produit

Trois principes non-négociables :

1. **Sobriété graphique = message pédagogique.** La plateforme dit, par sa forme, qu'on ne vend pas du beau. On montre de l'efficace. Pas d'animations gratuites, pas d'ombres, pas de gradients. Du blanc, du noir, du gris, un seul accent vert. Typographie grande.
2. **Multi-tenant orchestré.** 10 sessions équipes parallèles + 1 session master qui voit tout et peut intervenir. La pause globale est l'outil pédagogique principal du master pour insérer des débriefs en cours d'animation.
3. **Robustesse > élégance.** Le 16 juillet, ça doit marcher avec un wifi médiocre, des PC hétérogènes, et 60 personnes simultanées. Fallbacks partout, cache pré-généré, mode dégradé prévu.

---

## Charte graphique (à figer en S1)

### Palette
```ts
// tailwind.config.ts
colors: {
  white:   '#FFFFFF',         // fond unique de toute l'application
  black:   '#1A1A1A',         // texte principal — noir légèrement adouci
  green: {
    DEFAULT: '#2D5A3D',       // unique accent — boutons primaires, états actifs
    light:   '#5B8C6B',       // hover, succès léger
  },
  gray: {
    900: '#1A1A1A',           // alias texte
    700: '#4A4A4A',           // texte secondaire, labels
    400: '#B8B8B8',           // bordures
    100: '#F5F5F5',           // fond panneaux secondaires (très parcimonieux)
  },
  red:     '#8B3A3A',         // alerte — usage exceptionnel
}
```

### Typographie
- **Police** : Inter (via `@fontsource/inter`), fallback system-ui
- **Base** : 18 px (1.125 rem) — supérieur au standard pour lisibilité collective
- **H1** : 36 px bold ; **H2** : 28 px bold ; **H3** : 22 px bold
- **Boutons** : 18 px semibold, padding généreux `px-6 py-3`
- **Interlignage** : 1.5 minimum partout

### Composants
- **Bordures** : 1 ou 2 px solide, jamais arrondies (`rounded-none` partout)
- **Boutons** : carrés, fond vert ou bord noir, jamais d'ombre
- **Cartes** : bordure noire 2 px, fond blanc, padding `p-6`
- **Tableaux** : bordures noires, lignes alternées en `gray-100` parcimonieuses
- **Inputs** : bord noir 2 px, focus = bord vert, jamais d'arrondi

### Anti-patterns à interdire
- ❌ `shadow-*`, `bg-gradient-*`, `rounded-*` (autres que `rounded-none`)
- ❌ Emojis dans l'UI principale (sauf indication de catégorie de biais Défi 3)
- ❌ Animations de transition autres que `transition-opacity` sur états de chargement
- ❌ Polices décoratives sauf une seule exception : Document 2 de Camille (police cursive simulant le manuscrit)

---

## Architecture multi-tenant

### Trois rôles distincts d'utilisateur
1. **Équipe** (60 personnes, 10 groupes de 6) — entre par code à 4 chiffres, session anonyme
2. **Master** (Mehdi) — voit le dashboard global, pilote la pause globale, débloque les équipes bloquées
3. **Co-animateur** (Réjane) — accès lecture seule au dashboard, sans contrôle (sécurité : éviter les fausses manips)

### Authentification
- Équipes : `auth.signInAnonymously()` + `join_team(code)` (fonction SQL définie dans schéma V2)
- Master/Réjane : auth Supabase classique (email + mot de passe) sur 2 comptes dédiés
- RLS reste celle du schéma V2 ; master/réjane bypassent via `service_role` pour le dashboard

### Pause globale synchronisée (nouveau)
Nouvelle table singleton `workshop_state` :

```sql
create table public.workshop_state (
  id           int primary key default 1 check (id = 1),  -- singleton
  is_paused    boolean not null default false,
  pause_reason text,                                       -- message affiché aux équipes
  paused_at    timestamptz,
  active_challenge_id int references public.challenges(id), -- défi en cours, piloté par master
  updated_at   timestamptz not null default now()
);

insert into public.workshop_state (id, is_paused) values (1, false)
  on conflict (id) do nothing;

alter table public.workshop_state enable row level security;
create policy "workshop_state_read" on public.workshop_state
  for select to authenticated using (true);
-- Pas de policy d'écriture : seul service_role (master) modifie via Edge Function
```

**Côté client** (toutes les équipes) :
- Hook `useWorkshopState()` qui s'abonne en Realtime à `workshop_state`
- Si `is_paused = true` → overlay plein écran bloquant l'UI avec le message `pause_reason`
- Si `is_paused = false` → l'UI redevient interactive

**Côté master** :
- Bouton « ⏸ Pause générale » + zone de saisie d'un message (« On débriefe sur les biais 5 minutes »)
- Appelle Edge Function `/admin/pause` qui met à jour `workshop_state` (avec `service_role`)
- Bouton « ▶ Reprendre » qui repasse `is_paused = false`

**Cas limite** : si une équipe est en plein streaming IA quand la pause tombe, le stream continue côté serveur mais l'overlay masque le résultat. À la reprise, le résultat s'affiche.

---

## Plan de sprint en 7 phases

> Chaque phase ≈ 1 semaine. Les phases 4-5 peuvent se chevaucher si besoin.

---

### PHASE 0 — Fondations (S1 : 27 mai → 2 juin)

**Objectif** : projet utilisable bout-en-bout sur le Défi 0 conversationnel.

#### Jalon 0.1 — Setup projet
- [x] `pnpm create next-app fresque-ia` avec TypeScript, Tailwind, App Router
- [x] Installer dépendances : `@supabase/supabase-js`, `@supabase/ssr`, `@fontsource/inter`
- [x] Configurer `tailwind.config.ts` avec la palette ci-dessus (via `@theme` dans globals.css — Tailwind v4)
- [x] Configurer `globals.css` : base font 18 px, Inter, fond blanc, `rounded-none` partout par défaut
- [x] Créer arborescence vide selon `CLAUDE.md`
- [x] Configurer `.env.local` avec les clés (cf. CLAUDE.md)
- [x] `pnpm dev` qui sert une page d'accueil vide propre

**DoD** : `pnpm dev` lance, page d'accueil rend en blanc/noir/vert sobre, aucun warning lint/typecheck.

#### Jalon 0.2 — Supabase configuré
- [x] `pnpm supabase init` (dossier supabase/ existant, migrations créées)
- [x] Migration `001_init.sql` = contenu de `docs/02-supabase-schema-v2.sql`
- [x] Migration `002_workshop_state.sql` = table de pause globale
- [x] Migrations appliquées sur projet distant via MCP (local db reset à faire quand Docker dispo)
- [x] Realtime activé sur : `teams`, `team_scores`, `submissions`, `votes`, `events`, `porte_messages`, `team_progress`, `workshop_state`
- [x] `bootstrap_workshop()` exécuté : 10 équipes test créées
- [x] 10 codes à 4 chiffres générés (7538, 4082, 8024, 1905, 5855 Mehdi / 1787, 6698, 3099, 7416, 6149 Réjane)

**DoD** : 10 équipes existent en base avec des codes à 4 chiffres, on peut faire `select * from teams`.

#### Jalon 0.3 — Auth anonyme + join_team
- [x] Créer `lib/supabase/client.ts`, `server.ts`, `admin.ts`
- [x] Créer `app/(public)/page.tsx` : landing minimale, un seul input « Code équipe » et un bouton « Entrer »
- [x] Créer `app/(public)/join/page.tsx` : appelle `signInAnonymously()` puis RPC `join_team(p_code)`
- [x] Si succès : redirect vers `/porte`
- [x] Si erreur (code inconnu) : message d'erreur sobre
- [x] Créer `app/(team)/layout.tsx` : vérifie session, sinon redirect
- [x] Middleware Supabase SSR pour refresh cookies

**DoD** : on entre un code, on se retrouve sur une page `/porte` vide. Un autre onglet avec un autre code mène à un autre `team_id`.

#### Jalon 0.4 — Défi 0 « La Porte »
- [x] Créer Edge Function `supabase/functions/porte-chat/index.ts`
  - Reçoit : historique de messages
  - Appelle Mistral (`mistral-large-latest`) avec fallback Claude → Deepseek
  - Streame la réponse en SSE (format OpenAI-compatible)
- [x] Créer `app/(team)/porte/page.tsx` :
  - UI minimaliste : un `>` qui clignote (CSS pulse), zone de saisie en bas, Enter pour envoyer
  - Pas de bouton « Envoyer » visible
  - Stream la réponse mot par mot
  - Persiste chaque message en `porte_messages`
- [x] Détection du bloc `<READY>{...}</READY>` dans le stream :
  - Extraction JSON + validation
  - Appel RPC `validate_porte(...)`
  - Révélation mot de passe (3 mots, grand, vert)
  - Redirect vers `/lobby` après 4 secondes
- [x] `lib/ai/prompts.ts` : PORTE_SYSTEM_PROMPT exporté
- [x] Page `/lobby` placeholder créée

**DoD** : une équipe peut converser avec le Gardien, obtenir un mot de passe, voir sa composition métier enregistrée en base.

#### Jalon 0.5 — Bouton « débloquer » côté master
- [x] Embryon de `app/(admin)/control/page.tsx` : tableau des 10 équipes avec code, animateur, mot de passe, statut
- [x] Mise à jour Realtime du tableau (subscribe sur `teams`)
- [x] Bouton « Débloquer manuellement » : génère mot de passe auto + composition par défaut + passe le défi 0

**DoD** : si une équipe rame sur le défi 0, le master peut la faire passer en 1 clic.

---

### PHASE 1 — Mécaniques communes (S2 : 3 → 9 juin)

**Objectif** : tous les composants partagés des défis fonctionnent.

#### Jalon 1.1 — Composants partagés
- [x] `components/shared/Timer.tsx` : compte à rebours `text-4xl`, rouge sous 60s, callback `onExpire`
- [x] `components/shared/PredictionWidget.tsx` : 3 modes (slider, multiselect, tf_list) selon `prediction_schema`
- [x] `components/shared/StreamedOutput.tsx` : affichage texte streamé `text-xl`, états loading/vide/contenu
- [x] `components/shared/SubmitButton.tsx` : bouton vert `text-xl`, états idle/loading/done

**DoD** : page démo `/dev/components` qui affiche les 4 composants avec interactions.

#### Jalon 1.2 — Hook usePauseSync
- [x] `lib/hooks/usePauseSync.ts` : s'abonne à `workshop_state` en Realtime, retourne `{ isPaused, pauseReason }`
- [x] `components/PauseOverlay.tsx` : overlay plein écran blanc z-50, message `text-3xl`
- [x] Intégré `<PauseOverlay />` dans `app/(team)/layout.tsx`

**DoD** : forcer `update workshop_state set is_paused = true` en SQL → toutes les pages équipes affichent l'overlay en < 2 s. Idem `false` → l'overlay disparaît.

#### Jalon 1.3 — AI Proxy avec fallback
- [x] Edge Function `supabase/functions/ai-proxy/index.ts`
- [x] `lib/ai/proxy.ts` côté client : appelle l'edge function avec stream
- [x] Logique de fallback : Mistral → Claude → Deepseek → cache (`ai_cache`)
- [x] Sur succès, log dans `submissions` (provider utilisé, tokens, latency)

**DoD** : couper Mistral en simulant une 503 → l'appel passe en Claude automatiquement, l'utilisateur ne voit rien.

#### Jalon 1.4 — Adaptation par composition métier
- [x] `lib/roles/adapter.ts` :
  ```ts
  type Role = 'admin' | 'medico_psy' | 'formateur' | 'insertion_pro'
  function getRoleHints(
    composition: Record<Role, number>,
    challenge_slug: string
  ): Record<Role, { hint: string; mode: 'present' | 'discover' }>
  ```
- [x] Catalogue d'amorces dans `lib/roles/hints.ts` (un objet par défi × métier)

**DoD** : tests unitaires sur 3 cas (équipe diversifiée, équipe sans admin, équipe sans médico-psy).

---

### PHASE 2 — Défis 1 à 3 (S3 : 10 → 16 juin)

#### Jalon 2.1 — Défi 1 « La Pré-admission »
- [x] Importer documents Camille (1, 2, 3) en `docs/camille/` puis exposés via composant `<DocumentCamille kind="..." />`
- [x] Document 2 : police cursive (`font-cursive` = Caveat via @fontsource/caveat)
- [x] Composant `app/(team)/challenge/1/page.tsx`
- [x] PARI par métier représenté (slider 0-100 %)
- [x] Appel IA pour structurer la fiche en 4 sections, avec amorces adaptées
- [x] Comparaison pari/réel + score
- [x] Sauvegarde dans `submissions` + `predictions` + `team_scores`

**DoD** : une équipe peut faire le Défi 1 du début à la fin, et toutes les données sont en base.

#### Jalon 2.2 — Défi 2 « La Synthèse à 4 voix »
- [x] Composant `TurnByTurnPanel` qui propose une amorce par métier représenté
- [x] Bouton « Générer » désactivé tant qu'il manque la contribution d'un métier représenté
- [x] PARI sur le score FALC (slider 0-10)
- [x] Génération double (pro + FALC) en parallèle
- [x] Évaluation FALC par IA (5 critères × 2 pts = 10)
- [x] Bouton « Ajuster » qui permet de modifier 1 input et regénérer

**DoD** : Défi 2 jouable end-to-end.

#### Jalon 2.3 — Défi 3 « La Chasse aux mauvais prompts »
- [x] Pré-générer les 4 réponses biaisées via `scripts/seed-defi3-cases.ts`
- [x] Validation manuelle des 4 réponses dans Supabase Studio (`pre_validated = true`)
- [x] Composant qui enchaîne les 4 cas
- [x] PARI catégoriel multi-select sur les 6 types de biais
- [x] Phase de réécriture du prompt par l'équipe + nouvelle génération (live, pas cache)
- [x] Score = points par catégorie correcte – points par catégorie incorrecte

**DoD** : Défi 3 jouable end-to-end avec cache fonctionnel.

---

### PHASE 3 — Défis 4 & 5 + Master Dashboard (S4 : 17 → 23 juin)

#### Jalon 3.1 — Défi 4 « Une info, cinq destinataires »
- [x] Document 4 (convention de stage) intégré
- [x] PARI léger (compteur 0-5 « combien de versions seront OK »)
- [x] Lancement de **5 streams en parallèle** côté client via ai-proxy
- [x] Affichage en 5 colonnes (responsive : scroll horizontal sur petit écran)
- [x] Édition inline de chaque version + bouton « Régénérer » par version (max 1 fois)
- [x] Comptage final + score

**DoD** : Défi 4 jouable, performance acceptable (< 15 s pour générer les 5 versions en parallèle).

#### Jalon 3.2 — Défi 5 « Notre projet »
- [x] Phase A — Inspiration : affichage des 4 défis précédents en cartes
- [x] Phase B — Structuration : IA pose les 5 questions de cadrage, équipe répond
- [x] Phase C — Vote inter-équipes : chaque équipe voit les projets des autres, attribue 3 ★
- [ ] Phase D — Génération PDF via Edge Function `generate-pact-pdf` (à implémenter en S5-S6)
  - Puppeteer headless + template HTML
  - Upload sur R2 (réutiliser pattern Pictobanque)
  - URL sauvegardée dans `pacts.pdf_url`
- [ ] Bouton « Télécharger » + bouton « Imprimer » (dépend de Phase D)

**DoD** : 10 équipes peuvent finaliser leur projet, voter sur les autres, générer leur PDF.

#### Jalon 3.3 — Dashboard master (vue projetée)
- [x] `app/(admin)/dashboard/page.tsx` (auth requise pour Mehdi)
- [x] Grille 2×5 affichant les 10 équipes
- [x] Pour chaque équipe :
  - Mot de passe (3 mots) en gros
  - Composition métier en pictogrammes simples (chiffres + lettres : 2A 1MP 2F 1IP)
  - Défi en cours
  - Progression dans le défi en cours (% ou phase)
  - Score total
- [x] Mise à jour Realtime sur changement de `team_scores`, `team_progress`, `teams`
- [x] Bouton « Voir détails » par équipe → modal avec les soumissions

**DoD** : Mehdi voit l'avancée de toutes les équipes en temps réel sur un seul écran projeté.

#### Jalon 3.4 — Panneau de contrôle master
- [x] `app/(admin)/control/page.tsx`
- [x] **Bouton pause globale** : champ texte (raison) + bouton ⏸/▶
- [x] **Sélecteur de défi actif** : permet au master de forcer un défi pour toutes les équipes
- [x] **Bouton « Débloquer équipe X »** sur chaque équipe
- [x] **Bouton « Activer un bonus »** : choix d'un bonus + équipe(s) cible(s) (une, plusieurs, toutes)
- [x] API route `/api/admin` avec service_role pour toutes les actions admin

**DoD** : Mehdi peut piloter l'atelier sans toucher au SQL.

---

### PHASE 4 — Bonus prioritaires (S5 : 24 → 30 juin)

**Priorité** : Bonus E, I, A, F, G (les 5 les plus utiles ou démonstratifs)

#### Jalon 4.1 — Bonus E « Vrai ou Faux IA »
- [x] Pré-générer les 10 réponses argumentées via `scripts/seed-bonus-e-cases.ts`
- [x] 10 affirmations avec réponses + explications dans `lib/ai/bonus-e-statements.ts`
- [x] Composant qui enchaîne les 10 affirmations (vrai/faux/nuancé)
- [x] Score sur 10 + révélation des réponses

**DoD** : Bonus E jouable.

#### Jalon 4.2 — Bonus I « Le glossaire qui sauve »
- [x] 10 termes par défaut (acronymes MDPH, ESRP, etc.) + ajout libre par l'équipe
- [x] L'IA produit une définition FALC pour chaque terme
- [x] Bouton imprimer (window.print)
- [ ] Génération PDF glossaire (reporté avec Phase D)

**DoD** : Bonus I jouable + PDF généré + téléchargeable.

#### Jalon 4.3 — Bonus A « Le détective des doublons »
- [x] Génération à la volée de 4 mini-rapports (1 par métier) avec doublons forcés via prompt
- [x] Pari sur le nombre de doublons (slider 0-6)
- [x] L'IA repère et propose une fusion (JSON structuré)

**DoD** : Bonus A jouable.

#### Jalon 4.4 — Bonus F « Le journal de Camille »
- [x] Sélection d'un moment du parcours (4 options pré-définies)
- [x] Génération d'un fragment à la première personne, ton intime
- [x] Affichage en typographie « lettre » (Caveat cursive)

**DoD** : Bonus F jouable.

#### Jalon 4.5 — Bonus G « Le pitch en 30 secondes »
- [x] Récolte de 3 éléments forts par l'équipe
- [x] Génération du pitch (texte) avec indications [pause]
- [ ] Edge Function `tts-generate` (OpenAI TTS) — reporté S6
- [ ] Lecteur audio HTML5 + stockage MP3 sur R2 — reporté S6

**DoD** : Bonus G jouable, l'audio est généré et lisible.

---

### PHASE 5 — Bonus restants + Wifi test (S5-S6)

#### Jalon 5.1 — 5 bonus restants (B, C, D, H, J)
- [x] Bonus B « Le coach d'entretien » (3 questions × 3 réponses)
- [x] Bonus C « La pièce manquante » (RAPO + version FALC)
- [x] Bonus D « Brouillon de subvention » (8 min chrono)
- [x] Bonus H « Le scénario de crise » (protocole 4 étapes + SMS)
- [x] Bonus J « La carte mentale » avec `markmap-lib`

**DoD** : tous les bonus jouables.

#### Jalon 5.2 — Test wifi à Rennes
- [ ] Visite physique de la salle de plénière ESRP Rennes
- [ ] Mesure du débit avec 1 puis 5 puis 10 appareils
- [ ] Test du flux Défi 4 (5 streams parallèles) sur la connexion réelle
- [ ] Documentation du débit constaté dans `docs/wifi-rennes.md`
- [ ] Si débit < 5 Mbps en charge : préparer plan B 4G

**DoD** : on sait à quoi s'attendre techniquement le jour J.

---

### PHASE 6 — Robustesse + Répétition (S6 : 1 → 7 juillet)

#### Jalon 6.1 — Mode dégradé
- [x] Détection automatique de l'état des API (ping périodique vers Mistral)
- [x] Bannière discrète si mode dégradé activé
- [ ] Tous les défis sensibles servent depuis `ai_cache` en mode dégradé
- [x] Indicateur visible côté master du nombre d'équipes en mode dégradé

**DoD** : couper le wifi pendant 30 s en plein défi → l'atelier continue sans rupture.

#### Jalon 6.2 — Load test
- [x] `scripts/load-test.ts` : simule 10 équipes × 6 utilisateurs simultanés
- [x] Mesure : latence Mistral, RTT Supabase Realtime, taux d'erreur, débit RAM/CPU sur Vercel
- [ ] Cible : 95e percentile de latence IA < 8 s en mode streamé (à valider en exécutant le script)

**DoD** : le rapport de load test passe les seuils.

#### Jalon 6.3 — Répétition générale
- [ ] Inviter 15-20 personnes du Fab Lab La Multiprise (ou équipe EPNAK élargie)
- [ ] Faire tourner l'atelier complet, 3 h
- [ ] Identifier les frictions UX
- [ ] Lister les bugs et corrections à faire en S7

**DoD** : retours collectés, bugs catalogués, ajustements UX listés.

---

### PHASE 7 — Polish + Jour J (S7 : 8 → 15 juillet)

#### Jalon 7.1 — Corrections post-répétition
- [ ] Implémenter les corrections identifiées
- [ ] Re-test des défis ajustés

#### Jalon 7.2 — Pré-production
- [ ] `bootstrap_workshop()` exécuté pour générer les 10 codes finaux
- [ ] Imprimer les 10 codes sur fiches papier (1 par équipe, à donner le jour J)
- [ ] Vérifier comptes API (quotas, crédits suffisants)
- [ ] Vérifier comptes auth pour Mehdi et Réjane
- [ ] Réveil des Edge Functions (warm-up)
- [ ] Pré-générer toutes les réponses en cache (Défi 3 + Bonus E)
- [ ] Test final de bout en bout sur staging

#### Jalon 7.3 — Brief co-animation
- [ ] Document 1 page « Brief Réjane » imprimé : timing, points de vigilance, scripts de relance
- [ ] Compte Réjane testé sur le dashboard
- [ ] Répétition rapide à 2 (Mehdi + Réjane) sur les transitions et les moments de pause

#### Jalon 7.4 — Plan B technique imprimé
- [ ] Fiche A4 plastifiée à conserver le jour J :
  - Que faire si Mistral est down ? → Le mode dégradé prend le relais automatiquement
  - Que faire si une équipe est complètement bloquée ? → Bouton « Débloquer »
  - Que faire si le wifi tombe ? → Bascule 4G + bannière info à toutes les équipes
  - Qui appeler en cas d'urgence ? (téléphone hébergeur, téléphone IT ESRP)

---

## Annexes

### A. Commandes utiles

```bash
# Dev quotidien
pnpm dev
pnpm typecheck      # à lancer avant chaque commit
pnpm lint
pnpm test

# Supabase
pnpm supabase start
pnpm supabase db reset       # détruit + replay migrations + seed
pnpm supabase migration new <nom>
pnpm supabase functions deploy <nom>
pnpm supabase functions serve <nom> --env-file .env.local

# Pré-génération
pnpm tsx scripts/seed-defi3-cases.ts
pnpm tsx scripts/seed-bonus-e-cases.ts

# Bootstrap d'atelier (à exécuter D-1)
psql $DATABASE_URL -c "select * from bootstrap_workshop();"

# Load test
pnpm tsx scripts/load-test.ts --teams 10 --duration 600
```

### B. Conventions Claude Code

Lorsqu'on travaille avec Claude Code sur ce projet :

1. **Toujours lire `CLAUDE.md` et ce `PLAN.md` au démarrage d'une session**, et identifier le jalon en cours.
2. **Une session = un jalon** idéalement. Ne pas mélanger plusieurs jalons.
3. **Toujours commit après un jalon validé**, avec un message du type `feat(jalon-2.1): défi 1 pré-admission end-to-end`.
4. **Toujours typecheck + lint avant commit** (`pnpm typecheck && pnpm lint`).
5. **Ne jamais modifier une migration appliquée** : nouvelle migration toujours.
6. **Toujours mettre à jour ce PLAN.md** quand on coche une case `[x]` ou quand on identifie un nouveau jalon.
7. **Les prompts système IA vivent dans `lib/ai/prompts.ts`**, jamais en dur dans un composant.
8. **Les amorces métier vivent dans `lib/roles/hints.ts`**, alimentées par `lib/roles/adapter.ts`.
9. **Pas de `any`** non commenté. Pas de `// @ts-ignore` non documenté.
10. **Toujours streamer les réponses IA**. Tout passage en mode bloquant est un bug.

### C. Checklist jour J (à imprimer)

#### J-7
- [ ] Bootstrap exécuté, 10 codes imprimés
- [ ] Crédits API vérifiés (Mistral, Claude, OpenAI, Replicate)
- [ ] Cache pré-généré et validé
- [ ] Plan B 4G prêt (téléphone chargé, forfait illimité)

#### J-1
- [ ] Test bout-en-bout sur staging avec une équipe complète
- [ ] Tous les Edge Functions warmés
- [ ] Imprimer la fiche Plan B technique
- [ ] Charger les 2 PC d'animation (Mehdi + Réjane)
- [ ] Charger le téléphone de secours
- [ ] Préparer le matériel : 10 jeux post-it, 10 marqueurs, 10 cartes papier vierges

#### Jour J — Matin
- [ ] Arriver 1 h avant
- [ ] Brancher le vidéoprojecteur et tester
- [ ] Connecter les 10 PC, tester `/join` sur chacun
- [ ] Ouvrir le dashboard master sur le PC de Mehdi
- [ ] Dernier test du défi 0 sur un PC

#### Jour J — Après-midi
- [ ] Distribuer les codes équipe
- [ ] Lancer l'atelier
- [ ] **Respirer**

---

## Décisions techniques figées (ne plus rediscuter)

- **Stack** : Next.js 14 App Router + Supabase + Mistral primaire
- **TTS** : OpenAI TTS (`tts-1`, voix `alloy`)
- **PDF** : Puppeteer headless via Edge Function + Cloudflare R2
- **Mind map** : `markmap-lib`
- **Police** : Inter (sauf manuscrit Camille = Caveat)
- **Pause globale** : table `workshop_state` singleton + Realtime
- **Composition des équipes** : composée manuellement par Mehdi & Réjane à partir de la liste des participants
- **Identifiants équipes** : codes à 4 chiffres générés par `bootstrap_workshop()`
- **Auth équipe** : Supabase anonymous + RPC `join_team(code)`
- **Auth master** : Supabase auth classique sur compte dédié

---

*Document version 1.0 — 4 juin 2026 — Mehdi Gheddache*
