import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { RotateCcw, Trophy, Play, Zap, Timer } from 'lucide-react';

interface PolyTrackGameProps {
  isMuted: boolean;
  embedUrl?: string;
}

export const PolyTrackGame: React.FC<PolyTrackGameProps> = ({ embedUrl }) => {
  const [useEmbed, setUseEmbed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'START' | 'RACING' | 'FINISHED'>('START');
  const [currentLapTime, setCurrentLapTime] = useState('00:00.00');
  const [bestLapTime, setBestLapTime] = useState(() => {
    return localStorage.getItem('poly_track_best') || '--:--.--';
  });
  const [speedKmh, setSpeedKmh] = useState(0);

  const engineRef = useRef({
    car: {
      x: 400,
      y: 450,
      vx: 0,
      vy: 0,
      speed: 0,
      angle: -Math.PI / 2,
      angularVelocity: 0,
      drift: 0,
    },
    checkpointsPassed: 0,
    startTime: 0,
    lapTimeMs: 0,
    keys: { forward: false, backward: false, left: false, right: false },
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number }[],
    // Waypoints / track curve points
    trackRadiusX: 280,
    trackRadiusY: 180,
    trackCenterX: 400,
    trackCenterY: 270,
  });

  const startRace = () => {
    engineRef.current.car = {
      x: 400,
      y: 450,
      vx: 0,
      vy: 0,
      speed: 0,
      angle: -Math.PI / 2,
      angularVelocity: 0,
      drift: 0,
    };
    engineRef.current.checkpointsPassed = 0;
    engineRef.current.startTime = Date.now();
    setGameState('RACING');
    sound.playPowerup();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { keys } = engineRef.current;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.forward = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keys.backward = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const { keys } = engineRef.current;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.forward = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keys.backward = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Poly Track Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const state = engineRef.current;
      const c = state.car;
      const width = canvas.width;
      const height = canvas.height;

      if (gameState === 'RACING') {
        const elapsed = Date.now() - state.startTime;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const ms = Math.floor((elapsed % 1000) / 10);
        const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
        setCurrentLapTime(formatted);

        // Acceleration & physics
        if (state.keys.forward) {
          c.speed = Math.min(13, c.speed + 0.35);
        } else if (state.keys.backward) {
          c.speed = Math.max(-4, c.speed - 0.3);
        } else {
          c.speed *= 0.97;
        }

        // Steering
        const turnSpeed = 0.055 * (Math.abs(c.speed) / 10);
        if (state.keys.left) c.angle -= turnSpeed;
        if (state.keys.right) c.angle += turnSpeed;

        c.vx = Math.cos(c.angle) * c.speed;
        c.vy = Math.sin(c.angle) * c.speed;
        c.x += c.vx;
        c.y += c.vy;

        setSpeedKmh(Math.round(Math.abs(c.speed) * 22));

        // Smoke particles when turning fast (drifting)
        if (Math.abs(c.speed) > 7 && (state.keys.left || state.keys.right)) {
          state.particles.push({
            x: c.x - Math.cos(c.angle) * 16,
            y: c.y - Math.sin(c.angle) * 16,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: 'rgba(255,255,255,0.6)',
            life: 0.6,
          });
        }

        // Checkpoint checking around track ellipse
        // Track angle of car relative to track center
        const relAngle = Math.atan2(c.y - state.trackCenterY, c.x - state.trackCenterX);
        // Normalized 0 to 2PI
        const normAngle = (relAngle + Math.PI * 2) % (Math.PI * 2);

        // Check lap completion
        if (c.x > 380 && c.x < 420 && c.y > 400 && state.checkpointsPassed >= 3) {
          sound.playCoin();
          setGameState('FINISHED');
          state.lapTimeMs = elapsed;
          const best = localStorage.getItem('poly_track_best');
          if (!best || formatted < best) {
            localStorage.setItem('poly_track_best', formatted);
            setBestLapTime(formatted);
          }
        }

        if (normAngle > Math.PI * 0.5 && state.checkpointsPassed === 0) state.checkpointsPassed = 1;
        if (normAngle > Math.PI && state.checkpointsPassed === 1) state.checkpointsPassed = 2;
        if (normAngle > Math.PI * 1.5 && state.checkpointsPassed === 2) state.checkpointsPassed = 3;
      }

      // RENDER POLYGON SKY TRACK
      // Gradient Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Low poly floating clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(80, 80);
      ctx.lineTo(130, 60);
      ctx.lineTo(170, 75);
      ctx.lineTo(140, 95);
      ctx.lineTo(70, 95);
      ctx.fill();

      // Elevated Stunt Track (Trackmania / Poly Track low-poly style)
      // Track outer and inner border
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 75;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(state.trackCenterX, state.trackCenterY, state.trackRadiusX, state.trackRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Track cyan surface
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 65;
      ctx.beginPath();
      ctx.ellipse(state.trackCenterX, state.trackCenterY, state.trackRadiusX, state.trackRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Checkered Start / Finish Line
      ctx.save();
      ctx.translate(400, 450);
      ctx.fillStyle = '#000000';
      ctx.fillRect(-6, -32, 12, 64);
      ctx.fillStyle = '#ffffff';
      for (let i = -32; i < 32; i += 8) {
        ctx.fillRect(-6, i, 6, 8);
        ctx.fillRect(0, i + 4, 6, 8);
      }
      ctx.restore();

      // Boost Pad on top straight
      ctx.save();
      ctx.translate(400, 90);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-20, -25, 40, 50);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('>> BOOST >>', 0, 0);
      ctx.restore();

      // Car boost trigger
      if (Math.abs(c.x - 400) < 30 && Math.abs(c.y - 90) < 25) {
        c.speed = 17;
        sound.playLaser();
      }

      // Draw Low-Poly Race Car
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(-2, 4, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Car Chassis (Sharp Low-Poly Orange/Cyan Stunt Car)
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(8, -12);
      ctx.lineTo(-20, -11);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-20, 11);
      ctx.lineTo(8, 12);
      ctx.closePath();
      ctx.fill();

      // Cockpit Windshield (Glossy Cyan Poly)
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.moveTo(8, -7);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-8, 6);
      ctx.lineTo(8, 7);
      ctx.closePath();
      ctx.fill();

      // Rear wing spoiler
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-24, -13, 5, 26);

      ctx.restore();

      // Draw particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 0.04;
        if (pt.life <= 0) {
          state.particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 font-display select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={520}
        className="w-full h-full max-h-[520px] object-contain rounded-lg border border-slate-800 shadow-2xl bg-sky-500"
      />

      {/* Top Lap & Speed HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none px-4">
        <div className="bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-6 shadow-xl">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-medium block">Current Lap</span>
              <span className="text-xl font-bold font-mono text-cyan-400 tabular-nums">{currentLapTime}</span>
            </div>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-medium block">Best Record</span>
            <span className="text-lg font-bold font-mono text-amber-400 tabular-nums">{bestLapTime}</span>
          </div>
        </div>

        <div className="bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-2xl font-black font-mono text-white tabular-nums">{speedKmh}</span>
          <span className="text-xs text-slate-400 uppercase">KM/H</span>
        </div>
      </div>

      {/* Start screen */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">
            POLY TRACK
          </h2>
          <p className="text-slate-300 text-sm max-w-md mb-6">
            Master aerial loops, drift through fast chicanes, and set the fastest lap record on the low-poly stunt track in the sky!
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-8 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <span><strong className="text-white">W / ↑</strong> Accelerate</span>
            <span>·</span>
            <span><strong className="text-white">A / D or ← →</strong> Steer & Drift</span>
            <span>·</span>
            <span>Hit <strong className="text-amber-400">Boost Pads</strong></span>
          </div>

          <button
            onClick={startRace}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            START TIME TRIAL
          </button>
        </div>
      )}

      {/* Finished Lap screen */}
      {gameState === 'FINISHED' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <Trophy className="w-14 h-14 text-amber-400 mb-2 animate-bounce" />
          <h2 className="text-4xl font-black text-white mb-2">LAP FINISHED!</h2>
          <p className="text-3xl font-mono font-bold text-cyan-400 mb-6">{currentLapTime}</p>
          <button
            onClick={startRace}
            className="flex items-center gap-2 px-7 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            BEAT TIME
          </button>
        </div>
      )}
    </div>
  );
};
