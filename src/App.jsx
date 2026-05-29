import { useState } from 'react';
import Topbar from './components/Topbar';
import LiveCamera from './components/LiveCamera';
import GPSMap from './components/IndoorMap';
import StatusBar from './components/StatusBar';

export default function App() {
  const [mapExpanded, setMapExpanded] = useState(false);

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
          <LiveCamera />
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
    </div>
  );
}
