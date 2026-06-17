import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Camera, Wifi, WifiOff, Radio, RefreshCw, Play, Pause, SkipForward, Maximize, Mic, MicOff, CameraIcon } from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';

// ============ AGORA CONFIG ============
const AGORA_APP_ID = 'e8ef6a61f09d46f7bc9c4bf7d6bb23e3';
const AGORA_CHANNEL = 'TRK-07_camera';

const LiveCamera = forwardRef(function LiveCamera({ onScreenshotReady }, ref) {
  const videoRef = useRef(null);
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // === AUDIO STATE (Fitur 6) ===
  const [audioActive, setAudioActive] = useState(false);
  const [audioConnecting, setAudioConnecting] = useState(false);
  const localAudioTrackRef = useRef(null);
  const remoteAudioUserRef = useRef(null);

  // Initialize Agora client
  useEffect(() => {
    let cancelled = false;
    const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    client.setClientRole('audience');
    clientRef.current = client;

    // When a remote user publishes video/audio
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

      if (mediaType === 'audio') {
        // Auto-play remote audio (from camera device)
        const audioTrack = user.audioTrack;
        if (audioTrack) {
          audioTrack.play();
          remoteAudioUserRef.current = user;
          console.log('[Agora] 🔊 Remote audio playing from user:', user.uid);
        }
      }
    });

    client.on('user-unpublished', (user, mediaType) => {
      console.log('[Agora] User unpublished:', user.uid);
      if (mediaType === 'video') {
        setRemoteUser(null);
      }
      if (mediaType === 'audio') {
        remoteAudioUserRef.current = null;
      }
    });

    client.on('user-left', (user) => {
      console.log('[Agora] User left:', user.uid);
      setRemoteUser(null);
      remoteAudioUserRef.current = null;
    });

    // Auto-join on mount
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
      // Cleanup audio track if active
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      client.leave().catch(() => {});
    };
  }, [retryCount]);

  const handleReconnect = () => {
    if (clientRef.current) {
      clientRef.current.leave().catch(() => {});
    }
    setConnected(false);
    setRemoteUser(null);
    setAudioActive(false);
    setRetryCount((c) => c + 1);
  };

  // === SCREENSHOT FUNCTION (Fitur 5) ===
  const captureScreenshot = useCallback(() => {
    console.log('[Screenshot] Capturing...');
    
    // Try to get video element from the Agora container
    const videoContainer = videoRef.current;
    if (!videoContainer) {
      console.error('[Screenshot] No video container');
      return;
    }

    const videoElement = videoContainer.querySelector('video');
    if (!videoElement) {
      console.error('[Screenshot] No video element found');
      // Fallback: capture the container as-is
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Add timestamp overlay
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText(
        `RESCUE TRK-07 | ${new Date().toLocaleString('id-ID')}`,
        10,
        canvas.height - 10
      );

      const dataUrl = canvas.toDataURL('image/png');
      console.log('[Screenshot] ✅ Captured successfully');

      if (onScreenshotReady) {
        onScreenshotReady(dataUrl);
      }
    } catch (err) {
      console.error('[Screenshot] Error capturing:', err);
    }
  }, [onScreenshotReady]);

  // Expose captureScreenshot to parent via ref
  useImperativeHandle(ref, () => ({
    captureScreenshot,
  }));

  // === AUDIO TOGGLE (Fitur 6: Push-to-Talk) ===
  const toggleAudio = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !connected) return;

    if (audioActive) {
      // Stop audio — switch back to audience
      try {
        if (localAudioTrackRef.current) {
          await client.unpublish(localAudioTrackRef.current);
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        }
        await client.setClientRole('audience');
        setAudioActive(false);
        console.log('[Audio] 🔇 Mic OFF — switched to audience');
      } catch (err) {
        console.error('[Audio] Stop error:', err);
      }
    } else {
      // Start audio — switch to host and publish mic
      setAudioConnecting(true);
      try {
        await client.setClientRole('host');
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;
        await client.publish(audioTrack);
        setAudioActive(true);
        console.log('[Audio] 🎙️ Mic ON — broadcasting to channel');
      } catch (err) {
        console.error('[Audio] Start error:', err);
        // Revert to audience on error
        try {
          await client.setClientRole('audience');
        } catch (_) {}
      } finally {
        setAudioConnecting(false);
      }
    }
  }, [connected, audioActive]);

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

      {/* Audio indicator — top left below REC */}
      {audioActive && (
        <div className="absolute top-10 left-4 flex items-center gap-1.5 z-20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 tracking-wider">🎙️ AUDIO AKTIF</span>
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

        {/* Separator */}
        <div className="w-px h-5 bg-white/10" />

        {/* Screenshot button (Fitur 5) */}
        <button
          onClick={captureScreenshot}
          className="w-8 h-8 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
          title="Screenshot kamera"
        >
          <CameraIcon className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {/* Audio toggle button (Fitur 6) */}
        <button
          onClick={toggleAudio}
          disabled={audioConnecting || !connected}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm border ${
            audioActive
              ? 'bg-emerald-500/30 border-emerald-500/40 shadow-lg shadow-emerald-500/20 animate-pulse'
              : 'bg-white/10 hover:bg-white/20 border-white/10'
          } ${audioConnecting ? 'opacity-50' : ''} ${!connected ? 'opacity-30 cursor-not-allowed' : ''}`}
          title={audioActive ? 'Matikan mikrofon' : 'Aktifkan mikrofon (Push-to-Talk)'}
        >
          {audioActive
            ? <Mic className="w-3.5 h-3.5 text-emerald-400" />
            : <MicOff className="w-3.5 h-3.5 text-white/60" />
          }
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
});

export default LiveCamera;
