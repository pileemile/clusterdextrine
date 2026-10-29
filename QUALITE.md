# Qualité — Ciel

Le TP MediSlot est appliqué à ce dépôt Node (API Express et pages dans `public/`). Deux projets SonarQube : `ciel-backend` et `ciel-frontend`. Serveur local Community Build 26.10.0.133078, statut UP. Les chiffres viennent des tableaux de bord après analyse, pas d’une estimation.

Les notes sont celles du mode MQR : 1 = A, 3 = C, 4 = D. La porte de cette première analyse est Passed parce qu’elle ne juge que le nouveau code, et qu’une première analyse n’en a pas.

## 1 · Les mesures (étapes 2 et 3)

Analyse en version 1.0, le 29 octobre 2026.

| Projet | Lignes | Sécu. | Fiab. | Maint. | Couverture | Dupl. | Porte |
| --- | --- | --- | --- | --- | --- | --- | --- |
| back | 888 | C | C | A | 30,3 % | 0 % | Passed |
| front | 3095 | C | D | A | 8,0 % | 0 % | Passed |

Couverture produite par `npm run coverage` (6 tests verts) et lue dans `coverage/backend.lcov.info` et `coverage/frontend.lcov.info`. Le journal du scanner indique `Analysing` de ces fichiers, sans « Could not resolve », puis `ANALYSIS SUCCESSFUL`.

## 2 · Les problèmes (étapes 4 et 5)

Avant correction : 3 problèmes ouverts côté back, 22 côté front. Après la version 1.1 : 2 et 18. Les deux règles corrigées sont Closed.

| # | Problème (fichier:ligne) | Règle | Décision et raison | Preuve |
| --- | --- | --- | --- | --- |
| 1 | `src/index.js:13` — `cors()` accepte toute origine. Sécurité, MEDIUM. | javascript:S5122 | Corriger. Le navigateur charge le front sur ce même serveur, donc aucune origine tierce n’est nécessaire. | Closed le 29 oct. 2026 à 16:29. Ouverts back : 3 puis 2. Commit `e0a8f24`. |
| 2 | `public/app.js:661` et `:676` — `Math.random` choisit un relevé. Sécurité, MEDIUM. | javascript:S2245 | Corriger. Le tirage d’écran passe par `crypto.getRandomValues`. | Closed le 29 oct. 2026 à 16:29. Ouverts front : 22 puis 18. Commit `f32472f`. |
| 3 | `public/app.js:661` et `:676` — `\| 0` à la place de `Math.trunc`. Fiabilité et maintenabilité, HIGH. | javascript:S7767 | Corriger. Les deux lignes ont disparu avec le même tirage. | Closed dans le même commit `f32472f`, à 16:29. |
| 4 | `src/routes/weatherRoutes.js:42` — `parseInt` plutôt que `Number.parseInt`. Fiabilité, MEDIUM. La ligne 43 est la même règle sur `limit`. | javascript:S7773 | Accepter. L’appel a déjà le radix 10, et les bornes de page sont autour. `Number.parseInt` ne change pas la pagination. | Toujours ouvert après la 1.1. Aucun statut modifié dans SonarQube. |
| 5 | `public/app.js:281` — `loadList()` n’est pas attendu. Fiabilité, MEDIUM. Dix-sept autres appels du même type restent ouverts. | javascript:S9383 | Accepter. Après l’envoi de la file, la liste se recharge sans bloquer l’écran. `loadList` affiche déjà son erreur. | Toujours ouvert après la 1.1. Aucun statut modifié dans SonarQube. |
| + | `src/routes/weatherRoutes.js:144` — deux créations simultanées du même `st` et du même `ts` peuvent passer toutes les deux le `exists` avant l’insert. | aucune | SonarQube ne voit pas cette course. Un index unique sur la station et l’heure la fermerait. | Non signalé. |

Les tests sont restés verts : 6 sur 6.

## 3 · La porte (étape 6)

Porte `MediSlot-TP`, copie de « Sonar way », associée aux deux projets. Conditions gardées : aucun nouveau problème, couverture du nouveau code au moins 80 %, duplications du nouveau code au plus 3 %, hotspots revus à 100 %. Aucun seuil n’a été baissé.

Le serveur ignore par défaut la porte sur un tout petit changement (`sonar.qualitygate.ignoreSmallChanges`). Ce réglage a été passé à `false` sur l’instance locale, pour qu’une seule ligne soit jugée.

Une comparaison `==` ajoutée dans `variantFor` n’a pas été signalée par le profil JavaScript. Le défaut qui fait échouer la porte est donc un `Math.random()` ajouté puis retiré dans `src/services/abService.js` (ligne 58 pendant l’analyse en échec).

| | |
| --- | --- |
| Condition en échec | `new_violations` supérieur à 0 |
| Valeur | 1 (javascript:S2245) |
| Couverture du nouveau code | 100 % (condition Passed) |
| Version 1.2 avec le défaut | Failed — analyse du 29 oct. 2026 à 16:34, 21 s |
| Version 1.2 sans le défaut | Passed — analyse du 29 oct. 2026 à 16:35, 23 s. La règle S2245 de ce fichier est Closed. |

Le front, sans ce défaut, est resté Passed.

Bonus GitHub Actions : le workflow `.github/workflows/qualite.yml` est dans le dépôt (deux jobs, `fetch-depth: 0`, `sonar.qualitygate.wait=true`, jeton lu depuis le secret `SONAR_TOKEN`). Liens des exécutions rouge puis verte : **Non fait**. Un runner GitHub ne joint pas ce SonarQube, qui n’écoute que sur `127.0.0.1:9000`.
