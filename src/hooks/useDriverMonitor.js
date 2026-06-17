import { ref, onValue } from 'firebase/database';
import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';

/**
 * Hook untuk membaca data Driver Monitoring System secara realtime.
 * Path: vehicles/{vehicleId}/dms
 *
 * Perubahan: Menambahkan field `safety_zone` ("AMAN" | "SIAGA" | "BAHAYA")
 */
export function useDriverMonitor(vehicleId = 'TRK-07') {
  const [dms, setDms] = useState({
    alert_level: 'NORMAL',
    drowsiness_score: 0,
    eyes_closed_sec: 0,
    driving_hours: 0,
    safety_zone: 'AMAN',
    camera_url: null,
    timestamp: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dmsRef = ref(rtdb, `vehicles/${vehicleId}/dms`);
    const unsubscribe = onValue(dmsRef, (snapshot) => {
      if (snapshot.exists()) {
        setDms(snapshot.val());
      }
      setLoading(false);
    }, (error) => {
      console.error('[useDriverMonitor] Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [vehicleId]);

  return { dms, loading };
}
