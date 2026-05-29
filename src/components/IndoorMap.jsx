import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Fuel, Gauge, Maximize2, Minimize2, Shield, Users } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGPS } from '../hooks/useGPS';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom rescue vehicle icon
const vehicleIcon = new L.DivIcon({
  html: `<div style="
    width: 28px; height: 28px;
    background: #ea580c;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(234,88,12,0.5), 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
  "><div style="
    width: 10px; height: 10px;
    background: white;
    border-radius: 50%;
  "></div></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Mini vehicle icon for miniMode
const miniVehicleIcon = new L.DivIcon({
  html: `<div style="
    width: 16px; height: 16px;
    background: #ef4444;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(239,68,68,0.6);
    display: flex; align-items: center; justify-content: center;
  "><div style="
    width: 5px; height: 5px;
    background: white;
    border-radius: 50%;
  "></div></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Posko Utama icon
const poskoIcon = new L.DivIcon({
  html: `<div style="
    background: #dc2626; color: white; font-size: 11px; font-weight: 700;
    padding: 4px 10px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.3);
    box-shadow: 0 0 16px rgba(220,38,38,0.4), 0 2px 8px rgba(0,0,0,0.5); white-space: nowrap;
  ">🚨 POSKO UTAMA</div>`,
  className: '',
  iconSize: [130, 28],
  iconAnchor: [65, 14],
});

// Area aman evakuasi — titik-titik lokasi aman untuk evakuasi tim
const SAFE_ZONES = [
  {
    pos: [-6.9800, 110.4100],
    name: 'Zona Aman A — Lapangan Simpanglima',
    desc: 'Area terbuka luas, cocok untuk evakuasi massal',
    radius: 500,
    status: 'aman',
  },
  {
    pos: [-6.9550, 110.3850],
    name: 'Zona Aman B — GOR Jatidiri',
    desc: 'Shelter indoor besar, kapasitas 2000 orang',
    radius: 400,
    status: 'aman',
  },
  {
    pos: [-6.9900, 110.4400],
    name: 'Zona Aman C — RS Kariadi',
    desc: 'Rumah sakit rujukan, prioritas medis',
    radius: 350,
    status: 'siaga',
  },
  {
    pos: [-6.9450, 110.4250],
    name: 'Zona Aman D — Kampus UNDIP',
    desc: 'Area evakuasi kampus, kapasitas besar',
    radius: 600,
    status: 'aman',
  },
  {
    pos: [-7.0050, 110.4050],
    name: 'Zona Aman E — Masjid Agung',
    desc: 'Titik kumpul dan distribusi bantuan',
    radius: 300,
    status: 'aman',
  },
];

// Safe zone marker icon factory
function createSafeZoneIcon(name, status) {
  const bgColor = status === 'siaga' ? '#f59e0b' : '#22c55e';
  const emoji = status === 'siaga' ? '⚠️' : '✅';
  return new L.DivIcon({
    html: `<div style="
      background: rgba(20,20,20,0.92); color: #e2e8f0; font-size: 10px; font-weight: 600;
      padding: 4px 10px; border-radius: 8px;
      border: 1px solid ${bgColor}40;
      box-shadow: 0 0 12px ${bgColor}30, 0 2px 8px rgba(0,0,0,0.4);
      white-space: nowrap; backdrop-filter: blur(4px);
      display: flex; align-items: center; gap: 4px;
    ">${emoji} ${name.split(' — ')[0]}</div>`,
    className: '',
    iconSize: [150, 28],
    iconAnchor: [75, 14],
  });
}

// Component to auto-recenter map on vehicle position
function MapRecenter({ lat, lon }) {
  const map = useMap();
  const prevPos = useRef(null);

  useEffect(() => {
    if (lat && lon) {
      const newPos = [lat, lon];
      if (!prevPos.current || prevPos.current[0] !== lat || prevPos.current[1] !== lon) {
        map.setView(newPos, map.getZoom(), { animate: true, duration: 1 });
        prevPos.current = newPos;
      }
    }
  }, [lat, lon, map]);

  return null;
}

// Invalidate map size when container resizes (important for expand/collapse)
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function GPSMap({ miniMode = false, expanded = false, onToggleExpand }) {
  const { gps, loading } = useGPS('TRK-07');

  const lat = gps.lat ?? -6.9667;
  const lon = gps.lon ?? 110.4196;
  const speed = gps.speed ?? 0;
  const fuel = gps.fuel ?? 0;

  // ====== MINI MODE with expand capability ======
  if (miniMode) {
    return (
      <>
        {/* Backdrop overlay when expanded */}
        {expanded && (
          <div
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={onToggleExpand}
          />
        )}

        {/* Map container — animates between mini and expanded */}
        <div
          className={`absolute z-40 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            expanded
              ? 'bottom-4 right-4 left-[40px] top-4 rounded-2xl border border-white/20'
              : 'bottom-4 right-4 w-48 h-48 rounded-xl border border-white/20 cursor-pointer'
          }`}
          style={{
            boxShadow: expanded
              ? '0 0 60px rgba(0,0,0,0.8), 0 0 20px rgba(239,68,68,0.15)'
              : '0 8px 32px rgba(0,0,0,0.6)',
          }}
          onClick={!expanded ? onToggleExpand : undefined}
        >
          {/* Expanded map — full detail */}
          {expanded ? (
            <ExpandedMapView
              lat={lat}
              lon={lon}
              speed={speed}
              fuel={fuel}
              loading={loading}
              onClose={onToggleExpand}
            />
          ) : (
            <MiniMapView lat={lat} lon={lon} />
          )}
        </div>
      </>
    );
  }

  return null;
}

// ============================================================
// MINI MAP VIEW — small thumbnail
// ============================================================
function MiniMapView({ lat, lon }) {
  return (
    <div className="w-full h-full relative bg-zinc-900">
      <MapContainer
        center={[lat, lon]}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        attributionControl={false}
        className="w-full h-full z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapRecenter lat={lat} lon={lon} />
        <Marker position={[lat, lon]} icon={miniVehicleIcon} />

        {/* Safe zone circles in mini view */}
        {SAFE_ZONES.map((zone, i) => (
          <Circle
            key={i}
            center={zone.pos}
            radius={zone.radius}
            pathOptions={{
              color: zone.status === 'siaga' ? '#f59e0b' : '#22c55e',
              fillColor: zone.status === 'siaga' ? '#f59e0b' : '#22c55e',
              fillOpacity: 0.12,
              weight: 1,
              opacity: 0.4,
            }}
          />
        ))}
      </MapContainer>

      {/* Coordinate overlay */}
      <div className="absolute top-2 right-2 z-10">
        <div className="text-[8px] font-mono space-y-0.5">
          <div className="text-red-400">
            LAT <span className="text-red-300">(merah)</span>: <span className="text-white">{lat.toFixed(2)}</span>
          </div>
          <div className="text-red-400">
            LON <span className="text-red-300">(merah)</span>: <span className="text-white">{lon.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Expand hint */}
      <div className="absolute bottom-2 right-2 z-10">
        <div className="w-6 h-6 bg-black/50 rounded-md border border-white/20 flex items-center justify-center backdrop-blur-sm">
          <Maximize2 className="w-3 h-3 text-white/60" />
        </div>
      </div>

      {/* Click hint */}
      <div className="absolute bottom-2 left-2 z-10">
        <span className="text-[7px] text-white/30 font-medium">Klik untuk memperbesar</span>
      </div>
    </div>
  );
}

// ============================================================
// EXPANDED MAP VIEW — full overlay with safe zones
// ============================================================
function ExpandedMapView({ lat, lon, speed, fuel, loading, onClose }) {
  const [activeTab, setActiveTab] = useState('map');

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-zinc-900/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Pelacakan GPS Rescue</h2>
            <p className="text-[10px] text-white/40">Unit TRK-07 · Real-time Tracking</p>
          </div>
          {loading && <span className="text-[10px] text-blue-400 animate-pulse ml-2">Connecting...</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Peta
            </button>
            <button
              onClick={() => setActiveTab('zones')}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'zones'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Zona Aman
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative min-h-0">
        {activeTab === 'map' ? (
          /* Interactive Map */
          <MapContainer
            center={[lat, lon]}
            zoom={13}
            scrollWheelZoom={true}
            zoomControl={true}
            attributionControl={false}
            className="w-full h-full z-0"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <MapRecenter lat={lat} lon={lon} />
            <MapInvalidateSize />

            {/* Posko Utama */}
            <Marker position={[-6.9667, 110.4196]} icon={poskoIcon}>
              <Popup>🚨 Posko Utama: Semarang — Pusat Komando Operasi</Popup>
            </Marker>

            {/* Safe zone circles + markers */}
            {SAFE_ZONES.map((zone, i) => (
              <SafeZoneMarkers key={i} zone={zone} />
            ))}

            {/* Vehicle position */}
            <Marker position={[lat, lon]} icon={vehicleIcon}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                  <strong>🚑 TRK-07 Rescue</strong><br/>
                  Lat: {lat.toFixed(4)}°<br/>
                  Lon: {lon.toFixed(4)}°<br/>
                  Speed: {speed} km/h
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          /* Safe Zones Detail Tab */
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-4">
            <div className="space-y-3">
              {SAFE_ZONES.map((zone, i) => (
                <div key={i} className="flex items-start gap-3">
                  {/* Status indicator */}
                  <div className="flex flex-col items-center shrink-0 pt-1">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                      zone.status === 'siaga'
                        ? 'bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                    }`} />
                    {i < SAFE_ZONES.length - 1 && <div className="w-0.5 h-12 bg-white/10 mt-1" />}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 rounded-xl p-3 border transition-all ${
                    zone.status === 'siaga'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-emerald-500/5 border-emerald-500/15'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white/90">{zone.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                        zone.status === 'siaga'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {zone.status === 'siaga' ? '⚠️ SIAGA' : '✅ AMAN'}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 mb-1.5">{zone.desc}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] text-white/30 font-mono">
                        📍 {zone.pos[0].toFixed(4)}°, {zone.pos[1].toFixed(4)}°
                      </span>
                      <span className="text-[9px] text-white/30">
                        Radius: {zone.radius}m
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating info cards on map tab */}
        {activeTab === 'map' && (
          <>
            {/* Top-left: coordinate display */}
            <div className="absolute top-3 left-3 z-10 bg-zinc-900/90 backdrop-blur-md rounded-lg border border-white/10 px-3 py-2">
              <div className="text-[9px] font-mono space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-semibold">LAT</span>
                  <span className="text-white font-bold">{lat.toFixed(4)}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-semibold">LON</span>
                  <span className="text-white font-bold">{lon.toFixed(4)}°</span>
                </div>
              </div>
            </div>

            {/* Top-right: vehicle status */}
            <div className="absolute top-3 right-3 z-10 bg-zinc-900/90 backdrop-blur-md rounded-lg border border-white/10 px-3 py-2">
              <div className="text-[9px] space-y-1">
                <div className="flex items-center gap-2">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span className="text-white/80">{speed} km/h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Fuel className="w-3 h-3 text-amber-400" />
                  <span className="text-white/80">{fuel}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">GPS Aktif</span>
                </div>
              </div>
            </div>

            {/* Bottom center: legend */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-zinc-900/90 backdrop-blur-md rounded-lg border border-white/10 px-4 py-2 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[9px] text-white/50">Posko</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/60" />
                <span className="text-[9px] text-white/50">Zona Aman</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500/60" />
                <span className="text-[9px] text-white/50">Zona Siaga</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-600 border-2 border-white" />
                <span className="text-[9px] text-white/50">Kendaraan</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom data row */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t border-white/10 bg-zinc-900/95 shrink-0">
        <DataBoxDark label="Latitude" value={`${lat.toFixed(4)}°`} />
        <DataBoxDark label="Longitude" value={`${lon.toFixed(4)}°`} />
        <DataBoxDark label="Kecepatan" value={`${speed} km/h`} icon={<Gauge className="w-3 h-3 text-cyan-400" />} />
        <DataBoxDark label="BBM" value={`${fuel}%`} icon={<Fuel className="w-3 h-3 text-amber-400" />} highlight />
      </div>
    </div>
  );
}

// Helper: render safe zone circle + marker together
function SafeZoneMarkers({ zone }) {
  return (
    <>
      <Circle
        center={zone.pos}
        radius={zone.radius}
        pathOptions={{
          color: zone.status === 'siaga' ? '#f59e0b' : '#22c55e',
          fillColor: zone.status === 'siaga' ? '#f59e0b' : '#22c55e',
          fillOpacity: 0.15,
          weight: 2,
          opacity: 0.5,
          dashArray: zone.status === 'siaga' ? '6, 4' : undefined,
        }}
      />
      <Marker position={zone.pos} icon={createSafeZoneIcon(zone.name, zone.status)}>
        <Popup>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
            <strong>{zone.name}</strong><br/>
            {zone.desc}<br/>
            <span style={{ color: '#888' }}>Radius: {zone.radius}m</span>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

function DataBoxDark({ label, value, highlight = false, icon }) {
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${
      highlight
        ? 'bg-amber-500/10 border-amber-500/30'
        : 'bg-white/5 border-white/10'
    }`}>
      <p className="text-[9px] text-white/30 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
        {icon}{label}
      </p>
      <p className={`text-xs font-bold ${highlight ? 'text-amber-400' : 'text-white/80'}`}>
        {value}
      </p>
    </div>
  );
}
