import { useState, useEffect, useRef } from 'react';
import { Camera, Wifi, WifiOff, Radio, RefreshCw, Play, Pause, SkipForward, Maximize } from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';

// ============ AGORA CONFIG ============
const AGORA_APP_ID = 'e8ef6a61f09d46f7bc9c4bf7d6bb23e3';
const AGORA_CHANNEL = 'TRK-07_camera';

export default function LiveCamera() {
  const videoRef = useRef(null);
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize Agora client
  useEffect(() => {
    let cancelled = false;
    const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    client.setClientRole('audience');
    clientRef.current = client;

    // When a remote user publishes video
    client.on('user-published', async (user, mediaType) => {
      if (cancelled) return;
      await client.subscribe(user, mediaType);
      console.log('[Agora] Subscribed to user:', user.uid, 'mediaType:', mediaType);

      if (mediaType === 'video') {
        setRemoteUser(user);
        const videoTrack = user.videoTrack;
        if (videoTrack && videoRef.current) {
          videoTrack.play(videoRef.current);
        }
      }
    });

    client.on('user-unpublished', (user, mediaType) => {
      console.log('[Agora] User unpublished:', user.uid);
      if (mediaType === 'video') {
        setRemoteUser(null);
      }
    });

    client.on('user-left', (user) => {
      console.log('[Agora] User left:', user.uid);
      setRemoteUser(null);
    });

    // Auto-join on mount (with guard for React strict mode)
    (async () => {
      if (cancelled) return;
      setConnecting(true);
      setError(null);
      try {
        await client.join(AGORA_APP_ID, AGORA_CHANNEL, null, null);
        if (!cancelled) {
          setConnected(true);
          console.log('[Agora] ✅ Joined channel:', AGORA_CHANNEL);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Agora] ❌ Join error:', err);
          setError(err.message || 'Gagal terhubung ke stream');
          setConnected(false);
        }
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
      client.leave().catch(() => {});
    };
  }, [retryCount]);

  const handleReconnect = () => {
    if (clientRef.current) {
      clientRef.current.leave().catch(() => {});
    }
    setConnected(false);
    setRemoteUser(null);
    setRetryCount((c) => c + 1);
  };

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      {/* Video container for Agora */}
      <div
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: '#0a0a0a' }}
      />

      {/* Overlay when no video */}
      {!remoteUser && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gradient-to-br from-zinc-900 via-neutral-900 to-zinc-900">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/40 text-sm font-medium">
            {connecting ? 'Menghubungkan ke kamera...' : error ? error : 'Menunggu stream kamera...'}
          </p>
          <p className="text-white/20 text-[10px] mt-1 font-mono">
            Channel: {AGORA_CHANNEL}
          </p>
          {error && (
            <button
              onClick={handleReconnect}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* LIVE indicator — top left */}
      {remoteUser && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 z-20">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 blink-rec" />
          <span className="text-[11px] font-bold text-red-400 tracking-wider blink-rec">REC</span>
        </div>
      )}

      {/* Channel info — top right */}
      <div className="absolute top-4 right-4 z-20">
        <span className="text-[10px] font-mono text-white/40 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
          {AGORA_CHANNEL}
        </span>
      </div>

      {/* Playback controls — bottom left */}
      <div className="absolute bottom-4 left-8 z-20 flex items-center gap-3">
        <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm">
          <Play className="w-3.5 h-3.5 text-white/80 ml-0.5" />
        </button>
        <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm">
          <Pause className="w-3 h-3 text-white/60" />
        </button>
        <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm">
          <SkipForward className="w-3 h-3 text-white/60" />
        </button>
        <button
          onClick={handleReconnect}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
          title="Reconnect"
        >
          <RefreshCw className={`w-3 h-3 text-white/60 ${connecting ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Fullscreen button — bottom right (above map) */}
      <div className="absolute bottom-56 right-4 z-20">
        <button className="w-8 h-8 rounded bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm border border-white/10">
          <Maximize className="w-3.5 h-3.5 text-white/60" />
        </button>
      </div>

      {/* Connection indicator */}
      {!connected && !connecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-red-900/60 text-red-300 border border-red-500/30 backdrop-blur-sm">
            <WifiOff className="w-3 h-3" />
            OFFLINE
          </span>
        </div>
      )}
    </div>
  );
}
