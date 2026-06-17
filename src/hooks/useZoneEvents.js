import { ref, onValue, push, remove, serverTimestamp } from 'firebase/database';
import { useState, useEffect, useCallback } from 'react';
import { rtdb } from '../firebase/config';

/**
 * Hook untuk membaca dan menambah zone events secara realtime dari Firebase RTDB.
 * Path: vehicles/{vehicleId}/zone_events
 *
 * Setiap event berisi:
 *  - type: 'AMAN' | 'BAHAYA'
 *  - lat: number
 *  - lon: number
 *  - description: string
 *  - screenshot_name: string (optional)
 *  - timestamp: number (server timestamp)
 */
export function useZoneEvents(vehicleId = 'TRK-07') {
  const [zoneEvents, setZoneEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const dbPath = `vehicles/${vehicleId}/zone_events`;

  useEffect(() => {
    const eventsRef = ref(rtdb, dbPath);
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Convert object to array with IDs, sorted by timestamp desc
        const events = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setZoneEvents(events);
      } else {
        setZoneEvents([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('[useZoneEvents] Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dbPath]);

  // Fungsi untuk menambah zone event baru
  const addZoneEvent = useCallback(({ type, lat, lon, description, screenshot_name }) => {
    const eventsRef = ref(rtdb, dbPath);
    const newEvent = {
      type, // 'AMAN' atau 'BAHAYA'
      lat,
      lon,
      description: description || '',
      screenshot_name: screenshot_name || '',
      timestamp: Date.now(),
    };
    console.log('[ZoneEvents] Adding new event:', newEvent);
    return push(eventsRef, newEvent);
  }, [dbPath]);

  // Fungsi untuk menghapus semua zone events
  const clearAllZoneEvents = useCallback(() => {
    const eventsRef = ref(rtdb, dbPath);
    console.log('[ZoneEvents] Clearing all zone events');
    return remove(eventsRef);
  }, [dbPath]);

  return { zoneEvents, loading, addZoneEvent, clearAllZoneEvents };
}
