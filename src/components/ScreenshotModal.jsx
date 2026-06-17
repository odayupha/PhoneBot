import { useState, useEffect } from 'react';
import { Camera, X, Download, Shield, ShieldAlert, Gamepad2, AlertCircle } from 'lucide-react';

/**
 * ScreenshotModal — Modal overlay setelah screenshot kamera.
 * 
 * Props:
 *  - screenshotData: base64 image data URL
 *  - onSave: (data) => void — callback saat simpan
 *  - onClose: () => void — callback saat tutup
 *  - currentLat: number
 *  - currentLon: number
 *  - initialZoneType: 'AMAN' | 'BAHAYA' — preset dari controller button (optional)
 *  - triggerSource: { button, zoneType, zoneDangerField } — info tombol controller (optional)
 */
export default function ScreenshotModal({ 
  screenshotData, onSave, onClose, currentLat, currentLon,
  initialZoneType, triggerSource 
}) {
  const [zoneType, setZoneType] = useState(initialZoneType || 'AMAN');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDescError, setShowDescError] = useState(false);

  // Sync initialZoneType jika berubah (dari controller button yang berbeda)
  useEffect(() => {
    if (initialZoneType) {
      setZoneType(initialZoneType);
    }
  }, [initialZoneType]);

  // Nama tombol controller yang user-friendly
  const buttonDisplayName = (btnKey) => {
    const map = {
      button_circle: '⭕ Circle',
      button_cross_gas: '❌ Cross',
      button_square: '⬜ Square',
      button_triangle: '🔺 Triangle',
      button_start: '▶️ Start',
      button_select: '⏸️ Select',
    };
    return map[btnKey] || btnKey;
  };

  const handleSave = async () => {
    // Validasi: description wajib diisi
    if (!description.trim()) {
      setShowDescError(true);
      return;
    }

    setSaving(true);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zonaSuffix = zoneType === 'AMAN' ? 'zona_aman' : 'zona_bahaya';
    const fileName = `screenshot_Rescue_${timestamp}_${zonaSuffix}.png`;

    // Download the screenshot
    try {
      const link = document.createElement('a');
      link.href = screenshotData;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[Screenshot] Download error:', err);
    }

    // Callback to parent to save zone event to Firebase
    if (onSave) {
      await onSave({
        type: zoneType,
        lat: currentLat,
        lon: currentLon,
        description,
        screenshot_name: fileName,
        trigger_button: triggerSource?.button || 'manual',
      });
    }

    setSaving(false);
    onClose();
  };

  if (!screenshotData) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/15 rounded-2xl shadow-2xl w-[520px] max-w-[95vw] overflow-hidden animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center">
              <Camera className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Screenshot Rescue</h2>
              <p className="text-[10px] text-white/40">
                {triggerSource 
                  ? `Dari controller: ${buttonDisplayName(triggerSource.button)}`
                  : 'Simpan tangkapan layar kamera'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>

        {/* Controller trigger indicator */}
        {triggerSource && (
          <div className={`mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border ${
            triggerSource.zoneType === 'BAHAYA'
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <Gamepad2 className={`w-4 h-4 ${
              triggerSource.zoneType === 'BAHAYA' ? 'text-red-400' : 'text-emerald-400'
            }`} />
            <span className="text-[11px] text-white/70">
              Tombol <strong className="text-white/90">{buttonDisplayName(triggerSource.button)}</strong> ditekan 
              — otomatis ditandai sebagai <strong className={
                triggerSource.zoneType === 'BAHAYA' ? 'text-red-400' : 'text-emerald-400'
              }>{triggerSource.zoneType === 'BAHAYA' ? 'ZONA BAHAYA' : 'ZONA AMAN'}</strong>
            </span>
          </div>
        )}

        {/* Screenshot Preview */}
        <div className="px-5 pt-4">
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
            <img
              src={screenshotData}
              alt="Screenshot Preview"
              className="w-full h-auto max-h-[240px] object-contain"
            />
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Zone Type Selection */}
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">
              Tipe Zona
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setZoneType('AMAN')}
                className={`py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  zoneType === 'AMAN'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                }`}
              >
                <Shield className="w-4 h-4" />
                Zona Aman
              </button>
              <button
                onClick={() => setZoneType('BAHAYA')}
                className={`py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  zoneType === 'BAHAYA'
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-lg shadow-red-500/10'
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Zona Bahaya
              </button>
            </div>
          </div>

          {/* Description Input — WAJIB DIISI */}
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              Alasan / Keterangan <span className="text-red-400">*wajib</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value.trim()) setShowDescError(false);
              }}
              placeholder={zoneType === 'AMAN' 
                ? 'Jelaskan kenapa zona ini AMAN. Contoh: Area terbuka, aman untuk evakuasi, tidak ada reruntuhan...' 
                : 'Jelaskan kenapa zona ini BAHAYA. Contoh: Bangunan runtuh, jalan terputus, longsor aktif...'}
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 outline-none transition-colors resize-none ${
                showDescError 
                  ? 'border-red-500/60 focus:border-red-500/80' 
                  : 'border-white/10 focus:border-white/30'
              }`}
              rows={3}
              autoFocus={!!triggerSource}
            />
            {showDescError && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-[10px] text-red-400 font-medium">
                  Harap masukkan alasan kenapa zona ini {zoneType === 'AMAN' ? 'aman' : 'bahaya'}
                </span>
              </div>
            )}
          </div>

          {/* Location Info */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-white/30 font-mono">
              📍 {currentLat?.toFixed(4)}°, {currentLon?.toFixed(4)}°
            </span>
            <span className="text-[10px] text-white/20">
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              zoneType === 'AMAN'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Download className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan & Tandai Peta'}
          </button>
        </div>
      </div>
    </div>
  );
}
