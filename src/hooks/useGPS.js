import { ref, onValue } from 'firebase/database';
import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';

/**
 * Hook untuk membaca data GPS + vehicle info secara realtime dari Firebase RTDB.
 * Path: vehicles/{vehicleId}/gps + vehicles/{vehicleId}/vehicle
 */
export function useGPS(vehicleId = 'TRK-07') {
  const [gps, setGps] = useState({
    lat: -6.7320,
    lon: 108.5523,
    speed: 0,
    heading: 0,
    fuel: 0,
    timestamp: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to GPS data
    const gpsRef = ref(rtdb, `vehicles/${vehicleId}/gps`);
    const vehicleRef = ref(rtdb, `vehicles/${vehicleId}/vehicle`);

    const unsubGps = onValue(gpsRef, (snapshot) => {
      if (snapshot.exists()) {
        setGps((prev) => ({ ...prev, ...snapshot.val() }));
      }
      setLoading(false);
    }, (error) => {
      console.error('[useGPS] Error:', error);
      setLoading(false);
    });

    // Also listen to vehicle data (fuel, engine_status, etc.)
    const unsubVehicle = onValue(vehicleRef, (snapshot) => {
      if (snapshot.exists()) {
        setGps((prev) => ({ ...prev, ...snapshot.val() }));
      }
    });

    return () => {
      unsubGps();
      unsubVehicle();
    };
  }, [vehicleId]);

  return { gps, loading };
}
