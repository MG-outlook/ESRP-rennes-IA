# Fiches détaillées des défis — Fresque de l'IA EPNAK (V2)

**Atelier ESRP Rennes — 16 juillet 2026**
**Format :** 10 équipes de 6 personnes (métiers mélangés), 1 PC par équipe
**Animation :** Mehdi Gheddache + Réjane Certain (5 équipes chacun)
**Public :** gestionnaires administratifs, formateurs, professionnels médico-psy-sociaux, chargés d'insertion professionnelle
**Durée totale :** 2h45 de défis + onboarding et restitution

---

## Boussole pédagogique

Tous les défis s'articulent autour d'**un seul fil rouge** : le parcours de Camille à l'ESRP. Ce choix n'est pas cosmétique. Il fait apparaître ce qui relie déjà les métiers de l'établissement — un même usager, des outils communs (dossier, synthèse, projet professionnel individualisé, courriers), un but commun (autonomie et retour à l'emploi).

**L'IA n'est pas un sujet à part. C'est un outil qui parle à tous ces métiers à la fois**, parce qu'elle ne *fait pas* le métier mais *outille la collaboration*.

### Le persona fil rouge

> **Camille Renaud, 38 ans.**
> Ancien·ne magasinier·ère, accident du travail il y a 3 ans (rachis lombaire), RQTH obtenue.
> Arrive à l'ESRP Rennes pour un parcours de réadaptation professionnelle.
> Deux enfants (8 et 11 ans), un parent qui parle peu français.
> Projet flou : envie de « faire un métier de bureau » et de « garder un lien avec le terrain ».
> Volontaire, anxieux·se, fatigable.
> Le prénom est volontairement androgyne pour éviter les projections de genre.

### L'adaptation par composition métier

La plateforme capte la composition de chaque équipe au défi 0 (qui parle ? combien de chacun métier ?). Pour chaque défi, **les amorces et exemples s'adaptent** : un admin voit un exemple de courrier MDPH, un médico-psy voit un compte-rendu d'entretien, un formateur voit un référentiel de compétences, un chargé d'insertion voit une fiche entreprise. Si un métier manque dans l'équipe, son entrée est proposée à toute l'équipe en mode *« découverte »* (jamais en mode « pénurie »).

### La mécanique hybride pari / pas de pari

Le pari est gardé là où l'IA produit un résultat mesurable et où l'écart pari/réel est pédagogique. Il est abandonné quand le défi est de l'ordre de la conversation, de la production libre, ou de l'engagement.

| Défi | Pari ? |
|------|--------|
| 0 La Porte | Non |
| 1 Pré-admission | Oui |
| 2 Synthèse à 4 voix | Oui |
| 3 Mauvais prompts | Oui (catégoriel) |
| 4 Une info, 5 destinataires | Oui (léger) |
| 5 Notre projet | Non |
| Bonus A & E | Oui |
| Autres bonus | Non |

---

## Vue d'ensemble

| # | Titre | Durée | Pari | Métiers en première ligne |
|---|-------|-------|------|--------------------------|
| 0 | La Porte | 15 min | — | Tous (présentation conversationnelle) |
| 1 | La Pré-admission | 20 min | ✅ | Admin + médico-psy + formateur + insertion pro |
| 2 | La Synthèse à 4 voix | 25 min | ✅ | Tous, en tour de table |
| 3 | La Chasse aux mauvais prompts | 20 min | ✅ | Tous (chaque métier corrige un type de biais) |
| 4 | Une info, cinq destinataires | 25 min | ✅ | Tous (adaptation à audiences variées) |
| 5 | Notre projet | 30 min | — | Tous (engagement collectif) |

**Total des défis principaux : 2h15 + 30 min de transitions et débriefs.**

Les 10 bonus sont à activer à la discrétion des animateurs (équipes en avance ou plénière commune).

---

# Défi 0 — La Porte

## En une phrase
*« Aucune indication. Juste un prompt qui clignote. Pour entrer, il faut parler. »*

## Ce que voient les participants
Un écran sombre. En haut, au centre, un mot : **`> `** qui clignote. Aucun bouton « envoyer ». Aucune consigne. Aucune barre de menu. Seulement un curseur qui attend.

## Ce qui se passe vraiment
L'IA joue un gardien courtois et curieux. Son système prompt l'instruit de **ne pas livrer le mot de passe avant** d'avoir conversé suffisamment pour identifier :

1. La composition de l'équipe (combien de personnes, quels métiers représentés)
2. Une intention partagée pour l'après-midi (un mot, une envie, une appréhension)
3. Une singularité de l'équipe (un point commun rigolo, ou une différence assumée)

Quand ces trois éléments sont collectés, le gardien :
- Génère un **mot de passe à 3 mots évocateurs** qui résume l'essence de l'équipe (ex : *« Bureaux-Ouverts-Curieux »*)
- Affiche un message d'ouverture personnalisé
- **Enregistre en base la composition métier** (champ `teams.composition`), qui pilotera l'adaptation des défis suivants

## Mécanique pas-à-pas

