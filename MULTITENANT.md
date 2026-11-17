# Multi-tenant — Ciel

Base partagée + `tenantId`. Seed : `npm run seed` → `observatoire-alpes`, `station-littoral`, `membre@clusterdextrine.test` (les deux), `autre@clusterdextrine.test` (Alpes).

## 1. Modèle

| Données | `tenantId` | Lecture | Écriture |
| --- | --- | --- | --- |
| Relevé Ciel (`data`) | oui | son tenant | son tenant |
| Relevé d'exemple (`data`) | absent | tous | PUT / DELETE → 404 |
| A/B (`ab_assignments`) | oui | son tenant | son tenant |
| `tenant`, `users`, `memberships` | — | hors plugin | seed |

Index : `{ tenantId, st, ts }` (partiel) sur `data` · `{ tenantId, experiment, visitorId }` sur `ab_assignments`.

## 2. Trajet

| Étape | Où |
| --- | --- |
| URL `/c/:slug/` | `index.html`, `tenantFromPath` (`public/tenant.js`) |
| En-tête | `api()` → `X-Tenant` · SSE → `?tenant=` (`/api/weather/events`) |
| Middleware | `src/tenant/middleware.js` sur `/api` |
| Contexte | `AsyncLocalStorage` · `runWithTenant` / `getTenant` (`src/tenant/context.js`) |
| Plugin | `src/tenant/plugin.js` sur `Weather`, `AbAssignment` |
| SSE | abonnés rangés par `tenantId` · `changed()` filtre (`src/sse/weatherEvents.js`) |

Hors middleware : `/api-docs`, `/otlp`, `/api/tenants`, `/api/google`.

Middleware : absent / mal formé → 400 · inconnu / non-membre (`X-User`) → 404 `Tenant introuvable.` · sinon `runWithTenant(tenant, next)`.

## 3. Administration

L'identité d'un administrateur est établie par Google OAuth, puis conservée
dans une session serveur (`ciel_session`). `X-User` reste uniquement un
mécanisme de compatibilité pour les démonstrations et ne donne aucun accès
administrateur.

Après la première connexion Google de l'utilisateur, un administrateur existant
peut lui accorder le rôle :

```bash
npm run admin:grant -- admin@example.com
```

Les routes `/api/admin/*` répondent `401` sans session et `403` aux utilisateurs
non administrateurs. Elles permettent de gérer les utilisateurs,
appartenances, tenants et relevés. Un administrateur ne peut pas retirer son
propre rôle.

### 2FA administrateur

Un administrateur doit activer TOTP après sa première connexion Google :

```http
POST /api/auth/2fa/enroll
POST /api/auth/2fa/verify
Content-Type: application/json

{"code":"123456"}
```

La première réponse fournit l'URL `otpauth://` à importer dans une application
d'authentification. La vérification renvoie dix codes de récupération : ils
doivent être conservés hors de l'application. Chaque code est utilisable une
seule fois. Tant que le TOTP n'est pas activé ou validé dans la session,
`/api/admin/*` reste inaccessible.

Plugin : lectures filtrées (+ docs sans `tenantId` pour `Weather`) · écritures filtrées · `save` pose `tenantId` · `aggregate` → `$match` en tête · sans contexte → erreur.

## 3. Changement de tenant

`switchTo(slug)` (`public/app.js`) :

1. refuse si absent de `/api/tenants`
2. `clearTenantView()` — caches, listes, PDF, géocode · `nearby.js` sur `tenantchange`
3. `setTenant` → `generation++`, abort des requêtes
4. `pushState('/c/' + slug + '/')`
5. ferme / rouvre SSE avec `?tenant=`
6. `safeColor` sur le bandeau
7. recharge

Réponse en retard : `generation` changée → `AbortError`, rien n'est affiché.

## 4. Tests

`npm test` — 80 pass, 0 fail, 0 ignoré. Base mémoire · `observatoire-a` / `observatoire-b` (`test/helpers.js`).

| Test | Prouve | Résultat |
| --- | --- | --- |
| middleware | 400 / 400 / 404 / 404 (non-membre = inconnu) | pass |
| `/api/tenants` | `autre@` → A · `membre@` → A+B | pass |
| liste A vs B | relevé A absent de B | pass |
| GET PUT DELETE PDF depuis B | 404, doc A inchangé | pass |
| exemple sans `tenantId` | lecture OK · PUT/DELETE 404 | pass |
| doublon `st`/`ts` | 201 A+B · 409 dans A | pass |
| SSE | A notifié · B rien | pass |
| hors contexte | `find` / `countDocuments` rejettent | pass |
| métriques (défi) | A inchangé après conversion B | pass (rouge avant §5) |
| `tenantFromPath` | `/c/../`, `/c/<script>/` → `null` | pass |
| `safeColor` | hex minuscules · sinon défaut | pass |
| `api()` | `X-Tenant` posé | pass |
| réponse en retard | après `setTenant` → `AbortError` | pass |

Manuel (`npm run seed` · `npm start`) :

| | Résultat |
| --- | --- |
| deux onglets Alpes / Littoral · relevé Alpes invisible · pas de SSE Littoral | à faire |
| Network · rejouer avec `X-Tenant: station-littoral` | à faire |

## 5. Défi — `GET /api/ab/metrics`

Fuite : `metrics()` · `$match: { experiment }` seul · `src/services/abService.js`.

`test/metricsIsolation.test.js` sur `552cea4` (avant le plugin) :

```
not ok 1 - les métriques de A ne bougent pas quand un visiteur convertit dans B
+       converted: 1
-       converted: 0
```

Correction : hook `aggregate` du plugin → `$match: { tenantId }`. `metrics()` inchangé. Test vert.

Limites :

- pas de RLS Mongo · plugin contournable via driver / `mongosh`
- pas de vraie auth · `X-User` fictif
- exemples partagés lisibles volontairement
- slug front `^[a-z0-9]+(?:-[a-z0-9]+)*$` ≠ back `^[a-z0-9-]{2,40}$`
