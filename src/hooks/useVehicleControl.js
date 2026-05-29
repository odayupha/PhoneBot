import { ref, onValue, update } from 'firebase/database';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { rtdb } from '../firebase/config';

/**
 * Hook untuk membaca dan mengirim perintah kontrol kendaraan.
 * Path: vehicles/{vehicleId}/control
 */
export function useVehicleControl(vehicleId = 'TRK-07') {
  const [control, setControl] = useState({
    engine_kill: false,
    engine_lock: false,
    geo_fence: true,
    buzzer: false,
    speed_limit: 80,
  });
  const [loading, setLoading] = useState(true);

  // Stabilkan controlRef agar tidak re-create setiap render
  const dbPath = `vehicles/${vehicleId}/control`;

  // Listener — baca status kontrol dari RTDB
  useEffect(() => {
    const controlRef = ref(rtdb, dbPath);
    const unsubscribe = onValue(controlRef, (snapshot) => {
      if (snapshot.exists()) {
        setControl(snapshot.val());
      }
      setLoading(false);
    }, (error) => {
      console.error('[useVehicleControl] Listen Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dbPath]);

  // Fungsi kirim perintah — buat ref baru setiap kali untuk menghindari stale
  const sendCommand = useCallback((updates) => {
    const controlRef = ref(rtdb, dbPath);
    console.log('[Control] Sending to Firebase:', dbPath, updates);
    return update(controlRef, updates).then(() => {
      console.log('[Control] ✅ Command sent successfully');
    }).catch((err) => {
      console.error('[Control] ❌ Command failed:', err);
    });
  }, [dbPath]);

  const setEngineKill = useCallback((val) => sendCommand({ engine_kill: val }), [sendCommand]);
  const setEngineLock = useCallback((val) => sendCommand({ engine_lock: val }), [sendCommand]);
  const setGeoFence = useCallback((val) => sendCommand({ geo_fence: val }), [sendCommand]);
  const setBuzzer = useCallback((val) => sendCommand({ buzzer: val }), [sendCommand]);
  const setSpeedLimit = useCallback((val) => sendCommand({ speed_limit: val }), [sendCommand]);

  return {
    control, loading,
    setEngineKill, setEngineLock, setGeoFence, setBuzzer, setSpeedLimit,
  };
}
