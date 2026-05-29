import { Battery, Wifi, Signal, MapPin, AlertTriangle, Radio } from 'lucide-react';
import { useGPS } from '../hooks/useGPS';
import { useVehicleControl } from '../hooks/useVehicleControl';
import { useState, useEffect } from 'react';

// Simulated alert logs
const ALERT_LOGS = [
  { time: '09:12', text: 'Puing Stabil', type: 'info' },
  { time: '09:14', text: 'Area Gas Aman', type: 'success' },
  { time: '09:16', text: 'Tim Cari Bergerak ke Selatan', type: 'warning' },
];

export default function StatusBar() {
  const { gps } = useGPS('TRK-07');
  const { control } = useVehicleControl('TRK-07');

  const lat = gps.lat ?? -6.7320;
  const lon = gps.lon ?? 108.5523;
  const speed = gps.speed ?? 0;
  const fuel = gps.fuel ?? 0;

  // Simulated battery and signal data
  const battery = fuel > 0 ? fuel : 88;
  const batteryHours = Math.round((battery / 100) * 5);

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
        {/* Column 1: Identitas & Energi */}
        <div className="px-4 py-3">
          <h3 className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            Identitas & Energi
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/90 font-semibold">
                UNIT: RESCUE-07 (TRK) |
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Battery className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">
                Baterai: {battery}% ({batteryHours} Jam Sisa)
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
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-white/80">
                Comms: <span className="text-emerald-400 font-medium">📶 Sinyal Kuat</span>
                <span className="text-white/40 ml-1">(95ms)</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Signal className="w-3 h-3 text-blue-400" />
              <span className="text-[11px] text-white/80">
                Data: <span className="text-blue-400 font-medium">5.2Mbps</span>
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
                <span className="text-cyan-400 font-medium">(3 meter akurasi)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Column 4: Log Alert Operasi */}
        <div className="px-4 py-3">
          <h3 className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mb-2">
            Log Alert Operasi
          </h3>
          <div className="space-y-0.5">
            <p className="text-[10px] text-white/50 mb-1">Log Peringatan:</p>
            {ALERT_LOGS.map((log, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className={`text-[10px] font-mono font-bold ${
                  log.type === 'warning' ? 'text-amber-400' :
                  log.type === 'success' ? 'text-emerald-400' :
                  'text-blue-400'
                }`}>
                  [{log.time}]
                </span>
                <span className={`text-[10px] ${
                  log.type === 'warning' ? 'text-amber-300' :
                  log.type === 'success' ? 'text-emerald-300' :
                  'text-blue-300'
                }`}>
                  {log.text}
                </span>
              </div>
            ))}
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
