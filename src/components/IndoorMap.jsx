import { useEffect, useRef, useState, useMemo } from 'react';
import { MapPin, Navigation, Battery, Gauge, Maximize2, Minimize2, Shield, Users, AlertTriangle, Trash2, Route } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGPS } from '../hooks/useGPS';
import { useZoneEvents } from '../hooks/useZoneEvents';
import { useRouteHistoryFirebase } from '../hooks/useRouteHistoryFirebase';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ============================================================
// GOOGLE MAPS-STYLE DIRECTIONAL MARKER (SVG)
// ============================================================

/**
 * Creates a Google Maps-style navigation marker with a directional arrow.
 * The arrow rotates based on the bearing (compass heading).
 *
 * @param {number} bearing - Compass heading in degrees (0=North, 90=East)
 * @param {boolean} mini - Whether this is for the mini map (smaller size)
 * @returns {L.DivIcon}
 */
function createDirectionalIcon(bearing = 0, mini = false) {
  const size = mini ? 28 : 44;
  const coreSize = mini ? 12 : 20;
  const pulseSize = mini ? 24 : 36;
  const arrowSize = mini ? 10 : 16;

  const html = `
    <div class="gps-marker-container" style="width:${size}px; height:${size}px;">
      <!-- Pulse ring -->
      <div class="gps-marker-pulse" style="width:${pulseSize}px; height:${pulseSize}px; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);"></div>
      <!-- Directional arrow (chevron pointing in bearing direction) -->
      <div class="gps-direction-arrow" style="
        position:absolute;
        top:50%; left:50%;
        width:${arrowSize}px; height:${arrowSize}px;
        margin-left:-${arrowSize/2}px;
        margin-top:-${coreSize/2 + arrowSize + 2}px;
        transform: rotate(${bearing}deg);
        transform-origin: center ${coreSize/2 + arrowSize + 2}px;
      ">
        <svg viewBox="0 0 24 24" width="${arrowSize}" height="${arrowSize}" fill="none">
          <path d="M12 2L4 14h16L12 2z" fill="#4285F4" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </div>
      <!-- Core dot -->
      <div class="gps-marker-core" style="
        width:${coreSize}px; height:${coreSize}px;
        position:absolute; top:50%; left:50%;
        transform:translate(-50%,-50%);
      "></div>
    </div>
  `;

  return new L.DivIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

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

// Konstanta konversi PWM → km/h
const MAX_SPEED_KMH = 120.0;
function pwmToKmh(pwm) {
  return ((pwm || 0) / 255) * MAX_SPEED_KMH;
}

// Zone event marker icon factory — zona dari database
function createZoneIcon(type) {
  const isAman = type === 'AMAN';
  const bgColor = isAman ? '#22c55e' : '#ef4444';
  const emoji = isAman ? '✅' : '🔴';
  const label = isAman ? 'ZONA AMAN' : 'ZONA BAHAYA';
  return new L.DivIcon({
    html: `<div style="
      background: rgba(20,20,20,0.92); color: #e2e8f0; font-size: 10px; font-weight: 600;
      padding: 4px 10px; border-radius: 8px;
      border: 1px solid ${bgColor}40;
      box-shadow: 0 0 12px ${bgColor}30, 0 2px 8px rgba(0,0,0,0.4);
      white-space: nowrap; backdrop-filter: blur(4px);
      display: flex; align-items: center; gap: 4px;
    ">${emoji} ${label}</div>`,
    className: '',
    iconSize: [140, 28],
    iconAnchor: [70, 14],
  });
}

// ============================================================
// ANIMATED MARKER — smooth position transitions via Leaflet API
// ============================================================
function AnimatedMarker({ position, icon, children }) {
  const markerRef = useRef(null);
  const prevPos = useRef(position);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    // Add CSS transition class for smooth movement
    const el = marker.getElement?.();
    if (el && !el.classList.contains('leaflet-marker-animated')) {
      el.classList.add('leaflet-marker-animated');
    }

    // Update position — Leaflet + CSS transition handles the animation
    if (prevPos.current[0] !== position[0] || prevPos.current[1] !== position[1]) {
      marker.setLatLng(position);
      prevPos.current = position;
    }
  }, [position]);

  // Update icon whenever it changes (bearing rotation)
  useEffect(() => {
    const marker = markerRef.current;
    if (marker && icon) {
      marker.setIcon(icon);
    }
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
    >
      {children}
    </Marker>
  );
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

// ============================================================
// ROUTE TRAIL — renders gradient-opacity polyline with glow
// ============================================================
function RouteTrail({ positions, thin = false }) {
  if (!positions || positions.length < 2) return null;

  // For thin (mini) view, render a simple polyline
  if (thin) {
    return (
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#4285F4',
          weight: 2.5,
          opacity: 0.6,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }}
        smoothFactor={1.5}
      />
    );
  }

  // Split trail into gradient segments for fade effect
  // Older segments are more transparent, recent segments are opaque
  const segmentCount = Math.min(8, Math.max(1, Math.floor(positions.length / 5)));

  if (segmentCount <= 1) {
    return (
      <>
        {/* Glow layer */}
        <Polyline
          positions={positions}
          pathOptions={{
            color: '#4285F4',
            weight: 14,
            opacity: 0.12,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
          }}
          smoothFactor={1.5}
        />
        {/* Main trail */}
        <Polyline
          positions={positions}
          pathOptions={{
            color: '#4285F4',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
          }}
          smoothFactor={1.5}
        />
      </>
    );
  }

  const segments = [];
  const pointsPerSegment = Math.ceil(positions.length / segmentCount);

  for (let i = 0; i < segmentCount; i++) {
    const start = i * pointsPerSegment;
    // Overlap by 1 point for seamless connections
    const end = Math.min(start + pointsPerSegment + 1, positions.length);
    const segmentPositions = positions.slice(start, end);

    if (segmentPositions.length < 2) continue;

    // Opacity ramps from 0.2 (oldest) to 0.9 (newest)
    const progress = (i + 1) / segmentCount;
    const opacity = 0.2 + 0.7 * progress;
    const glowOpacity = 0.05 + 0.1 * progress;
    const weight = 3 + 2 * progress; // Thicker at the recent end

    segments.push(
      <Polyline
        key={`glow-${i}`}
        positions={segmentPositions}
        pathOptions={{
          color: '#4285F4',
          weight: weight + 8,
          opacity: glowOpacity,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }}
        smoothFactor={1.5}
      />
    );

    segments.push(
      <Polyline
        key={`trail-${i}`}
        positions={segmentPositions}
        pathOptions={{
          color: '#4285F4',
          weight: weight,
          opacity: opacity,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }}
        smoothFactor={1.5}
      />
    );
  }

  return <>{segments}</>;
}

