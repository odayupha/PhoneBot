import { ref, onValue, push, remove, query, orderByChild, limitToLast } from 'firebase/database';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { rtdb } from '../firebase/config';

// ============================================================
// UTILITY: Haversine distance
// ============================================================
function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ============================================================
// UTILITY: Catmull-Rom spline (fallback when OSRM unavailable)
// ============================================================
function catmullRomSegment(p0, p1, p2, p3, numSubdivisions = 6, tension = 0.5) {
  const points = [];
  for (let i = 1; i <= numSubdivisions; i++) {
    const t = i / numSubdivisions;
    const t2 = t * t;
    const t3 = t2 * t;

    const lat = tension * (
      (2 * p1[0]) +
      (-p0[0] + p2[0]) * t +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
    );

    const lon = tension * (
      (2 * p1[1]) +
      (-p0[1] + p2[1]) * t +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
    );

    points.push([lat, lon]);
  }
  return points;
}

function smoothRoute(waypoints, subdivisions = 6) {
  if (!waypoints || waypoints.length < 3) return waypoints || [];

  const result = [waypoints[0]];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p0 = waypoints[Math.max(0, i - 1)];
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)];
    const interpolated = catmullRomSegment(p0, p1, p2, p3, subdivisions);
    result.push(...interpolated);
  }
  return result;
}

// ============================================================
// OSRM Match API — snap GPS trace to actual roads (free, no key)
// ============================================================
const OSRM_BASE = 'https://router.project-osrm.org/match/v1/driving';
const OSRM_MAX_COORDS = 100; // API limit per request

/**
 * Call OSRM Match API to snap an array of [lat, lon] onto roads.
 * Returns an array of [lat, lon] representing the road-snapped geometry,
 * or null on failure.
 */
