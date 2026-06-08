# Plan B technique — Jour J (16 juillet 2026)

> Fiche à imprimer et plastifier. À garder sous la main pendant l'atelier.

---

## 1. Mistral / IA est down

**Symptôme** : bannière noire "Mode dégradé" visible sur les écrans équipes + dashboard.

**Action** : Rien à faire. Le système bascule automatiquement :
1. Mistral → Claude → Deepseek → Cache local
2. Les défis 3 et Bonus E utilisent des réponses pré-générées (cache)
3. Annoncer aux équipes : "L'IA met un peu plus de temps, c'est normal"

---

## 2. Une équipe est bloquée au Défi 0

**Symptôme** : le Gardien ne donne pas le mot de passe après 10+ minutes.

**Action** :
1. Aller sur `/admin/control`
2. Trouver l'équipe
3. Cliquer **"Débloquer"** → génère un mot de passe par défaut
4. L'annoncer à l'équipe oralement

---

## 3. Le wifi tombe

**Symptôme** : pages ne chargent plus, erreurs réseau.

**Action** :
1. Activer le **partage de connexion 4G** (téléphone Mehdi ou Réjane)
2. Communiquer le nouveau réseau wifi aux équipes
3. Les sessions Supabase se reconnectent automatiquement
4. Si débit insuffisant : passer en mode "démonstration projetée" (1 seul écran)

---

## 4. Vercel est down

**Symptôme** : site inaccessible (erreur 502/503).

**Action** :
1. Vérifier sur https://vercel-status.com
2. Si confirmé : basculer sur `pnpm dev` en local (laptop Mehdi branché au vidéoprojecteur)
3. Mode dégradé : démonstration projetée uniquement

---

## 5. Supabase est down

**Symptôme** : erreurs d'auth, données ne se sauvent pas.

**Action** :
1. Vérifier sur https://status.supabase.com
2. Les réponses IA continuent de fonctionner (streaming direct)
3. Les scores ne seront pas enregistrés → les noter sur papier
4. Recréer les scores manuellement après rétablissement

---

## Contacts urgence

| Qui | Téléphone |
|-----|-----------|
| Mehdi Gheddache | 06 98 43 17 89 |
| Réjane Certain | ________________ |
| IT ESRP Rennes | ________________ |
| Hébergeur wifi | ________________ |