export default function GPSMap({ miniMode = false, expanded = false, onToggleExpand }) {
  const { gps, loading } = useGPS('TRK-07');
  const { zoneEvents, clearAllZoneEvents } = useZoneEvents('TRK-07');
  const { snappedRoute, smoothedRoute, clearRouteHistory, stats, isSnapping, detailedRouteHistory } = useRouteHistoryFirebase('TRK-07');

  // Use OSRM road-snapped route if available, otherwise fall back to Catmull-Rom spline
  const displayRoute = snappedRoute.length >= 2 ? snappedRoute : smoothedRoute;

  const lat = gps.lat ?? -6.9667;
  const lon = gps.lon ?? 110.4196;
  const bearing = gps.bearing ?? 0;
  const speedPwm = gps.speed_pwm ?? 0;
  const speed = pwmToKmh(speedPwm);
  const batteryPct = gps.battery_percentage ?? 0;
  const isRoadSnapped = snappedRoute.length >= 2;

  // Memoize directional icons to avoid unnecessary re-creation
  const vehicleIcon = useMemo(() => createDirectionalIcon(bearing, false), [bearing]);
  const miniVehicleIcon = useMemo(() => createDirectionalIcon(bearing, true), [bearing]);

  // Combined clear function — clears both route trail and zone markers
  const handleClearHistory = () => {
    const confirmed = window.confirm(
      'Hapus semua riwayat rute dan zona yang ditandai?\n\nTindakan ini tidak dapat dibatalkan.'
    );
    if (confirmed) {
      clearRouteHistory();
      clearAllZoneEvents();
      console.log('[GPSMap] 🗑️ History cleared (route + zones)');
    }
  };

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
              bearing={bearing}
              speed={speed}
              speedPwm={speedPwm}
              batteryPct={batteryPct}
              loading={loading}
              onClose={onToggleExpand}
              zoneEvents={zoneEvents}
              displayRoute={displayRoute}
              routeStats={stats}
              onClearHistory={handleClearHistory}
              vehicleIcon={vehicleIcon}
              isSnapping={isSnapping}
              isRoadSnapped={isRoadSnapped}
              detailedRouteHistory={detailedRouteHistory}
            />
          ) : (
            <MiniMapView
              lat={lat}
              lon={lon}
              bearing={bearing}
              zoneEvents={zoneEvents}
              displayRoute={displayRoute}
              miniVehicleIcon={miniVehicleIcon}
            />
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
function MiniMapView({ lat, lon, bearing, zoneEvents = [], displayRoute = [], miniVehicleIcon }) {
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
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <MapRecenter lat={lat} lon={lon} />

        {/* Route trail — thin version for mini view */}
        <RouteTrail positions={displayRoute} thin />

        <AnimatedMarker position={[lat, lon]} icon={miniVehicleIcon} />

        {/* Zone event markers in mini view */}
        {zoneEvents.map((evt) => (
          <Circle
            key={evt.id}
            center={[evt.lat, evt.lon]}
            radius={200}
            pathOptions={{
              color: evt.type === 'AMAN' ? '#22c55e' : '#ef4444',
              fillColor: evt.type === 'AMAN' ? '#22c55e' : '#ef4444',
              fillOpacity: 0.15,
              weight: 1,
              opacity: 0.4,
            }}
          />
        ))}
      </MapContainer>

      {/* Coordinate overlay */}
      <div className="absolute top-2 right-2 z-10">
        <div className="text-[8px] font-mono space-y-0.5">
          <div className="text-blue-400">
            LAT: <span className="text-white">{lat.toFixed(2)}</span>
          </div>
          <div className="text-blue-400">
            LON: <span className="text-white">{lon.toFixed(2)}</span>
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
function ExpandedMapView({ lat, lon, bearing, speed, speedPwm, batteryPct, loading, onClose, zoneEvents = [], displayRoute = [], routeStats = {}, onClearHistory, vehicleIcon, isSnapping = false, isRoadSnapped = false, detailedRouteHistory = [] }) {
  const [activeTab, setActiveTab] = useState('map');

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-zinc-900/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
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
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Peta
            </button>
            <button
              onClick={() => setActiveTab('zones')}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'zones'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Zona
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Riwayat
            </button>
          </div>

          {/* Clear History button */}
          <button
            onClick={onClearHistory}
            className="clear-history-btn flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300"
            title="Hapus riwayat rute & zona"
          >
            <Trash2 className="w-3 h-3" />
            Hapus Riwayat
          </button>

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
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <MapRecenter lat={lat} lon={lon} />
            <MapInvalidateSize />

            {/* Route trail — OSRM road-snapped or Catmull-Rom smoothed */}
            <RouteTrail positions={displayRoute} />

            {/* Posko Utama */}
            <Marker position={[-6.9667, 110.4196]} icon={poskoIcon}>
              <Popup>🚨 Posko Utama: Semarang — Pusat Komando Operasi</Popup>
            </Marker>

            {/* Zone event markers from database */}
            {zoneEvents.map((evt) => (
              <ZoneEventMarker key={evt.id} evt={evt} />
            ))}

            {/* Vehicle position — animated directional marker */}
            <AnimatedMarker position={[lat, lon]} icon={vehicleIcon}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                  <strong>🚑 TRK-07 Rescue</strong><br/>
                  Lat: {lat.toFixed(4)}°<br/>
                  Lon: {lon.toFixed(4)}°<br/>
                  Speed: {speed.toFixed(1)} km/h (PWM: {speedPwm})<br/>
                  Bearing: {bearing.toFixed(0)}°
                </div>
              </Popup>
            </AnimatedMarker>
          </MapContainer>
        ) : activeTab === 'zones' ? (
          /* Zone Events Detail Tab — from database */
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-4">
            {zoneEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30">
                <AlertTriangle className="w-8 h-8 mb-2 text-white/20" />
                <p className="text-sm font-medium">Belum ada data zona</p>
                <p className="text-[10px] text-white/20 mt-1">Tekan tombol Zona Aman/Bahaya di kontrol untuk menambah</p>
              </div>
            ) : (
              <div className="space-y-3">
                {zoneEvents.map((evt, i) => {
                  const isAman = evt.type === 'AMAN';
                  return (
                    <div key={evt.id} className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className="flex flex-col items-center shrink-0 pt-1">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                          isAman
                            ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                            : 'bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                        }`} />
                        {i < zoneEvents.length - 1 && <div className="w-0.5 h-12 bg-white/10 mt-1" />}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 rounded-xl p-3 border transition-all ${
                        isAman
                          ? 'bg-emerald-500/5 border-emerald-500/15'
                          : 'bg-red-500/10 border-red-500/20'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white/90">
                            {isAman ? '✅ Zona Aman' : '🔴 Zona Bahaya'}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                            isAman
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {isAman ? 'AMAN' : 'BAHAYA'}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 mb-1.5">{evt.description || 'Tidak ada keterangan'}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-[9px] text-white/30 font-mono">
                            📍 {evt.lat.toFixed(4)}°, {evt.lon.toFixed(4)}°
                          </span>
                          <span className="text-[9px] text-white/30">
                            {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        {evt.screenshot_name && (
                          <p className="text-[9px] text-cyan-400/60 mt-1">📷 {evt.screenshot_name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Logs Detail Tab — from route history */
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-4">
            {detailedRouteHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30">
                <AlertTriangle className="w-8 h-8 mb-2 text-white/20" />
                <p className="text-sm font-medium">Belum ada riwayat rute</p>
                <p className="text-[10px] text-white/20 mt-1">Pergerakan kendaraan akan dicatat di sini</p>
              </div>
            ) : (
              <div className="w-full border border-white/10 rounded-xl overflow-hidden bg-zinc-800/30">
                <table className="w-full text-left text-xs text-white/70">
                  <thead className="bg-zinc-800/80 text-[10px] uppercase font-semibold text-white/50 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-medium">No</th>
                      <th className="px-4 py-3 font-medium">Waktu</th>
                      <th className="px-4 py-3 font-medium">Latitude</th>
                      <th className="px-4 py-3 font-medium">Longitude</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...detailedRouteHistory].reverse().map((log, i) => {
                      const id = detailedRouteHistory.length - i;
                      return (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-white/40">{id}</td>
                          <td className="px-4 py-2.5 text-white/60">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-blue-400/90">{log.lat.toFixed(6)}°</td>
                          <td className="px-4 py-2.5 font-mono text-blue-400/90">{log.lon.toFixed(6)}°</td>
                          <td className="px-4 py-2.5">
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border bg-blue-500/10 text-blue-400 border-blue-500/30">
                              TRACKED
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Floating info cards on map tab */}
        {activeTab === 'map' && (
          <>
            {/* Top-left: coordinate display */}
            <div className="absolute top-3 left-3 z-10 bg-zinc-900/90 backdrop-blur-md rounded-lg border border-white/10 px-3 py-2">
              <div className="text-[9px] font-mono space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-semibold">LAT</span>
                  <span className="text-white font-bold">{lat.toFixed(4)}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-semibold">LON</span>
                  <span className="text-white font-bold">{lon.toFixed(4)}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-semibold">BRG</span>
                  <span className="text-white font-bold">{bearing.toFixed(0)}°</span>
                </div>
              </div>
            </div>

            {/* Top-right: vehicle status */}
            <div className="absolute top-3 right-3 z-10 bg-zinc-900/90 backdrop-blur-md rounded-lg border border-white/10 px-3 py-2">
              <div className="text-[9px] space-y-1">
                <div className="flex items-center gap-2">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span className="text-white/80">{speed.toFixed(1)} km/h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className="w-3 h-3 text-emerald-400" />
                  <span className="text-white/80">{batteryPct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-3 h-3 text-blue-400" style={{ transform: `rotate(${bearing}deg)` }} />
                  <span className="text-blue-400 font-semibold">GPS Aktif</span>
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
                <div className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/60" />
                <span className="text-[9px] text-white/50">Zona Bahaya</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#4285F4] border-2 border-white" style={{ boxShadow: '0 0 6px rgba(66,133,244,0.6)' }} />
                <span className="text-[9px] text-white/50">Kendaraan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-0.5 rounded-full bg-[#4285F4]" style={{ boxShadow: '0 0 6px rgba(66,133,244,0.6)' }} />
                <span className="text-[9px] text-white/50">Rute</span>
              </div>
            </div>

            {/* Route stats overlay — bottom-left */}
            {routeStats.totalPoints > 0 && (
              <div className="absolute bottom-3 left-3 z-10 bg-zinc-900/90 backdrop-blur-md rounded-lg border border-blue-500/20 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Route className="w-3 h-3 text-[#4285F4]" />
                  <span className="text-[9px] text-[#4285F4] font-semibold">Riwayat Rute</span>
                  {isSnapping && (
                    <span className="text-[8px] text-cyan-400 animate-pulse">⟳ Snapping...</span>
                  )}
                </div>
                <div className="text-[9px] text-white/50 space-y-0.5">
                  <div>{routeStats.totalDistanceKm.toFixed(2)} km · {routeStats.totalPoints} titik</div>
                  <div className="text-[8px]">
                    {isRoadSnapped
                      ? <span className="text-emerald-400">🛣️ Road-snapped (OSRM)</span>
                      : <span className="text-amber-400">〰️ Smoothed (Catmull-Rom)</span>
                    }
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom data row */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t border-white/10 bg-zinc-900/95 shrink-0">
        <DataBoxDark label="Latitude" value={`${lat.toFixed(4)}°`} />
        <DataBoxDark label="Longitude" value={`${lon.toFixed(4)}°`} />
        <DataBoxDark label="Kecepatan" value={`${speed.toFixed(1)} km/h`} icon={<Gauge className="w-3 h-3 text-cyan-400" />} />
        <DataBoxDark label="Bearing" value={`${bearing.toFixed(0)}°`} icon={<Navigation className="w-3 h-3 text-blue-400" style={{ transform: `rotate(${bearing}deg)` }} />} highlight />
      </div>
    </div>
  );
}

// Helper: render zone event marker from database
function ZoneEventMarker({ evt }) {
  const isAman = evt.type === 'AMAN';
  return (
    <>
      <Circle
        center={[evt.lat, evt.lon]}
        radius={200}
        pathOptions={{
          color: isAman ? '#22c55e' : '#ef4444',
          fillColor: isAman ? '#22c55e' : '#ef4444',
          fillOpacity: 0.15,
          weight: 2,
          opacity: 0.5,
          dashArray: isAman ? undefined : '6, 4',
        }}
      />
      <Marker position={[evt.lat, evt.lon]} icon={createZoneIcon(evt.type)}>
        <Popup>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
            <strong>{isAman ? '✅ Zona Aman' : '🔴 Zona Bahaya'}</strong><br/>
            {evt.description || 'Tidak ada keterangan'}<br/>
            <span style={{ color: '#888' }}>📍 {evt.lat.toFixed(4)}°, {evt.lon.toFixed(4)}°</span>
            {evt.screenshot_name && (<><br/><span style={{ color: '#0ea5e9' }}>📷 {evt.screenshot_name}</span></>)}
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
        ? 'bg-blue-500/10 border-blue-500/30'
        : 'bg-white/5 border-white/10'
    }`}>
      <p className="text-[9px] text-white/30 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
        {icon}{label}
      </p>
      <p className={`text-xs font-bold ${highlight ? 'text-blue-400' : 'text-white/80'}`}>
        {value}
      </p>
    </div>
  );
}
