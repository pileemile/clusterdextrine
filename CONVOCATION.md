# Fiche PDF — Ciel

`GET /api/weather/{id}/releve.pdf` — cookie `ciel_lecteur` (HttpOnly, SameSite=Lax). `?download=true` → `attachment`, sinon `inline`.

## 1. Contrat

| | |
| --- | --- |
| 200 | `Content-Type: application/pdf` · `Content-Disposition` · `Cache-Control: no-store` · `X-Content-Type-Options: nosniff` · `releve-{id}.pdf` |
| 401 | pas de cookie · `Votre session a expiré. Reconnectez-vous.` |
| 404 | id inconnu, ou `owner` ≠ cookie · `Ce relevé est introuvable.` · aucun PDF |
| 409 | `status=CANCELLED` · `Ce relevé est annulé : il n'a plus de fiche.` · aucun PDF |
| 500 | `La fiche n'a pas pu être préparée.` |

Sans `owner` : publique. Créé dans Ciel : `owner` = cookie. Autre cookie → 404.

## 2. Où

`src/pdf/releve.js`, process Node.  
Même PDF pour chaque lecteur : accents, heure de Paris, police DejaVu embarquée.  
Le navigateur reçoit le PDF, pas le document Mongo.

## 3. Fuseau

Sans `Europe/Paris`, `2026-11-24T08:30:00Z` imprime 8 h 30. Avec : 9 h 30. Été `2026-07-07T07:30:00Z` : 9 h 30.

## 4. Preuves

`6afad87696aa04ad06dc4b1f` — créé, puis supprimé. `Hélène Durand`, `mardi 24 novembre 2026`, `9 h 30`. 1 page, 17 806 octets.

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="releve-6afad87696aa04ad06dc4b1f.pdf"
Cache-Control: no-store
X-Content-Type-Options: nosniff
Content-Length: 17806
```

`?download=true` → `Content-Disposition: attachment; filename="releve-6afad87696aa04ad06dc4b1f.pdf"`

Autre cookie, même id :

```
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{"error":"Ce relevé est introuvable."}
```

Après `status=CANCELLED` :

```
HTTP/1.1 409 Conflict
Content-Type: application/json; charset=utf-8

{"error":"Ce relevé est annulé : il n'a plus de fiche."}
```

Sans cookie : `401` · `Votre session a expiré. Reconnectez-vous.`

## 5. Document long

Non codé. Récapitulatif annuel.

| | |
| --- | --- |
| Commander | `POST /api/stations/{id}/annee` · cookie `ciel_lecteur` · 202 · `Location: /api/stations/{id}/annee/{tache}` · jeton CSRF |
| Suivre | `GET /api/stations/{id}/annee/{tache}` · toutes les 2 s · 60 fois max · `PENDING` `RUNNING` `DONE` `FAILED` |
| Télécharger | `GET /api/stations/{id}/annee/{tache}/fichier` · 200 `application/pdf`, `no-store` · 409 si pas prêt · 404 si autre cookie |
| Fichier | propriétaire = cookie · 7 jours, puis supprimé |

## Tests

`npm test` — 21 tests, 21 pass, 0 fail.
