import { ScanBarcode, CheckCircle2, Loader2, Clock, Box, MapPin, Package } from 'lucide-react';
import { useShipments } from '../hooks/useShipments';

const STATUS_CFG = {
  picked_up: { badge: 'bg-blue-50 text-blue-700 border-blue-200', iconBg: 'bg-blue-100 text-blue-600', label: 'Dikirim' },
  in_transit: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', iconBg: 'bg-indigo-100 text-indigo-600', label: 'Dalam Perjalanan' },
  delivered: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconBg: 'bg-emerald-50 text-emerald-500', label: 'Terkirim' },
  pending: { badge: 'bg-amber-50 text-amber-700 border-amber-200', iconBg: 'bg-amber-100 text-amber-600', label: 'Menunggu' },
};

// Fallback data jika Firestore kosong / loading
const FALLBACK_LOGS = [
  { id: 'f1', code: 'BNC-2024-0091', detail: 'Obat-obatan — 15 dus', status: 'picked_up', destination: 'Pos Evakuasi A', timestamp: { seconds: 0 } },
  { id: 'f2', code: 'BNC-2024-0092', detail: 'Selimut & Tenda — 20 unit', status: 'in_transit', destination: 'Shelter Utara', timestamp: { seconds: 0 } },
  { id: 'f3', code: 'BNC-2024-0093', detail: 'Air Bersih — 50 galon', status: 'delivered', destination: 'Camp Pengungsi B', timestamp: { seconds: 0 } },
  { id: 'f4', code: 'BNC-2024-0094', detail: 'Makanan Siap Saji — 200 pack', status: 'pending', destination: 'Posko Darurat', timestamp: { seconds: 0 } },
];

function StatusIcon({ status }) {
  if (status === 'picked_up') return <ScanBarcode className="w-3.5 h-3.5" />;
  if (status === 'delivered') return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (status === 'in_transit') return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
  return <Clock className="w-3.5 h-3.5" />;
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  try {
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function MissionLog() {
  const { shipments, loading } = useShipments('TRK-07');

  // Use Firebase data if available, fallback to dummy
  const logs = shipments.length > 0 ? shipments : FALLBACK_LOGS;

  const handleAddMission = () => console.log('[Mission] Menambah misi distribusi baru...');
  const handleLogClick = (id) => console.log(`[Mission] Clicked: ${id}`);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-600" />
          <h2 className="text-sm font-semibold text-slate-800">Misi Distribusi</h2>
          <span className="text-[10px] text-slate-400 font-medium">(Bantuan)</span>
          {loading && <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>}
        </div>
        <button onClick={handleAddMission} className="text-[10px] font-semibold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md border border-orange-200 transition-all cursor-pointer">+ Tambah</button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {logs.map((log) => {
          const cfg = STATUS_CFG[log.status] || STATUS_CFG.pending;
          const label = log.statusLabel || cfg.label;
          return (
            <button key={log.id || log.code} onClick={() => handleLogClick(log.id || log.code)} className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all group cursor-pointer">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}><Box className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-700 font-mono">{log.code}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{log.destination}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">{formatTime(log.timestamp)}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[11px] text-slate-500 truncate">{log.detail}</span>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${cfg.badge}`}>
                  <StatusIcon status={log.status} />
                  {label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
