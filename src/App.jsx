import { useState, useRef, useCallback } from 'react';
import Topbar from './components/Topbar';
import LiveCamera from './components/LiveCamera';
import GPSMap from './components/IndoorMap';
import StatusBar from './components/StatusBar';
import ScreenshotModal from './components/ScreenshotModal';
import { useGPS } from './hooks/useGPS';
import { useZoneEvents } from './hooks/useZoneEvents';
import { useControllerButtons } from './hooks/useControllerButtons';

export default function App() {
  const [mapExpanded, setMapExpanded] = useState(false);
  const [screenshotData, setScreenshotData] = useState(null);
  const [triggerSource, setTriggerSource] = useState(null); // Info tombol controller yang menekan
  const [initialZoneType, setInitialZoneType] = useState(null); // Pre-select zona dari controller
  const cameraRef = useRef(null);

  // GPS data untuk koordinat saat screenshot
  const { gps } = useGPS('TRK-07');
  const { addZoneEvent } = useZoneEvents('TRK-07');

  const lat = gps.lat ?? -6.9667;
  const lon = gps.lon ?? 110.4196;

  // Callback saat screenshot ready dari LiveCamera
  const handleScreenshotReady = useCallback((dataUrl) => {
    setScreenshotData(dataUrl);
  }, []);

  // === CONTROLLER BUTTON HANDLER ===
  // Dipanggil ketika tombol controller ditekan (dari Firebase RTDB)
  const handleControllerButtonPressed = useCallback((info) => {
    console.log('[App] 🎮 Controller button pressed:', info);

    // Set trigger info untuk modal
    setTriggerSource(info);
    setInitialZoneType(info.zoneType);

    // Auto-capture screenshot dari kamera
    if (cameraRef.current?.captureScreenshot) {
      console.log('[App] 📸 Auto-capturing screenshot from controller...');
      cameraRef.current.captureScreenshot();
    } else {
      console.warn('[App] ⚠️ Camera ref not available for screenshot');
    }
  }, []);

  // Listener untuk controller buttons dari Firebase
  useControllerButtons('TRK-07', handleControllerButtonPressed);

  // Simpan zone event ke Firebase + download screenshot
  const handleScreenshotSave = useCallback(async (data) => {
    try {
      await addZoneEvent(data);
      console.log('[App] ✅ Zone event saved:', data);
    } catch (err) {
      console.error('[App] ❌ Failed to save zone event:', err);
    }
  }, [addZoneEvent]);

  // Reset modal state saat ditutup
  const handleModalClose = useCallback(() => {
    setScreenshotData(null);
    setTriggerSource(null);
    setInitialZoneType(null);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-black overflow-hidden">
      {/* Topbar — minimal dark */}
      <Topbar />

      {/* Main Area — camera dominant with overlays */}
      <main className="flex-1 relative min-h-0">
        {/* Vertical Unit Label — left side */}
        <div className="absolute left-0 top-0 bottom-0 z-30 flex items-center pointer-events-none">
          <div
            className="text-[10px] font-bold tracking-[0.25em] text-white/60 uppercase"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              paddingLeft: '8px',
              paddingRight: '8px',
              letterSpacing: '0.3em',
            }}
          >
            UNIT TRK-07 RESCUE
          </div>
        </div>

        {/* Camera Feed — full area */}
        <div className="absolute inset-0 z-0">
          <LiveCamera
            ref={cameraRef}
            onScreenshotReady={handleScreenshotReady}
          />
        </div>

        {/* Map — mini or expanded overlay */}
        <GPSMap
          miniMode
          expanded={mapExpanded}
          onToggleExpand={() => setMapExpanded((v) => !v)}
        />
      </main>

      {/* Status Indicator Bar — bottom */}
      <StatusBar />

      {/* Screenshot Modal — muncul setelah screenshot (manual atau dari controller) */}
      {screenshotData && (
        <ScreenshotModal
          screenshotData={screenshotData}
          currentLat={lat}
          currentLon={lon}
          onSave={handleScreenshotSave}
          onClose={handleModalClose}
          initialZoneType={initialZoneType}
          triggerSource={triggerSource}
        />
      )}
    </div>
  );
}

