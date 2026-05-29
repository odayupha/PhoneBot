import { useState, useRef } from 'react';
import { OctagonX, Lock, Navigation, Gauge, BellRing, Volume2, ShieldAlert } from 'lucide-react';
import { useVehicleControl } from '../hooks/useVehicleControl';

export default function ControlPanel() {
  const {
    control, loading,
    setEngineKill, setEngineLock, setGeoFence, setBuzzer, setSpeedLimit,
  } = useVehicleControl('TRK-07');

  const speedLimit = control.speed_limit ?? 80;
  const engineLocked = control.engine_lock ?? false;
  const geoFenceOn = control.geo_fence ?? true;
  const buzzerActive = control.buzzer ?? false;

  // Local speed state for smooth slider, commit on release
  const [localSpeed, setLocalSpeed] = useState(null);
  const displaySpeed = localSpeed !== null ? localSpeed : speedLimit;

  const handleEmergencyStop = () => {
    console.log('[Control] EMERGENCY STOP triggered!');
    setEngineKill(true);
  };

  const handleEngineLock = () => setEngineLock(!engineLocked);
  const handleGeoFence = () => setGeoFence(!geoFenceOn);
  const handleBuzzer = () => setBuzzer(!buzzerActive);

  const handleSpeedInput = (e) => {
    setLocalSpeed(Number(e.target.value));
  };

  const handleSpeedCommit = () => {
    if (localSpeed !== null) {
      setSpeedLimit(localSpeed);
      setLocalSpeed(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-orange-600" />
        <h2 className="text-sm font-semibold text-slate-800">Kontrol Kendaraan Rescue</h2>
        {loading && <span className="text-[10px] text-blue-500 animate-pulse">Connecting...</span>}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Emergency Stop */}
        <button
          onClick={handleEmergencyStop}
          className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/25 hover:shadow-red-600/40 cursor-pointer"
        >
          <OctagonX className="w-5 h-5" />
          Emergency Stop
        </button>

        {/* Engine Lock + Geo-Fence */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleEngineLock}
            className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              engineLocked
                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            Engine Lock
          </button>
          <button
            onClick={handleGeoFence}
            className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              geoFenceOn
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Navigation className="w-4 h-4" />
            Geo-Fence
          </button>
        </div>

        {/* Alarm / Sirine */}
        <button
          onClick={handleBuzzer}
          className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
            buzzerActive
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {buzzerActive ? <Volume2 className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
          Sirine Darurat {buzzerActive ? '(ON)' : '(OFF)'}
        </button>

        {/* Speed Limiter — commits to Firebase only on slider release */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">Batas Kecepatan</span>
            <span className="text-sm font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
              {displaySpeed} km/h
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={120}
            value={displaySpeed}
            onChange={handleSpeedInput}
            onMouseUp={handleSpeedCommit}
            onTouchEnd={handleSpeedCommit}
            className="w-full"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">0 km/h</span>
            <span className="text-[10px] text-slate-400">120 km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
