/**
 * GPS Travel Tracker
 * Uses navigator.geolocation.watchPosition + Haversine formula
 * to track running distance for zone travel.
 */

/**
 * Haversine distance between two GPS points, in km.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Start GPS-based travel tracking.
 *
 * @param {object} opts
 * @param {number}   opts.targetKm   - Distance to cover in km
 * @param {function} opts.onProgress - Called with (distanceDoneKm, targetKm) after each update
 * @param {function} opts.onComplete - Called when targetKm is reached
 * @param {function} opts.onError    - Called with a human-readable error message
 *
 * @returns {{ stop: function, getDistance: function }}
 */
export function startGpsTravel({ targetKm, onProgress, onComplete, onError }) {
  if (!navigator.geolocation) {
    onError('Le GPS n\'est pas disponible sur cet appareil.');
    return { stop: () => {}, getDistance: () => 0 };
  }

  let totalKm = 0;
  let lastPos = null;
  let watchId = null;
  let completed = false;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (completed) return;
      const { latitude, longitude } = pos.coords;
      const ts = pos.timestamp;

      if (lastPos !== null) {
        const d = haversineKm(lastPos.lat, lastPos.lon, latitude, longitude);
        const dt = (ts - lastPos.ts) / 1000; // secondes
        // Filtre anti-bruit : ignore les bonds > 25 km/h (bruit GPS courant)
        // et les segments < 1 m (position fixe)
        const speedKmh = dt > 0 ? (d / dt) * 3600 : 0;
        if (d > 0.001 && speedKmh < 25) {
          totalKm += d;
          onProgress(totalKm, targetKm);
          if (totalKm >= targetKm) {
            completed = true;
            navigator.geolocation.clearWatch(watchId);
            onComplete();
          }
        }
      }

      lastPos = { lat: latitude, lon: longitude, ts };
    },
    (err) => {
      const msgs = {
        1: 'Accès au GPS refusé. Autorisez la localisation dans les paramètres.',
        2: 'Position GPS introuvable. Assurez-vous d\'être en extérieur.',
        3: 'Le GPS a mis trop de temps à répondre. Réessayez.',
      };
      onError(msgs[err.code] || 'Erreur GPS inconnue.');
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );

  return {
    stop() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    },
    getDistance() {
      return totalKm;
    },
  };
}