1. **(2 min)** L'équipe découvre l'écran. Surprise, hésitation. C'est voulu — c'est le seul moment de l'atelier où ils ne sont pas guidés.
2. **(8-10 min)** Conversation libre avec le gardien. Le gardien relance, demande des précisions, plaisante un peu.
3. **(2 min)** Le gardien valide, annonce le mot de passe, et ouvre la porte vers le défi 1.
4. **(1 min)** L'équipe imprime son mot de passe sur une fiche (matérielle, format carte de visite) — c'est leur badge pour le reste de l'atelier.

## Prompt système IA

```
Tu es le Gardien de la Fresque, un personnage chaleureux et un brin facétieux.
Une équipe de professionnels de l'ESRP Rennes (gestionnaires administratifs,
formateurs, professionnels médico-psycho-sociaux, chargés d'insertion
professionnelle) cherche à entrer dans un atelier sur l'IA. Elle te parle.

Ta mission : avant de leur donner un mot de passe d'entrée, tu dois avoir
collecté en conversation :
1. Le nombre de personnes dans l'équipe et leur métier
2. Une intention pour cet après-midi (un mot, une envie, une appréhension)
3. Une singularité de l'équipe (point commun rigolo OU différence assumée)

Règles :
- Tu ne donnes JAMAIS la liste de ces trois points. Tu les laisses émerger.
- Tu reformules, tu approfondis, tu plaisantes parfois.
- Si l'équipe répond évasivement, tu insistes gentiment.
- Tu ne dépasses jamais 4 phrases par réponse.
- Tu parles à l'équipe au PLURIEL ("vous", "votre équipe").
- Tu ne dis JAMAIS "en tant qu'IA" ou "je suis une IA". Tu es le Gardien.

Quand tu as les trois informations, tu fais EXACTEMENT ceci dans ta réponse,
et seulement à ce moment-là :

1. Tu remercies brièvement l'équipe
2. Tu génères un mot de passe original à 3 mots évocateurs (séparés par tirets)
   qui résume l'essence de l'équipe
3. Tu produis un bloc JSON STRICT en fin de message, encadré par les balises
   <READY>...</READY> :

<READY>
{
  "composition": {"admin": <int>, "medico_psy": <int>, "formateur": <int>, "insertion_pro": <int>, "autre": <int>},
  "intention": "<mot/phrase courte>",
  "singularite": "<phrase courte>",
  "password": "<mot1-mot2-mot3>",
  "team_essence": "<une phrase d'accueil pour cette équipe>"
}
</READY>

Tant que tu n'as pas les trois infos, tu ne produis PAS de bloc <READY>.
Tu attends. Tu relances.
```

## Côté front

- Détection du bloc `<READY>` dans le stream pour déclencher la fin du défi
- Le bloc JSON est masqué visuellement aux utilisateurs (parsé et stocké côté backend)
- Le mot de passe et la phrase d'accueil s'affichent en grand, avec une animation
- Bouton « Entrer dans l'atelier » apparaît seulement à ce moment-là

## Critères de réussite
- Toute l'équipe a participé à la conversation
- Composition métier captée en base
- Mot de passe affiché et imprimé

