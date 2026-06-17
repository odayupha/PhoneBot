import { Wifi, Signal, MapPin, AlertTriangle, Radio, Shield, ShieldAlert, ShieldX, Zap, Gauge, Fuel } from 'lucide-react';
import { useGPS } from '../hooks/useGPS';
import { useVehicleControl } from '../hooks/useVehicleControl';
import { useDriverMonitor } from '../hooks/useDriverMonitor';
import { useState, useEffect } from 'react';

/**
 * StatusBar — Panel status bawah dashboard.
 *
 * Perubahan utama:
 *  - Kolom "Identitas & BBM": menampilkan informasi unit dan BBM
 *  - Energi dihilangkan dari tampilan
 *  - Menampilkan pwm_speed dan speed_pwm di kolom Koneksi
 *  - Kecepatan dikonversi dari PWM database
 *  - Menampilkan safety_zone dari DMS dengan warna indikator
 */
export default function StatusBar() {
  const { gps } = useGPS('TRK-07');
  const { control } = useVehicleControl('TRK-07');
  const { dms } = useDriverMonitor('TRK-07');

  const lat = gps.lat ?? -6.7320;
  const lon = gps.lon ?? 108.5523;
  const speed = gps.speed ?? 0;

  // Konversi PWM → km/h
  const MAX_SPEED_KMH = 120.0;
  const speedPwm = gps.speed_pwm ?? 0;
  const speedFromPwm = (speedPwm / 255) * MAX_SPEED_KMH;

  // Data BBM (placeholder — sesuaikan dengan sensor jika ada)
  const bbmPct = gps.bbm_percentage ?? 64;
  const pwmSpeed = gps.pwm_speed ?? 0;
  const uptimeSeconds = gps.uptime_seconds ?? 0;
  const wifiRssi = gps.wifi_rssi ?? -100;

  // Estimasi sisa BBM (placeholder)
  const bbmHours = Math.round((bbmPct / 100) * 5);

  // Warna BBM berdasarkan level
  const getBBMColor = (pct) => {
    if (pct > 50) return 'text-emerald-400';
    if (pct > 20) return 'text-amber-400';
    return 'text-red-400';
  };

  // Safety zone dari DMS
  const safetyZone = dms.safety_zone ?? 'AMAN';
  const getZoneStyle = (zone) => {
    switch (zone) {
      case 'BAHAYA':
        return { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40', icon: ShieldX, label: '🔴 BAHAYA' };
      case 'SIAGA':
        return { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', icon: ShieldAlert, label: '🟡 SIAGA' };
      case 'AMAN':
      default:
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', icon: Shield, label: '🟢 AMAN' };
    }
  };
  const zoneStyle = getZoneStyle(safetyZone);
  const ZoneIcon = zoneStyle.icon;

  // Format uptime
  const formatUptime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}j ${m}m`;
  };

  // WiFi signal quality
  const getWifiLabel = (rssi) => {
    if (rssi >= -50) return { text: '📶 Sangat Kuat', color: 'text-emerald-400' };
    if (rssi >= -65) return { text: '📶 Kuat', color: 'text-emerald-400' };
    if (rssi >= -75) return { text: '📶 Sedang', color: 'text-amber-400' };
    return { text: '📶 Lemah', color: 'text-red-400' };
  };
  const wifiInfo = getWifiLabel(wifiRssi);

  return (
    <div className="bg-zinc-900/95 backdrop-blur-md border-t border-white/10">
      {/* STATUS INDICATOR label */}
      <div className="text-center py-1.5 border-b border-white/5">
        <span className="text-[10px] font-semibold tracking-[0.25em] text-white/40 uppercase">
          Status Indicator
        </span>
      </div>

      {/* 4-column info grid */}
      <div className="grid grid-cols-4 divide-x divide-white/10">
        {/* Column 1: Identitas & BBM */}
        <div className="px-4 py-3">
          <h3 className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            Identitas & BBM
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/90 font-semibold">
                UNIT: RESCUE-07 (TRK) |
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel className={`w-3 h-3 ${getBBMColor(bbmPct)}`} />
              <span className={`text-[11px] ${getBBMColor(bbmPct)} font-medium`}>
                BBM: {bbmPct}% ({bbmHours} Jam Sisa)
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Koneksi & Telemetri */}
        <div className="px-4 py-3">
          <h3 className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            Koneksi & Telemetri
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Wifi className={`w-3 h-3 ${wifiInfo.color}`} />
              <span className="text-[11px] text-white/80">
                WiFi: <span className={`${wifiInfo.color} font-medium`}>{wifiInfo.text}</span>
                <span className="text-white/40 ml-1">({wifiRssi}dBm)</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span className="text-[11px] text-white/80">
                PWM Motor: <span className="text-cyan-400 font-medium">{speedPwm}/255</span>
                <span className="text-white/40 ml-1">({speedFromPwm.toFixed(1)} km/h)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: Lokasi & Presisi */}
        <div className="px-4 py-3">
          <h3 className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            Lokasi & Presisi
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-white/80">
                GPS: <span className="text-emerald-400 font-medium">🟢 Aktif</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span className="text-[11px] text-white/80">
                <span className="text-cyan-400 font-medium">({gps.accuracy ?? 3} meter akurasi)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Column 4: Zona Keamanan DMS */}
        <div className="px-4 py-3">
          <h3 className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            Zona Keamanan DMS
          </h3>
          <div className="space-y-1">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${zoneStyle.bg} border ${zoneStyle.border}`}>
              <ZoneIcon className={`w-3.5 h-3.5 ${zoneStyle.color}`} />
              <span className={`text-[11px] font-bold ${zoneStyle.color}`}>
                {zoneStyle.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-white/40" />
              <span className="text-[10px] text-white/50">
                Skor: {dms.drowsiness_score ?? 0} | Mata: {(dms.eyes_closed_sec ?? 0).toFixed(1)}s | {(dms.driving_hours ?? 0).toFixed(1)}j
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-white/5 px-4 py-1.5 flex items-center justify-end">
        <span className="text-[9px] text-white/20 font-mono">
          Klik untuk memperbesar panel
        </span>
      </div>
    </div>
  );
}
