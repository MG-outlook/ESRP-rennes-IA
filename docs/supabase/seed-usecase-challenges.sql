-- Seed des « Cas d'usage métier » (défis 301-304) dans la table challenges.
--
-- POURQUOI CE FICHIER : plusieurs tables (workshop_state.active_challenge_id,
-- team_progress, submissions, predictions, team_scores, ai_cache) ont une clé
-- étrangère vers challenges(id). Tant que les lignes 301-304 n'existent pas
-- ici, ouvrir l'un de ces défis dans le panneau de contrôle OU le démarrer
-- côté équipe échoue avec une « Erreur serveur » (violation de FK).
--
-- Ce script a été appliqué en production le jour de son ajout. Il est
-- idempotent (ON CONFLICT DO NOTHING) : on peut le rejouer sans risque, par
-- exemple après une restauration de base.

insert into public.challenges
  (id, slug, title, duration_sec, is_bonus, has_prediction, config, track)
values
  (301, 'uc_mission_doc',           'Cas d''usage 1 — La mission documentaire',          1200, false, false, '{}'::jsonb, 'usecase'),
  (302, 'uc_simulateur_entretien',  'Cas d''usage 2 — Le simulateur d''entretien',       1200, false, false, '{}'::jsonb, 'usecase'),
  (303, 'uc_debrief_vocal',         'Cas d''usage 3 — Le débrief vocal',                 1200, false, false, '{}'::jsonb, 'usecase'),
  (304, 'uc_synthese_copil',        'Cas d''usage 4 — La synthèse d''accueil du copil',  1200, false, false, '{}'::jsonb, 'usecase')
on conflict (id) do nothing;
