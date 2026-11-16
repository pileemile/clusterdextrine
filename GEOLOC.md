# Autour de moi — Ciel

`GET /api/weather?lat=&lon=&radiusKm=&page=&size=`

## 1. Contrat

| Paramètre | Règle | Défaut |
| --- | --- | --- |
| `lat` | degrés, -90 à 90, avec `lon` | |
| `lon` | degrés, -180 à 180, avec `lat` | |
| `radiusKm` | > 0 et ≤ 20 | 5 |
| `page` | entier ≥ 0 | 0 |
| `size` | 1 à 50 | 6 |

Tri : distance exacte, `callLetters`, `id`. `distanceKm` au dixième après le tri.  
`lat` + `lng` sans `lon` : filtre ville, inchangé.

| Requête | Réponse |
| --- | --- |
| `lat` sans `lon` | 400 `Indiquez lat et lon ensemble.` |
| `lat=95&lon=4.8` | 400 `Latitude invalide : entre -90 et 90 degrés.` |
| `lat=abc&lon=4.8` | 400 `Paramètre invalide : lat.` |
| `lat=NaN&lon=4.8` | 400 `Latitude invalide : entre -90 et 90 degrés.` |
| `radiusKm=30` | 400 `Rayon invalide : plus de 0 et au plus 20 km.` |

Réponse : `items`, `page`, `size`, `total`. Pas la position demandée.

## 2. Adresse

`https://data.geopf.fr/geocodage/search` — sans clé, 50 req/s/IP.  
Cache : même texte, casse et espaces ignorés, un appel. Score < 0,5 : `Adresse introuvable. Précisez la ville.`  
GeoJSON : `[longitude, latitude]`.

`q=69002&limit=1` → `[4.826148, 45.750351]`, score 0,86, `Lyon 2e Arrondissement`.

## 3. Position

Clic **Autour de moi (5 km)**. Pas au chargement.  
`enableHighAccuracy: false`, 10 s, position de moins de 5 min. Envoi à 3 décimales (~111 m).

| Cas | Phrase |
| --- | --- |
| page non HTTPS | `La page n'est pas en HTTPS. Saisissez une adresse ou un code postal.` |
| refus | `Localisation refusée. Saisissez une adresse ou un code postal.` |
| capteur muet | `Position introuvable pour le moment. Saisissez une adresse.` |
| délai | `La localisation prend trop de temps. Réessayez ou saisissez une adresse.` |
| 429 | `Le service d'adresses est occupé. Réessayez.` |

Pas de `console` dans `src/geo/`. Pas de colonne. Pas de `localStorage`. Journal du process : aucune coordonnée. Collecteur : `?…` retiré de `url.full`.

## 4. Preuves

Place Bellecour `lat=45.7576&lon=4.8317&radiusKm=5` → `200`, `total: 0`.

`lat=51.9&lon=3.6&radiusKm=5` → `200`, `total: 59`, `size: 6`, premier `PLAT`, `distanceKm: 0`.

`lat=45.75` → `400` `Indiquez lat et lon ensemble.`  
`lat=95&lon=4.8` → `400` `Latitude invalide : entre -90 et 90 degrés.`  
`lat=abc&lon=4.8` → `400` `Paramètre invalide : lat.`  
`radiusKm=30` → `400` `Rayon invalide : plus de 0 et au plus 20 km.`

## 5. Carte

Leaflet 1.9.4. Cercle 5 km. Marqueurs de la page. `© OpenStreetMap contributors`. Liste si la carte ne charge pas.  
PostGIS : non. MongoDB. Boîte, puis haversine.

## 6. À vol d'oiseau

Sphère, rayon 6 371 km. Nashville → Los Angeles : 2 886,444 km.  
Pas la route. Pas un temps de trajet. Écart avec l'ellipsoïde : < 0,5 %.

## Tests

`npm test` — 35 tests, 35 pass, 0 fail.
