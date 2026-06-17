import { ref, onValue } from 'firebase/database';
import { useState, useEffect, useRef } from 'react';
import { rtdb } from '../firebase/config';

/**
 * Hook untuk mendeteksi penekanan tombol controller secara realtime dari Firebase RTDB.
 * Path: vehicles/{vehicleId}/control
 *
 * STRATEGI DETEKSI:
 * Tombol controller bersifat MOMENTARY — hanya true sesaat lalu kembali false.
 * Karena itu, BUKAN button_X yang dipantau, melainkan ZONE FIELDS yang persisten:
 *
 *  - zone_circle_danger: "DANGER"  → muncul saat button_circle ditekan
 *  - zone_triangle_safe: "SAFE"    → muncul saat button_triangle ditekan
 *  - zone_cross_danger: "DANGER"   → muncul saat button_cross_gas ditekan
 *  - zone_square_safe: "SAFE"      → muncul saat button_square ditekan
 *
 * Deteksi: jika timestamp berubah DAN ada zone field baru/berubah → trigger.
 * Skip pada load pertama agar tidak trigger saat halaman baru dibuka.
 */

// Daftar zone fields yang dipantau dan mapping-nya
const ZONE_FIELD_MAP = {
  zone_circle_danger:  { zoneType: 'BAHAYA', button: 'button_circle',    label: 'Circle (Bahaya)' },
  zone_cross_danger:   { zoneType: 'BAHAYA', button: 'button_cross_gas', label: 'Cross (Bahaya)' },
  zone_triangle_safe:  { zoneType: 'AMAN',   button: 'button_triangle',  label: 'Triangle (Aman)' },
  zone_square_safe:    { zoneType: 'AMAN',   button: 'button_square',    label: 'Square (Aman)' },
};

export function useControllerButtons(vehicleId = 'TRK-07', onButtonPressed) {
  const [controlData, setControlData] = useState(null);
  const prevTimestampRef = useRef(null);
  const prevZoneFieldsRef = useRef({});
  const isFirstLoadRef = useRef(true);
  const callbackRef = useRef(onButtonPressed);
  const processingRef = useRef(false); // Mencegah double-trigger

  // Selalu gunakan callback terbaru
  useEffect(() => {
    callbackRef.current = onButtonPressed;
  }, [onButtonPressed]);

  useEffect(() => {
    const controlRef = ref(rtdb, `vehicles/${vehicleId}/control`);

    const unsubscribe = onValue(controlRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();
      setControlData(data);

      const currentTimestamp = data.timestamp || 0;

      // ========================================
      // SKIP pada load pertama
      // ========================================
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        prevTimestampRef.current = currentTimestamp;
        // Simpan state zone fields saat ini
        for (const fieldKey of Object.keys(ZONE_FIELD_MAP)) {
          if (data[fieldKey] !== undefined) {
            prevZoneFieldsRef.current[fieldKey] = data[fieldKey];
          }
        }
        console.log('[ControllerButtons] ✅ Initial load — timestamp:', currentTimestamp);
        console.log('[ControllerButtons] ✅ Initial zone fields:', { ...prevZoneFieldsRef.current });
        return;
      }

      // ========================================
      // DETEKSI: Cek apakah timestamp berubah
      // ========================================
      const timestampChanged = currentTimestamp !== prevTimestampRef.current;

      if (!timestampChanged) {
        // Timestamp sama → tidak ada aksi baru dari controller
        return;
      }

      // Timestamp berubah! Sekarang cek zone field mana yang baru/berubah
      console.log('[ControllerButtons] ⏱️ Timestamp changed:', prevTimestampRef.current, '→', currentTimestamp);

      // Cegah double-trigger jika event Firebase datang berturut-turut
      if (processingRef.current) {
        console.log('[ControllerButtons] ⏳ Sedang memproses, skip...');
        prevTimestampRef.current = currentTimestamp;
        return;
      }

      // Cari zone field yang baru muncul atau berubah nilainya
      let triggered = false;
      for (const [fieldKey, config] of Object.entries(ZONE_FIELD_MAP)) {
        const currentValue = data[fieldKey];
        const prevValue = prevZoneFieldsRef.current[fieldKey];

        // Field baru muncul, atau nilainya berubah
        if (currentValue !== undefined && currentValue !== prevValue) {
          console.log(`[ControllerButtons] 🎮 Zone field "${fieldKey}" berubah: "${prevValue}" → "${currentValue}"`);

          processingRef.current = true;
          triggered = true;

          if (callbackRef.current) {
            callbackRef.current({
              button: config.button,
              zoneType: config.zoneType,
              zoneFieldKey: fieldKey,
              zoneFieldValue: currentValue,
              timestamp: currentTimestamp,
            });
          }

          // Hanya trigger satu field per perubahan timestamp
          break;
        }
      }

      // Jika tidak ada zone field berubah tapi timestamp berubah,
      // cek apakah ada zone field yang sudah ada (re-trigger tombol yang sama)
      if (!triggered) {
        for (const [fieldKey, config] of Object.entries(ZONE_FIELD_MAP)) {
          const currentValue = data[fieldKey];
          if (currentValue !== undefined) {
            console.log(`[ControllerButtons] 🎮 Re-trigger: timestamp changed with existing zone field "${fieldKey}": "${currentValue}"`);
            
            processingRef.current = true;
            triggered = true;

            if (callbackRef.current) {
              callbackRef.current({
                button: config.button,
                zoneType: config.zoneType,
                zoneFieldKey: fieldKey,
                zoneFieldValue: currentValue,
                timestamp: currentTimestamp,
              });
            }

            break;
          }
        }
      }

      // Update refs
      prevTimestampRef.current = currentTimestamp;
      for (const fieldKey of Object.keys(ZONE_FIELD_MAP)) {
        if (data[fieldKey] !== undefined) {
          prevZoneFieldsRef.current[fieldKey] = data[fieldKey];
        }
      }

      // Reset processing flag setelah 1 detik (debounce)
      if (triggered) {
        setTimeout(() => {
          processingRef.current = false;
        }, 1000);
      }

    }, (error) => {
      console.error('[ControllerButtons] Error:', error);
    });

    return () => unsubscribe();
  }, [vehicleId]);

  return { controlData };
}