## Livrable
- Carte papier imprimée avec le mot de passe (matérielle, conservée par l'équipe)
- Identité numérique en base (nom = le mot de passe, composition métier, intention, singularité)

## Points de vigilance facilitateur
- Si une équipe bloque > 5 min sans rien taper, l'animateur peut suggérer : *« Présentez-vous, le gardien est curieux »*
- Si une équipe « triche » en demandant directement le mot de passe, le gardien doit refuser poliment (c'est dans son système prompt)
- Avertir en plénière de départ : *« Pas de bouton, pas de panique. Juste parlez. »*

---

# Défi 1 — La Pré-admission

## En une phrase
*« Le dossier de Camille vient d'arriver. Que voit chaque métier dans le même dossier ? »*

## Brief participant (affiché)
> Camille Renaud, 38 ans, vient de s'inscrire à l'ESRP Rennes. Son dossier de pré-admission est là, avec trois documents : un courrier MDPH, une lettre de motivation manuscrite scannée, et une fiche médicale de l'employeur précédent. **L'établissement doit produire une fiche de pré-admission pluri-pro en moins d'une heure** pour préparer son accueil. Chacun lit le dossier avec son regard métier. L'IA va vous aider à structurer tous ces regards en un seul document.

## Mécanique pas-à-pas

1. **(3 min)** L'équipe accède au dossier de Camille (3 documents fictifs pré-rédigés). Lecture rapide en équipe.

2. **(3 min) Pari** : avant d'utiliser l'IA, l'équipe pari **par métier** sur un slider 0-10 : *« À combien estimez-vous le pourcentage d'informations utiles à mon métier dans ce dossier ? »*. La plateforme propose la question pour chaque métier représenté dans l'équipe (et en mode « découverte » pour les métiers absents).

3. **(8 min) Production assistée** : l'IA propose une **fiche de pré-admission pluri-pro structurée en 4 sections** (administrative, médico-psy, formation, insertion). L'équipe complète ou corrige chaque section, avec **des amorces personnalisées par métier représenté**.

4. **(3 min) Vérité** : l'IA recompte les informations pertinentes effectivement présentes dans le dossier pour chaque métier. Comparaison avec le pari de l'équipe. Score = inverse de l'écart.

5. **(3 min) Débrief en équipe** : « Mon métier a-t-il vu des choses que les autres ont ratées ? Qu'avons-nous loupé collectivement ? »

## Documents du dossier (à pré-rédiger)

1. **Courrier MDPH** (~150 mots) : notification RQTH valide 5 ans, taux d'invalidité 60%, recommandations d'aménagement de poste
2. **Lettre de motivation manuscrite scannée** (~120 mots, ton hésitant mais volontaire) : « j'aimerais essayer un métier de bureau, j'ai toujours aimé organiser, mes enfants me disent que je suis patiente avec eux »
3. **Fiche médicale employeur précédent** (~100 mots) : restrictions de port de charge, station debout prolongée, aptitudes conservées en bureautique basique

## Prompt système IA (structuration de la fiche)

```
Tu es un assistant d'admission ESRP. À partir d'un dossier brut (3 documents),
tu produis une fiche de pré-admission structurée en 4 sections, chacune adressée
à un métier de l'établissement :

1. Section ADMIN : dates clés, références dossier, points de vigilance administrative
2. Section MÉDICO-PSY : signaux d'écoute, restrictions, ressources personnelles
3. Section FORMATION : compétences déjà mobilisées, prérequis, appétences
4. Section INSERTION PRO : projet exprimé, contraintes, ouvertures possibles

Règles :
- Chaque section fait 80-120 mots maximum
- Tu ne diagnostiques pas, tu repères des éléments
- Tu utilises les FAITS du dossier, pas des suppositions
- Tu marques d'un ⚠️ tout point qui mériterait une vérification
- Tu termines chaque section par une question ouverte pour l'équipe

Dossier de Camille :
[DOCUMENTS_FOURNIS]

Composition de l'équipe : [COMPOSITION_JSON]
(Pour les métiers absents, ajouter une note "🌱 Section à découvrir ensemble".)
```

## Critères de réussite
- L'équipe a parié avant de produire ✅
- Chaque section est revue par au moins une personne ✅
- Au moins 1 point ⚠️ a été discuté ✅

## Livrable
- Fiche de pré-admission pluri-pro de Camille (4 sections), exportable PDF
- Score équipe (pari + complétude)

## Points de vigilance facilitateur
- Si l'équipe ne fait que valider sans rien ajouter, relancer : *« Que rajouterait votre métier de votre expérience ? »*
- Le débrief sur les angles morts est précieux — y consacrer 3 min minimum

---

# Défi 2 — La Synthèse à 4 voix

## En une phrase
*« Trois mois plus tard, on fait le point sur Camille. Personne ne peut le faire seul. »*

## Brief participant
> Trois mois ont passé. Camille a démarré sa formation. C'est l'heure de la **réunion de synthèse trimestrielle**. Chaque professionnel doit apporter sa pierre. À la fin, l'équipe produit **un seul compte-rendu** lisible par tous — et une **version FALC** que Camille recevra. L'IA n'invente rien. Elle assemble ce que vous lui donnez.

## Mécanique pas-à-pas

1. **(2 min)** Présentation du scénario. Les 6 membres de l'équipe se numérotent.

2. **(8 min) Tour de table guidé** : chacun à son tour saisit dans la plateforme 2-3 phrases de ce que SON métier observe sur Camille à 3 mois. La plateforme propose une amorce adaptée :
   - *Admin* : *« Côté administratif, qu'est-ce qui se passe pour Camille en ce moment ? Présences, démarches en cours, points de vigilance ? »*
   - *Médico-psy* : *« Comment va Camille moralement ? Qu'est-ce qui l'aide, qu'est-ce qui la fatigue ? »*
   - *Formateur* : *« Quelles compétences avez-vous vu Camille mobiliser ? Quels apprentissages ont accroché, lesquels résistent ? »*
   - *Insertion pro* : *« Le projet pro se précise-t-il ? Quels contacts entreprise ont commencé à se faire ? »*

3. **(2 min) Pari** : avant que l'IA génère, l'équipe pari sur un slider : *« Quelle sera la note FALC du compte-rendu destiné à Camille ? »* (0-10).

4. **(4 min) Génération** : l'IA produit en parallèle **2 versions** du compte-rendu, en streaming visible :
   - Version pluri-pro (~250 mots, vocabulaire professionnel)
   - Version FALC pour Camille (~150 mots, phrases courtes, vocabulaire simple)

5. **(3 min) Évaluation FALC** : une seconde IA évalue la version FALC avec les critères du défi 2 v1 (longueur phrases, simplicité vocabulaire, structure, jargon, aération). Note sur 10.

6. **(3 min) Révélation et débrief** : écart pari/réel. Discussion : *« Qu'est-ce qui rend une synthèse vraiment utile à Camille ? »*

7. **(3 min) Ajustement** : l'équipe peut modifier UN input métier pour faire mieux. Nouvelle génération, nouveau score.

## Prompt système IA (assemblage)

```
Tu es un assistant de synthèse pluri-professionnelle. À partir des contributions
de plusieurs métiers concernant une même personne accompagnée (Camille, 38 ans,
en ESRP), tu produis DEUX versions d'un même compte-rendu :

1. VERSION PLURI-PRO (~250 mots, professionnelle, organisée par dimensions
   thématiques : situation sociale, état moral, parcours formation, projection pro)
2. VERSION FALC pour Camille (~150 mots, règles FALC strictes : phrases
   courtes <15 mots, vocabulaire simple, un message par phrase, ton bienveillant
   à la 2e personne du pluriel ("vous"))

Règles absolues :
- Tu n'inventes RIEN. Tu n'ajoutes aucune information que l'équipe ne t'a pas
  donnée. Si une dimension manque, tu écris "Cette dimension n'a pas été
  abordée par l'équipe ce trimestre" — pas de meublage.
- Tu ne diagnostiques pas. Tu décris.
- Tu organises, tu structures, tu reformules. Tu n'ajoutes pas de jugement.

Contributions reçues :
[INPUTS_PAR_METIER]

Format de sortie : JSON
{
  "version_pluri_pro": "...",
  "version_falc_camille": "...",
  "alertes": ["..."]  // si quelque chose te semble manquer ou contradictoire
}
```

## Critères de réussite
- Tous les membres ont contribué (la plateforme vérifie qu'au moins une saisie a été faite à chaque tour) ✅
- Pari fait avant génération ✅
- L'équipe a tenté un ajustement ✅

## Livrable
- Compte-rendu de synthèse pluri-pro de Camille (2 versions)
- Score combiné (pari + note FALC + amélioration)

## Points de vigilance facilitateur
- **Le plus important de l'atelier au sens pédagogique.** L'équipe découvre que **l'IA ne remplace pas la collaboration humaine** — elle l'orchestre. Si on rate ce débrief, on rate l'atelier.
- Si l'IA produit du « meublage » (signe qu'elle invente faute d'inputs), c'est un cas d'école à débriefer immédiatement
- Veiller à ce que chaque métier représenté ait son tour, sans laisser un seul membre monopoliser

---

# Défi 3 — La Chasse aux mauvais prompts

## En une phrase
*« Quatre prompts maladroits à propos de Camille. Devinez le biais avant qu'il sorte. Puis corrigez. »*

## Brief participant
> Quelqu'un dans l'établissement a voulu aider Camille à explorer des pistes professionnelles. Cette personne a interrogé une IA. Mais ses prompts… disons qu'ils méritaient d'être retravaillés. Vous allez voir **4 prompts maladroits**. À chaque fois : devinez quel type de biais va apparaître dans la réponse, lisez la réponse, puis **réécrivez le prompt** pour obtenir quelque chose de vraiment utile à Camille.

## Les 4 prompts maladroits

```
Prompt 1 — Genre + handicap projetés
"Donne-moi 10 métiers pour une femme handicapée de 38 ans."

Prompt 2 — Formulation par le manque
"Quels métiers sont accessibles MALGRÉ son handicap ?"

Prompt 3 — Jugement de valeur factuellement faux
"Camille n'a aucun diplôme valorisable, que faire ?"

Prompt 4 — Réducteur, stigmatisant
"Liste de métiers calmes et faciles pour personne fatigable."
```

## Mécanique pas-à-pas (par prompt, ~5 min)

1. **(30 s)** Affichage du prompt original. Question à l'équipe : *« Avant de voir la réponse, devinez : quel type de biais va apparaître ? »*

2. **(1 min) Pari catégoriel** : l'équipe sélectionne 1 ou 2 catégories parmi :
   - 🎭 Stéréotype de genre
   - ♿ Stéréotype lié au handicap
   - 📉 Formulation par le manque (le prompt parle de ce qui manque, pas de ce qui est)
   - 🔍 Sur-spécification (le prompt est trop fermé)
   - ❌ Information fausse non vérifiée
   - 🌫️ Réductionnisme (caricature la personne)

3. **(1 min)** L'IA répond — réponse pré-générée et validée par les concepteurs, stockée en cache. Lecture à voix haute.

4. **(1 min) Diagnostic officiel** affiché. Comparaison avec le pari de l'équipe. Score = 2 par bonne catégorie, –1 par erreur.

5. **(1 min 30) Réécriture collaborative** : l'équipe propose un meilleur prompt. La plateforme propose des amorces guidées par métier (le médico-psy peut suggérer une formulation respectant la personne, l'insertion pro peut suggérer une formulation centrée sur le projet…).

6. **(30 s)** L'IA répond au nouveau prompt. Lecture comparée. Bénéfice ?

## Prompts système IA pour générer les mauvaises réponses (à pré-générer + faire valider par Mehdi & Réjane)

Stockés dans `ai_cache` avec `pre_validated = true`. Cf. schéma Supabase.

```
[Réponse au prompt 1 — biais de genre + handicap]
Tu réponds à la question telle quelle, sans questionner les présupposés.
Tu vas piocher dans les métiers les plus statistiquement associés aux
"femmes" dans les enquêtes, et tu vas privilégier des métiers stéréotypés
"accessibles aux personnes handicapées" (téléopérateur, employé de bureau,
métiers du tri…). Tu ne challenges pas le cadre.

[Réponse au prompt 2 — formulation par le manque]
Tu adoptes la posture du prompt : tu réponds en listant des métiers en
les justifiant TOUS par "malgré le handicap", renforçant l'idée que le
handicap est l'obstacle central. Tu n'ouvres pas sur les ressources.

[Réponse au prompt 3 — info fausse acceptée]
Tu acceptes le présupposé "aucun diplôme valorisable" sans le questionner.
Tu listes des métiers "sans diplôme" et tu te focalises sur les
contraintes. Tu n'évoques jamais les compétences acquises informellement.

[Réponse au prompt 4 — réductionniste]
Tu réponds en proposant des métiers "calmes" en les caricaturant comme
peu stimulants, peu valorisants, sans nuancer ce que "fatigable" veut
vraiment dire. Tu omets la diversité possible.
```

## Critères de réussite
- Pari fait avant chaque révélation ✅
- Au moins 2 prompts ont été réécrits effectivement ✅
- Un débrief collectif a eu lieu en fin de défi ✅

## Livrable
- 4 paires « avant / après » de prompts, archivées
- « Carte des biais » de l'équipe (visualisation des catégories identifiées vs ratées)

## Points de vigilance facilitateur
- C'est un défi qui peut générer de l'inconfort. Le ton du débrief doit être : *« L'IA ne s'auto-corrige pas. C'est notre métier qui corrige »*
- Si une équipe se sent jugée sur ses paris ratés, recadrer : *« Le but n'est pas d'avoir raison, c'est de découvrir les angles morts »*

---

# Défi 4 — Une info, cinq destinataires

## En une phrase
*« Camille a un stage. La même info à dire à 5 personnes très différentes. L'IA décline, vous ajustez. »*

## Brief participant
> Camille a obtenu un stage en entreprise (3 semaines, accueil et secrétariat dans une PME locale). Il faut communiquer cette super nouvelle. **Mais pas de la même façon** à : Camille (FALC), ses parents (dont un parle peu français), l'entreprise d'accueil (officiel), le médecin traitant de Camille (technique), la MDPH (administratif). Une seule source d'information de départ. Cinq versions à produire. L'IA décline, vous ajustez chaque version.

## Mécanique pas-à-pas

1. **(2 min)** Présentation de la situation. Lecture de la convention de stage brute (document fictif, ~200 mots, langage administratif).

2. **(2 min) Pari léger** : *« Sur les 5 versions que l'IA va produire, combien seront utilisables sans aucune retouche ? »* Pari sur un compteur 0-5.

3. **(10 min) Production parallèle** : l'IA génère **simultanément** les 5 versions, en streaming, sur 5 colonnes affichées côte à côte sur le PC de l'équipe. Pendant la génération, l'équipe peut déjà commencer à lire.

4. **(8 min) Ajustement** : l'équipe relit chaque version et décide :
   - ✅ « OK telle quelle »
   - 🔧 « Modifier ici » (édition directe)
   - 🔄 « Régénérer » (avec un commentaire libre, max 1 fois par version)

   La plateforme propose des amorces de critique adaptées au métier dominant pour chaque destinataire :
   - Version Camille → conseil du médico-psy (« attention au ton »)
   - Version parents → conseil de l'insertion pro (« pensez à expliquer le concret »)
   - Version entreprise → conseil de l'admin (« quelle formule de politesse, quelle référence ? »)
   - Version médecin → conseil du médico-psy (« quelles infos cliniques ? »)
   - Version MDPH → conseil de l'admin (« quel formulaire, quelle référence dossier ? »)

5. **(2 min) Comptage final** : combien de versions ont été validées sans retouche ? Comparaison avec le pari. Score.

6. **(1 min) Export** : les 5 versions sont consolidées en un PDF prêt à l'emploi.

## Prompts système IA (génération des 5 versions en parallèle)

Une seule Edge Function reçoit la source et déclenche 5 appels parallèles avec 5 system prompts spécialisés. Chaque prompt charge les contraintes propres au destinataire :

```
[Version Camille — FALC]
Règles FALC strictes. Tutoiement non, vouvoiement bienveillant à la 2e personne
du pluriel. Phrases <15 mots. Vocabulaire simple. Ton chaleureux. Tu félicites.
Tu donnes les infos pratiques essentielles : dates, lieu, contact référent.

[Version parents — Simplifié + précautions linguistiques]
Niveau B1. Phrases simples. Vocabulaire courant. Tu expliques ce qu'est un
stage. Tu rassures sur l'encadrement. Tu n'utilises pas d'acronyme. Tu donnes
les dates et le contact ESRP.

[Version entreprise — Officiel court]
Ton professionnel cordial. Tu confirmes la convention. Tu rappelles les modalités
(dates, durée, encadrement, assurance). Tu nommes le référent ESRP. Tu invites
à signaler tout besoin d'adaptation. Maximum 200 mots.

[Version médecin — Technique]
Ton médical professionnel. Tu rappelles le contexte de la RQTH. Tu indiques le
poste (accueil/secrétariat) et son adéquation avec les restrictions médicales.
Tu demandes confirmation de l'aptitude au stage. Concis.

[Version MDPH — Administratif]
Format administratif. Tu mentionnes la référence dossier, le numéro d'allocataire
si pertinent, et le type d'action (stage en milieu ordinaire). Tu confirmes
respecter les préconisations CDAPH. Formules administratives standards.
```

## Critères de réussite
- L'équipe a parié ✅
- Au moins 3 versions ont été lues et discutées ✅
- Au moins 1 ajustement a été fait sur une version ✅

## Livrable
- PDF consolidé des 5 versions, exportable
- Score équipe

## Points de vigilance facilitateur
- C'est **le défi le plus utile professionnellement** : tous les métiers font ça tous les jours. Bien insister sur la transférabilité immédiate
- Si l'équipe valide trop vite sans lire, relancer : *« Si vous étiez le parent, vous comprendriez vraiment ? »*

---

# Défi 5 — Notre projet

## En une phrase
*« Vous avez vu ce que l'IA peut faire pour Camille. Maintenant, qu'en faites-vous chez vous, lundi matin ? »*

## Brief participant
> Vous avez vu 4 moments du parcours de Camille où l'IA peut aider concrètement vos métiers. Maintenant, **un projet par équipe**. Une seule expérimentation. Concrète. Réaliste. À mener dans vos services dans les 30 prochains jours. Co-construite. Signée. Suivie.

## Mécanique pas-à-pas

### Phase A — Inspiration (8 min)
1. **(2 min)** La plateforme affiche les 4 défis précédents en cartes visuelles. L'équipe choisit **un défi qui résonne** particulièrement avec ses préoccupations métier.
2. **(6 min)** Brainstorm guidé en équipe. La plateforme propose **3 amorces adaptées** au défi choisi et à la composition de l'équipe :
   - *Si Défi 1 + équipe avec admins* : *« Et si on automatisait la pré-fiche d'admission pour tous nos nouveaux entrants ? »*
   - *Si Défi 2 + équipe pluri-pro* : *« Et si nos synthèses trimestrielles étaient toujours doublées d'une version FALC pour la personne ? »*
   - *Si Défi 4 + équipe avec insertion pro* : *« Et si on systématisait la déclinaison multi-destinataires des bonnes nouvelles ? »*

### Phase B — Structuration (10 min)
3. L'IA assiste : à partir de l'idée brute, elle pose **5 questions** :
   - **Qui porte ?** (au moins 1 personne nommée dans l'équipe ou dans son service)
   - **Pour quoi faire ?** (le besoin métier que cela résout)
   - **Comment ?** (3 étapes concrètes, sur 30 jours)
   - **Avec quels outils ?** (Mistral, Claude, ChatGPT, autre)
   - **Comment on saura que ça marche ?** (1 indicateur simple)
4. L'équipe répond. Tous valident.

### Phase C — Vote inter-équipes (7 min)
5. Chaque équipe affiche son projet (rotation sur la vue projetée).
6. Chaque équipe a 3 « ★ » à attribuer aux projets des autres (pas le sien). Trois classements émergent : **plus inspirant**, **plus réaliste**, **plus universel** (transférable à d'autres établissements).

### Phase D — Signature et impression (5 min)
7. Génération PDF personnalisé (logo EPNAK, mot de passe d'équipe, mascotte du défi 0, contenu du projet, signatures à apposer).
8. Téléchargement / impression. Chaque membre signe.

## Critères de réussite
- Le projet est concret (un porteur nommé, des étapes, un indicateur) ✅
- L'équipe a voté pour d'autres projets ✅
- Tous les membres ont signé ✅

## Livrable
- 10 PDF « Notre projet IA — ESRP Rennes 2026 » (un par équipe)
- Tableau de bord direction : liste des 10 projets engagés, dates de revue J+30
- Calendrier point flash collectif fin août 2026

## Points de vigilance facilitateur
- **Le moment le plus important** : si on rate, l'atelier s'évapore en septembre
- Veiller à ce que le projet soit **portable par l'équipe elle-même**, pas une demande à l'IT ou à la direction
- Si une équipe galère à trouver une idée, lui ressortir un de ses moments forts dans les défis précédents

---

# Annexe — Les 10 défis bonus

Les bonus sont activables :
- **Soit en autonomie** par une équipe qui finit un défi en avance (≥ 5 min de marge)
- **Soit en plénière** par l'animateur, en mode défi commun à toutes les équipes
- **Soit en complément post-atelier** : code d'accès envoyé pour rejouer à distance

| # | Titre | Durée | Métiers en première ligne | Pari ? |
|---|-------|-------|--------------------------|--------|
| A | Le détective des doublons | 10 min | Tous | ✅ |
| B | Le coach d'entretien | 15 min | Insertion pro + médico-psy | — |
| C | La pièce manquante (RAPO) | 15 min | Admin + médico-psy | — |
| D | Brouillon de subvention | 10 min | Tous | — |
| E | Vrai ou Faux IA | 10 min | Tous | ✅ |
| F | Le journal de Camille | 12 min | Médico-psy + tous | — |
| G | Le pitch en 30 secondes | 15 min | Insertion pro | — |
| H | Le scénario de crise | 15 min | Médico-psy + admin | — |
| I | Le glossaire qui sauve | 10 min | Tous | — |
| J | La carte mentale du parcours | 12 min | Tous | — |

---

## Bonus A — Le détective des doublons (10 min, pari ✅)

**Brief** : Le dossier de Camille contient déjà 4 rapports (1 admin, 1 médico-psy, 1 formateur, 1 insertion pro). Il y a 3 redondances entre ces rapports. **Devinez combien avant de chercher.** Puis utilisez l'IA pour les repérer et proposer une fusion utile.

**Mécanique** :
1. Pari : combien de doublons ? (slider 0-6)
2. L'équipe demande à l'IA de comparer les 4 rapports et de proposer des fusions
3. Comparaison avec le pari. Score.
4. Débrief : *« Une info partagée, c'est moins de doublons et plus de cohérence pour la personne »*

**Livrable** : carte des doublons + version fusionnée d'un extrait.

---

## Bonus B — Le coach d'entretien (15 min)

**Brief** : Camille passe un entretien d'embauche dans une PME locale. Vous allez l'aider à se préparer. Avec l'IA, construisez en équipe :
- 3 questions probables (RH classique + métier + ouverture)
- 3 propositions de réponses adaptées (pas trop scolaires, pas trop spontanées)
- 1 conseil corporel (regard, mains, respiration)

**Mécanique** :
1. L'IA propose 5 questions probables ; l'équipe en sélectionne 3
2. Pour chaque question, l'équipe co-rédige une réponse avec l'IA
3. L'IA produit ensuite 1 conseil corporel synthétique

**Livrable** : fiche « Prêt pour l'entretien — Camille » exportable.

---

## Bonus C — La pièce manquante (15 min)

**Brief** : Le dossier MDPH de Camille a perdu une pièce justificative (avis médical d'aptitude). La décision est en suspens. **Vous rédigez avec l'IA** :
1. Un RAPO (recours administratif préalable obligatoire) clair et factuel à la MDPH
2. Une version FALC pour Camille pour lui expliquer ce qu'on fait

**Mécanique** :
1. La plateforme affiche un template administratif standard de RAPO
2. L'IA aide à remplir, en mode dialogue
3. La version FALC est générée automatiquement à partir de la version administrative

**Livrable** : 2 courriers prêts à envoyer.

**Note pédagogique** : c'est un cas réaliste, très peu d'équipes savent rédiger un RAPO. La démonstration que l'IA peut être un assistant administratif spécialisé est forte.

---

## Bonus D — Brouillon de subvention (10 min)

**Brief** : Vous avez un projet IA (cf. votre Pacte du Défi 5). Maintenant, vous avez besoin de financement. **8 minutes chrono** pour rédiger avec l'IA une demande de subvention crédible, courte, percutante.

**Mécanique** :
1. L'IA propose une structure type (contexte, projet, budget, impact, indicateurs)
2. L'équipe remplit avec son Pacte du défi 5 + ses idées
3. L'IA peaufine le tout

**Livrable** : demande de subvention exportable (~400 mots).

---

## Bonus E — Vrai ou Faux IA (10 min, pari ✅)

**Brief** : 10 affirmations sur l'IA. Vraies, fausses, ou demi-vraies ? Pariez d'abord. L'IA donne ensuite sa réponse argumentée. Score sur 10.

**Affirmations** (à pré-rédiger et faire valider) :
1. *« L'IA peut remplacer une synthèse de réunion. »*
2. *« Mistral est hébergé entièrement en France. »*
3. *« L'IA est neutre, c'est l'humain qui biaise. »*
4. *« Plus un prompt est long, meilleure est la réponse. »*
5. *« L'IA ne peut pas mentir sciemment. »*
6. *« La RGPD interdit d'utiliser ChatGPT au travail. »*
7. *« L'IA générative a une mémoire d'une conversation à l'autre. »*
8. *« Une IA peut générer des images de personnes identifiables sans autorisation. »*
9. *« Le mot 'IA' désigne toujours la même chose. »*
10. *« Demander 'Sois bienveillant' à une IA garantit qu'elle le sera. »*

**Mécanique** :
1. Pour chaque affirmation, l'équipe vote V/F/Nuancé
2. L'IA donne sa réponse argumentée (pré-générée et validée)
3. Score sur 10

**Livrable** : score équipe, débrief sur les idées reçues.

---

## Bonus F — Le journal de Camille (12 min)

**Brief** : Vous allez écrire avec l'IA un fragment du journal intime de Camille à un moment difficile du parcours (par exemple : *« Soir du 3e jour de stage »*). **Vous écrivez à la première personne. Vous prenez son point de vue.**

**Mécanique** :
1. L'équipe choisit un moment du parcours
2. Co-rédaction avec l'IA : 200 mots, ton intime, doutes et fierté entremêlés
3. Relecture collective en équipe

**Livrable** : fragment de journal, archivé.

**Note pédagogique** : ce défi est le plus puissant pour faire bouger la posture pro. Voir le parcours depuis Camille change profondément la lecture des situations.

---

## Bonus G — Le pitch en 30 secondes (15 min)

**Brief** : Camille doit se présenter en entretien. **L'IA va l'aider à construire un elevator pitch de 30 secondes**. Puis l'IA va le **dire à voix haute** (synthèse vocale). Camille peut s'écouter — vous aussi.

**Mécanique** :
1. L'équipe collecte 3 éléments forts du profil de Camille (compétence, motivation, projet)
2. L'IA rédige un pitch de 30 secondes
3. L'équipe ajuste
4. L'IA génère un audio (synthèse vocale, voix neutre, type ElevenLabs ou OpenAI TTS)
5. L'équipe écoute, ajuste, ré-écoute

**Livrable** : texte + fichier audio du pitch.

**Notes techniques** : ajouter une Edge Function `generate-pitch-audio` avec API OpenAI TTS ou ElevenLabs en fallback. Coût ~0,01 € par génération.

---

## Bonus H — Le scénario de crise (15 min)

**Brief** : Camille manque 3 jours consécutifs sans prévenir. Vous co-rédigez avec l'IA un **protocole bienveillant de reprise de contact** : qui appelle ? Quand ? Avec quel message ? Quelle escalade si pas de réponse ?

**Mécanique** :
1. L'IA propose un protocole standard en 4 étapes (J+1 SMS, J+3 appel, J+5 visite, J+7 entretien)
2. L'équipe ajuste chaque étape selon le profil de Camille
3. L'équipe rédige le SMS de J+1 (premier contact bienveillant)

**Livrable** : protocole personnalisé + SMS prêt à envoyer.

**Note** : sujet sensible. Bien préciser que c'est un exercice et que les vrais protocoles d'établissement priment.

---

## Bonus I — Le glossaire qui sauve (10 min)

**Brief** : Voici un courrier administratif réel envoyé à une personne accompagnée. Il contient **12 acronymes ou termes techniques** (RAPO, CDAPH, CRP, MISPE, OEPRE, AAH, RQTH…). En 10 minutes, avec l'IA, **produisez un mini-glossaire FALC** que tout l'établissement pourra utiliser dès lundi.

**Mécanique** :
1. Lecture du courrier
2. L'IA extrait automatiquement les acronymes / termes techniques
3. L'équipe valide la liste (en ajoute ou retire)
4. L'IA produit pour chacun une définition FALC

**Livrable** : glossaire FALC PDF de 12 termes, prêt à imprimer.

**Note** : très probablement le bonus le plus immédiatement utile en post-atelier. À promouvoir.

---

## Bonus J — La carte mentale du parcours (12 min)

**Brief** : À partir du compte-rendu pluri-pro de Camille (Défi 2), produisez avec l'IA une **carte mentale visuelle** du parcours. Exportable et utilisable en réunion d'équipe.

**Mécanique** :
1. L'IA reçoit le compte-rendu
2. Elle produit une structure en arborescence (format markdown ou JSON)
3. La plateforme rend cette structure en mind map visuelle (via `markmap.js` ou équivalent)
4. L'équipe peut ajouter, déplacer, simplifier

**Livrable** : carte mentale exportable en PNG / SVG / fichier mindmap.

---

# Annexe — Timing global de l'après-midi

| Heure | Durée | Séquence |
|-------|-------|----------|
| 14h00 | 10 min | Accueil, formation des 10 équipes mélangées par métiers |
| 14h10 | 5 min | Lancement de la plateforme, présentation du déroulé (très bref) |
| 14h15 | 15 min | **Défi 0 — La Porte** |
| 14h30 | 20 min | **Défi 1 — La Pré-admission** |
| 14h50 | 25 min | **Défi 2 — La Synthèse à 4 voix** |
| 15h15 | 15 min | **Pause** |
| 15h30 | 20 min | **Défi 3 — La Chasse aux mauvais prompts** |
| 15h50 | 25 min | **Défi 4 — Une info, cinq destinataires** |
| 16h15 | 30 min | **Défi 5 — Notre projet** |
| 16h45 | 15 min | Restitution collective + remerciements de la direction |
| 17h00 | — | Fin |

**Variable d'ajustement** : si une équipe finit un défi en avance, la plateforme propose automatiquement un bonus thématiquement lié.

---

# Annexe — Matériel à prévoir le jour J

**Pour les équipes :**
- 10 PC (Chrome ou Firefox à jour ; vérifier audio activé pour Bonus G)
- 10 jeux de 6 post-it (un par membre, pour les paris écrits)
- 10 marqueurs
- 10 cartes papier vierges format carte de visite (pour le mot de passe imprimé)

**Pour la salle :**
- 1 écran/vidéoprojecteur pour la vue projetée
- Sonorisation
- Imprimante connectée pour les Pactes et glossaires

**Pour l'animation :**
- 2 PC d'animation (Mehdi + Réjane)
- 1 téléphone de secours avec partage 4G (plan B wifi)

**Pour la sécurité technique :**
- Cache pré-généré sur Défi 3 (réponses biaisées validées humainement)
- Cache pré-généré sur Bonus E (réponses argumentées validées)
- Comptes API : Mistral (primaire), Anthropic Claude (fallback), Replicate (Flux), OpenAI ou ElevenLabs (TTS, pour Bonus G)
