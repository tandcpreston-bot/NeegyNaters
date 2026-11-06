import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { RotateCcw, Trophy, ArrowRight, Play } from 'lucide-react';

interface DriveMadGameProps {
  isMuted: boolean;
  embedUrl?: string;
}

export const DriveMadGame: React.FC<DriveMadGameProps> = ({ embedUrl }) => {
  const [useEmbed, setUseEmbed] = useState<boolean>(true);
  const [embedError, setEmbedError] = useState(false);

  // In-engine state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState<'PLAYING' | 'CRASHED' | 'WIN'>('PLAYING');

  const engineRef = useRef({
    truck: {
      x: 100,
      y: 280,
      vx: 0,
      vy: 0,
      angle: 0,
      vAngle: 0,
      wheelSpeed: 0,
      grounded: false,
    },
    keys: { forward: false, backward: false },
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number }[],
    flagX: 720,
  });

  const resetTruck = () => {
    engineRef.current.truck = {
      x: 90,
      y: 280,
      vx: 0,
      vy: 0,
      angle: 0,
      vAngle: 0,
      wheelSpeed: 0,
      grounded: false,
    };
    engineRef.current.particles = [];
    setStatus('PLAYING');
  };

  useEffect(() => {
    if (useEmbed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowRight', 'KeyD', 'ArrowUp', 'KeyW'].includes(e.code)) {
        engineRef.current.keys.forward = true;
      }
      if (['ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS'].includes(e.code)) {
        engineRef.current.keys.backward = true;
      }
      if (e.code === 'KeyR') {
        resetTruck();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowRight', 'KeyD', 'ArrowUp', 'KeyW'].includes(e.code)) {
        engineRef.current.keys.forward = false;
      }
      if (['ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS'].includes(e.code)) {
        engineRef.current.keys.backward = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [useEmbed]);

  // Built-in physics loop for Drive Mad
  useEffect(() => {
    if (useEmbed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const getTerrainHeight = (x: number, currentLevel: number) => {
      const baseY = 360;
      if (currentLevel === 1) {
        // Flat start, small wooden bump, ramp to flag
        if (x < 180) return baseY;
        if (x < 300) return baseY - Math.sin(((x - 180) / 120) * Math.PI) * 35;
        if (x < 420) return baseY;
        if (x < 560) return baseY - 40 - Math.sin(((x - 420) / 140) * Math.PI) * 50;
        return baseY - 20;
      } else if (currentLevel === 2) {
        // Bridge over water gap
        if (x < 150) return baseY;
        if (x > 260 && x < 480) {
          // Suspension wooden planks bridge with dip
          return baseY + 20 + Math.sin(((x - 260) / 220) * Math.PI) * 30;
        }
        if (x >= 480) return baseY - 10;
        return 999; // Water gap
      } else {
        // High steep stunt jumps
        return baseY - Math.sin(x * 0.015) * 60;
      }
    };

    const loop = () => {
      const state = engineRef.current;
      const t = state.truck;
      const width = canvas.width;
      const height = canvas.height;

      if (status === 'PLAYING') {
        // Truck input
        const accel = 0.5;
        if (state.keys.forward) {
          t.vx += accel;
          t.vAngle += 0.015;
          t.wheelSpeed += 0.5;
        } else if (state.keys.backward) {
          t.vx -= accel * 0.8;
          t.vAngle -= 0.015;
          t.wheelSpeed -= 0.4;
        }

        // Gravity & Damping
        t.vy += 0.45;
        t.vx *= 0.96;
        t.vAngle *= 0.92;

        t.x += t.vx;
        t.y += t.vy;
        t.angle += t.vAngle;

        // Ground collision at wheels
        const wheelRadius = 16;
        const wheelDist = 28;
        const frontWheelX = t.x + Math.cos(t.angle) * wheelDist;
        const frontWheelY = t.y + Math.sin(t.angle) * wheelDist + 12;
        const backWheelX = t.x - Math.cos(t.angle) * wheelDist;
        const backWheelY = t.y - Math.sin(t.angle) * wheelDist + 12;

        const frontGroundY = getTerrainHeight(frontWheelX, level);
        const backGroundY = getTerrainHeight(backWheelX, level);

        // Water check
        if (frontGroundY > 500 || backGroundY > 500) {
          if (t.y > 440) {
            sound.playExplosion();
            setStatus('CRASHED');
          }
        }

        if (frontWheelY + wheelRadius > frontGroundY) {
          t.y = frontGroundY - wheelRadius - 12;
          t.vy = Math.min(0, t.vy * -0.2);
          t.grounded = true;
        }

        if (backWheelY + wheelRadius > backGroundY) {
          t.y = backGroundY - wheelRadius - 12;
          t.vy = Math.min(0, t.vy * -0.2);
          t.grounded = true;
        }

        // Calculate ground slope
        const dx = frontWheelX - backWheelX;
        const dy = frontGroundY - backGroundY;
        const targetAngle = Math.atan2(dy, dx);
        if (t.grounded) {
          t.angle += (targetAngle - t.angle) * 0.2;
        }

        // Check flip (crashed upside down)
        const normalizedAngle = Math.abs((t.angle % (Math.PI * 2)));
        if (t.grounded && (normalizedAngle > 1.8 && normalizedAngle < 4.5)) {
          sound.playExplosion();
          setStatus('CRASHED');
        }

        // Check victory
        if (t.x >= state.flagX) {
          sound.playCoin();
          setStatus('WIN');
        }
      }

      // Draw Viewport
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, width, height);

      // Clouds & Sun
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(680, 90, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(140, 110, 40, 0, Math.PI * 2);
      ctx.arc(180, 100, 50, 0, Math.PI * 2);
      ctx.arc(220, 110, 40, 0, Math.PI * 2);
      ctx.fill();

      // Terrain / Wooden Bridges / Hills
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 10) {
        const y = getTerrainHeight(x, level);
        ctx.lineTo(x, Math.min(height, y));
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Dirt underneath
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 420, width, height - 420);

      // Water at bottom
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 470, width, height - 470);

      // Finish Line / Checkered Flag
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(state.flagX, getTerrainHeight(state.flagX, level) - 80, 6, 80);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(state.flagX + 6, getTerrainHeight(state.flagX, level) - 80);
      ctx.lineTo(state.flagX + 42, getTerrainHeight(state.flagX, level) - 62);
      ctx.lineTo(state.flagX + 6, getTerrainHeight(state.flagX, level) - 44);
      ctx.fill();

      // Draw Voxel Truck
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);

      // Monster Truck Body
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-34, -20, 68, 22);

      // Cabin
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-18, -36, 36, 18);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(-12, -32, 24, 12);

      // Engine block
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(18, -26, 14, 12);

      // Wheels
      const drawWheel = (wx: number, wy: number) => {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawWheel(-24, 14);
      drawWheel(24, 14);
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [useEmbed, level, status]);

  const defaultEmbed = embedUrl || 'https://raw.githack.com/3kh0/3kh0-assets/main/drive-mad/index.html';

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 font-display select-none">
      {useEmbed && !embedError ? (
        <div className="relative w-full h-full flex flex-col">
          <iframe
            src={defaultEmbed}
            title="Drive Mad"
            className="w-full h-full border-0 rounded-lg shadow-2xl bg-black"
            allow="fullscreen; gamepad; accelerometer; gyroscope"
            onError={() => {
              setEmbedError(true);
              setUseEmbed(false);
            }}
          />
          {/* Engine Mode Switcher Bar */}
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <span className="text-slate-400">Embed Mode</span>
            <button
              onClick={() => setUseEmbed(false)}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline cursor-pointer"
            >
              Switch to Native Canvas
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={520}
            className="w-full h-full max-h-[520px] object-contain rounded-lg border border-slate-800 shadow-2xl bg-sky-600"
          />

          <div className="absolute top-4 left-4 flex items-center gap-4 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-medium block">Level</span>
              <span className="text-xl font-bold font-mono text-amber-400">{level} / 3</span>
            </div>
            <button
              onClick={() => setUseEmbed(true)}
              className="text-xs text-cyan-400 hover:underline cursor-pointer"
            >
              Try Web Embed
            </button>
          </div>

          {status === 'CRASHED' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="text-rose-500 font-bold text-sm tracking-widest uppercase mb-1">TRUCK CRASHED!</div>
              <h3 className="text-3xl font-black text-white mb-4">DRIVE MAD</h3>
              <button
                onClick={resetTruck}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-105"
              >
                <RotateCcw className="w-5 h-5" />
                RETRY LEVEL
              </button>
            </div>
          )}

          {status === 'WIN' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
              <h3 className="text-3xl font-black text-white mb-2">LEVEL {level} COMPLETE!</h3>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setLevel((prev) => (prev % 3) + 1);
                    resetTruck();
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-105"
                >
                  <ArrowRight className="w-5 h-5" />
                  NEXT LEVEL
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
