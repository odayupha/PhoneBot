import { ShieldAlert } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="bg-black/80 backdrop-blur-sm border-b border-white/10 px-5 py-2 flex items-center justify-between z-40 relative">
      {/* Left — Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Center — Title */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <h1 className="text-xs font-semibold text-white/70 tracking-[0.2em] uppercase">
          Rescue Control Center
        </h1>
      </div>

      {/* Right — LIVE Badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider bg-red-600/90 text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-white blink-rec" />
          LIVE
        </span>
      </div>
    </header>
  );
}
