const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LAT = 111.2;

function haversineKm(lat1, lon1, lat2, lon2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = phi2 - phi1;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const h =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function roundKm(km) {
  return Math.round(km * 10) / 10;
}

function around(lat, lon, radiusKm) {
  const dLat = radiusKm / KM_PER_DEGREE_LAT;
  const minLat = Math.max(-90, lat - dLat);
  const maxLat = Math.min(90, lat + dLat);
  const cos = Math.cos((lat * Math.PI) / 180);
  if (Math.abs(cos) < 1e-6) {
    return { minLat, maxLat, minLon: -180, maxLon: 180, wraps: false };
  }
  const dLon = radiusKm / (KM_PER_DEGREE_LAT * Math.abs(cos));
  if (dLon >= 180) {
    return { minLat, maxLat, minLon: -180, maxLon: 180, wraps: false };
  }
  let minLon = lon - dLon;
  let maxLon = lon + dLon;
  if (minLon < -180 || maxLon > 180) {
    if (minLon < -180) minLon += 360;
    if (maxLon > 180) maxLon -= 360;
    return { minLat, maxLat, minLon, maxLon, wraps: true };
  }
  return { minLat, maxLat, minLon, maxLon, wraps: false };
}

module.exports = { EARTH_RADIUS_KM, KM_PER_DEGREE_LAT, haversineKm, roundKm, around };