async function osrmMatchCoordinates(coords) {
  if (!coords || coords.length < 2) return null;

  try {
    // OSRM expects lon,lat (opposite of our [lat,lon])
    // Batch into chunks of OSRM_MAX_COORDS with 1-point overlap
    const allSnapped = [];

    for (let i = 0; i < coords.length; i += OSRM_MAX_COORDS - 1) {
      const chunk = coords.slice(i, i + OSRM_MAX_COORDS);
      if (chunk.length < 2) break;

      const coordString = chunk.map(([lat, lon]) => `${lon},${lat}`).join(';');
      const radiuses = chunk.map(() => '25').join(';'); // 25m search radius
      const url = `${OSRM_BASE}/${coordString}?overview=full&geometries=geojson&radiuses=${radiuses}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[OSRM] HTTP error:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.code !== 'Ok' || !data.matchings || data.matchings.length === 0) {
        console.warn('[OSRM] No matchings returned:', data.code);
        return null;
      }

      // Collect geometry from all matchings in this chunk
      for (const matching of data.matchings) {
        const geom = matching.geometry?.coordinates;
        if (geom) {
          // GeoJSON is [lon, lat] → convert to [lat, lon]
          const points = geom.map(([lon, lat]) => [lat, lon]);
          // Skip first point if we already have points (avoid duplication at overlap)
          if (allSnapped.length > 0) {
            allSnapped.push(...points.slice(1));
          } else {
            allSnapped.push(...points);
          }
        }
      }
    }

    return allSnapped.length >= 2 ? allSnapped : null;
  } catch (err) {
    console.warn('[OSRM] Fetch error:', err.message);
    return null;
  }
}

// ============================================================
// HOOK: useRouteHistoryFirebase
// ============================================================

/**
 * GPS route history with Firebase persistence and OSRM road-snapping.
 *
 * Features:
 *  - Persists every GPS coordinate to Firebase RTDB (vehicles/{id}/route_history)
 *  - Loads full history from Firebase on mount (survives page refresh)
 *  - Snaps route to actual roads via OSRM Match API (free, no key)
 *  - Falls back to Catmull-Rom spline if OSRM fails
 *  - Debounced OSRM calls (every 5+ new points or 10s interval)
 *  - Caps stored points (default 5000, prunes oldest)
 *  - Clear history removes from Firebase
 *
 * @param {string} vehicleId
 * @param {object} options
 * @returns {{ routeHistory, snappedRoute, smoothedRoute, clearRouteHistory, stats, isSnapping }}
 */
export function useRouteHistoryFirebase(vehicleId = 'TRK-07', {
  minDistanceMeters = 2,
  maxPoints = 5000,
  osrmDebouncePoints = 5,   // Re-snap after this many new points
  osrmDebounceMs = 10000,   // Or after this many ms
} = {}) {
  const [routeHistory, setRouteHistory] = useState([]);
  const [detailedRouteHistory, setDetailedRouteHistory] = useState([]);
  const [snappedRoute, setSnappedRoute] = useState([]);
  const [isSnapping, setIsSnapping] = useState(false);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalDistanceKm: 0,
    startTime: null,
    isFirebaseLoaded: false,
  });

  // Refs for internal state
  const historyRef = useRef([]);
  const detailedHistoryRef = useRef([]);
  const totalDistRef = useRef(0);
  const startTimeRef = useRef(null);
  const lastOsrmCallRef = useRef(0);
  const pointsSinceOsrmRef = useRef(0);
  const osrmTimerRef = useRef(null);
  const isInitialLoadDone = useRef(false);
  const lastPushedRef = useRef(null); // Last point pushed to Firebase

  const dbPath = `vehicles/${vehicleId}/route_history`;
  const gpsPath = `vehicles/${vehicleId}/gps`;

  // ----------------------------------------------------------
  // 1. Load existing route history from Firebase on mount
  // ----------------------------------------------------------
  useEffect(() => {
    const historyDbRef = query(
      ref(rtdb, dbPath),
      orderByChild('timestamp'),
      limitToLast(maxPoints)
    );

    const unsubHistory = onValue(historyDbRef, (snapshot) => {
      // Only process the initial load; subsequent updates come from GPS listener
      if (isInitialLoadDone.current) return;
      isInitialLoadDone.current = true;

      if (!snapshot.exists()) {
        console.log('[RouteFirebase] No existing route history');
        setStats((prev) => ({ ...prev, isFirebaseLoaded: true }));
        return;
      }

      const data = snapshot.val();
      const entries = Object.values(data)
        .filter((e) => e.lat != null && e.lon != null)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      const loadedPoints = entries.map((e) => [e.lat, e.lon]);
      const detailedPoints = entries.map((e) => ({ lat: e.lat, lon: e.lon, timestamp: e.timestamp }));

      // Calculate total distance from loaded history
      let totalDist = 0;
      for (let i = 1; i < loadedPoints.length; i++) {
        totalDist += haversineMeters(loadedPoints[i - 1], loadedPoints[i]);
      }

      historyRef.current = loadedPoints;
      detailedHistoryRef.current = detailedPoints;
      totalDistRef.current = totalDist;
      startTimeRef.current = entries[0]?.timestamp || Date.now();
      lastPushedRef.current = loadedPoints.length > 0
        ? loadedPoints[loadedPoints.length - 1]
        : null;

      setRouteHistory(loadedPoints);
      setDetailedRouteHistory(detailedPoints);
      setStats({
        totalPoints: loadedPoints.length,
        totalDistanceKm: totalDist / 1000,
        startTime: startTimeRef.current,
        isFirebaseLoaded: true,
      });

      console.log(`[RouteFirebase] Loaded ${loadedPoints.length} points from Firebase`);

      // Trigger initial OSRM snap if we have enough points
      if (loadedPoints.length >= 3) {
        triggerOsrmSnap(loadedPoints);
      }
    }, { onlyOnce: true });

    return () => unsubHistory();
  }, [dbPath, maxPoints]);

  // ----------------------------------------------------------
  // 2. Listen to live GPS updates → push to Firebase + accumulate
  // ----------------------------------------------------------
  useEffect(() => {
    const gpsRef = ref(rtdb, gpsPath);

    const unsubGps = onValue(gpsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      // Wait until initial load is complete to avoid duplicates
      if (!isInitialLoadDone.current) return;

      const data = snapshot.val();
      const lat = data.lat;
      const lon = data.lon;
      if (lat == null || lon == null) return;

      const newPoint = [lat, lon];
      const history = historyRef.current;
      const lastPoint = history.length > 0 ? history[history.length - 1] : null;

      // Exact dedup
      if (lastPoint && lastPoint[0] === lat && lastPoint[1] === lon) return;

      // Jitter filter
      if (lastPoint) {
        const dist = haversineMeters(lastPoint, newPoint);
        if (dist < minDistanceMeters) return;
        totalDistRef.current += dist;
      }

      // Set start time on first point
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      // Push to Firebase (fire-and-forget)
      // Only push if this point is different from the last pushed point
      const lp = lastPushedRef.current;
      if (!lp || lp[0] !== lat || lp[1] !== lon) {
        const historyNodeRef = ref(rtdb, dbPath);
        push(historyNodeRef, {
          lat,
          lon,
          timestamp: Date.now(),
        }).catch((err) => console.error('[RouteFirebase] Push error:', err));
        lastPushedRef.current = newPoint;
      }

      // Append to local state
      let updated = [...history, newPoint];
      let updatedDetailed = [...detailedHistoryRef.current, { lat, lon, timestamp: Date.now() }];
      if (updated.length > maxPoints) {
        updated = updated.slice(updated.length - maxPoints);
        updatedDetailed = updatedDetailed.slice(updatedDetailed.length - maxPoints);
      }

      historyRef.current = updated;
      detailedHistoryRef.current = updatedDetailed;
      setRouteHistory(updated);
      setDetailedRouteHistory(updatedDetailed);
      setStats({
        totalPoints: updated.length,
        totalDistanceKm: totalDistRef.current / 1000,
        startTime: startTimeRef.current,
        isFirebaseLoaded: true,
      });

      // Track points since last OSRM snap
      pointsSinceOsrmRef.current += 1;

      // Debounced OSRM snap
      const now = Date.now();
      const timeSinceLastSnap = now - lastOsrmCallRef.current;

      if (
        pointsSinceOsrmRef.current >= osrmDebouncePoints ||
        timeSinceLastSnap >= osrmDebounceMs
      ) {
        // Clear any pending timer and snap now
        if (osrmTimerRef.current) clearTimeout(osrmTimerRef.current);
        triggerOsrmSnap(updated);
      } else if (!osrmTimerRef.current) {
        // Set a timer to snap later if we don't hit the point threshold
        osrmTimerRef.current = setTimeout(() => {
          osrmTimerRef.current = null;
          triggerOsrmSnap(historyRef.current);
        }, osrmDebounceMs - timeSinceLastSnap);
      }
    });

    return () => {
      unsubGps();
      if (osrmTimerRef.current) clearTimeout(osrmTimerRef.current);
    };
  }, [gpsPath, dbPath, minDistanceMeters, maxPoints, osrmDebouncePoints, osrmDebounceMs]);

  // ----------------------------------------------------------
  // 3. OSRM road-snapping (with automatic Catmull-Rom fallback)
  // ----------------------------------------------------------
  const triggerOsrmSnap = useCallback(async (coords) => {
    if (!coords || coords.length < 2) return;

    lastOsrmCallRef.current = Date.now();
    pointsSinceOsrmRef.current = 0;
    setIsSnapping(true);

    try {
      const snapped = await osrmMatchCoordinates(coords);
      if (snapped && snapped.length >= 2) {
        setSnappedRoute(snapped);
        console.log(`[OSRM] Road-snapped ${coords.length} → ${snapped.length} points`);
      } else {
        // OSRM failed — snapped route will be empty, smoothedRoute will be used
        console.log('[OSRM] Failed — using Catmull-Rom fallback');
        setSnappedRoute([]);
      }
    } catch (err) {
      console.warn('[OSRM] Error:', err);
      setSnappedRoute([]);
    } finally {
      setIsSnapping(false);
    }
  }, []);

  // ----------------------------------------------------------
  // 4. Catmull-Rom smoothed route (always available as fallback)
  // ----------------------------------------------------------
  const smoothedRoute = useMemo(() => {
    if (routeHistory.length < 3) return routeHistory;
    const subs = routeHistory.length > 500 ? 3 : 6;
    return smoothRoute(routeHistory, subs);
  }, [routeHistory]);

  // ----------------------------------------------------------
  // 5. Clear history — delete from Firebase + reset local state
  // ----------------------------------------------------------
  const clearRouteHistory = useCallback(async () => {
    try {
      const historyNodeRef = ref(rtdb, dbPath);
      await remove(historyNodeRef);
      console.log('[RouteFirebase] 🗑️ Route history cleared from Firebase');
    } catch (err) {
      console.error('[RouteFirebase] Error clearing history:', err);
    }

    historyRef.current = [];
    detailedHistoryRef.current = [];
    totalDistRef.current = 0;
    startTimeRef.current = null;
    lastPushedRef.current = null;
    pointsSinceOsrmRef.current = 0;

    setRouteHistory([]);
    setDetailedRouteHistory([]);
    setSnappedRoute([]);
    setStats({
      totalPoints: 0,
      totalDistanceKm: 0,
      startTime: null,
      isFirebaseLoaded: true,
    });
  }, [dbPath]);

  return {
    routeHistory,      // Raw [lat,lon][] from Firebase
    detailedRouteHistory, // Raw [{lat, lon, timestamp}]
    snappedRoute,      // OSRM road-snapped [lat,lon][] (may be empty if OSRM failed)
    smoothedRoute,     // Catmull-Rom smoothed [lat,lon][] (always available)
    clearRouteHistory, // Clears from Firebase + local
    stats,             // { totalPoints, totalDistanceKm, startTime, isFirebaseLoaded }
    isSnapping,        // true while OSRM request is in-flight
  };
}
