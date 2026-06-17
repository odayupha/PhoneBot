import { ref, onValue } from 'firebase/database';
import { useState, useEffect, useRef } from 'react';
import { rtdb } from '../firebase/config';

/**
 * Calculate bearing (forward azimuth) between two [lat, lon] points.
 * Returns degrees 0-360, where 0 = North, 90 = East, etc.
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Hook untuk membaca data GPS + device info secara realtime dari Firebase RTDB.
 * Path: vehicles/{vehicleId}/gps + vehicles/{vehicleId}/device_info
 *
 * Perubahan dari versi sebelumnya:
 *  - Mengganti listener `vehicle` (fuel, engine_status) → `device_info`
 *  - Menambahkan field: battery_percentage, battery_voltage, pwm_speed, speed_pwm
 *  - Menambahkan bearing (arah gerak) yang dihitung dari dua titik GPS berurutan
 */
export function useGPS(vehicleId = 'TRK-07') {
  const [gps, setGps] = useState({
    lat: -6.7320,
    lon: 108.5523,
    speed: 0,
    speed_kmh: 0,
    speed_pwm: 0,
    heading: 0,
    bearing: 0,        // Computed bearing from movement direction
    accuracy: 0,
    timestamp: null,
    // Device info (menggantikan fuel)
    battery_percentage: 0,
    battery_voltage: 0,
    pwm_speed: 0,
    uptime_seconds: 0,
    wifi_rssi: 0,
  });
  const [loading, setLoading] = useState(true);

  // Track previous position for bearing calculation
  const prevPosRef = useRef(null);

  useEffect(() => {
    // Listen to GPS data
    const gpsRef = ref(rtdb, `vehicles/${vehicleId}/gps`);
    const deviceInfoRef = ref(rtdb, `vehicles/${vehicleId}/device_info`);

    const unsubGps = onValue(gpsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const newLat = data.lat;
        const newLon = data.lon;

        let bearing = undefined; // undefined = don't override

        // Compute bearing if we have a previous position and have moved enough
        if (newLat != null && newLon != null && prevPosRef.current) {
          const { lat: prevLat, lon: prevLon } = prevPosRef.current;
          // Only update bearing if moved more than ~1 meter (avoids jitter)
          const dLat = Math.abs(newLat - prevLat);
          const dLon = Math.abs(newLon - prevLon);
          if (dLat > 0.00001 || dLon > 0.00001) {
            bearing = calculateBearing(prevLat, prevLon, newLat, newLon);
          }
        }

        // Update previous position
        if (newLat != null && newLon != null) {
          prevPosRef.current = { lat: newLat, lon: newLon };
        }

        setGps((prev) => ({
          ...prev,
          ...data,
          // Only override bearing if we computed a new one
          bearing: bearing !== undefined ? bearing : prev.bearing,
        }));
      }
      setLoading(false);
    }, (error) => {
      console.error('[useGPS] Error:', error);
      setLoading(false);
    });

    // Listen to device_info (baterai, PWM, uptime, WiFi RSSI)
    const unsubDeviceInfo = onValue(deviceInfoRef, (snapshot) => {
      if (snapshot.exists()) {
        setGps((prev) => ({ ...prev, ...snapshot.val() }));
      }
    });

    return () => {
      unsubGps();
      unsubDeviceInfo();
    };
  }, [vehicleId]);

  return { gps, loading };
}
