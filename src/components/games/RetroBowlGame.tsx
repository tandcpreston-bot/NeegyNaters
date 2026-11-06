import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { RotateCcw, Trophy, Play } from 'lucide-react';

interface RetroBowlGameProps {
  isMuted: boolean;
  embedUrl?: string;
}

export const RetroBowlGame: React.FC<RetroBowlGameProps> = ({ embedUrl }) => {
  const [useEmbed, setUseEmbed] = useState<boolean>(true);
  const [embedError, setEmbedError] = useState(false);

  // In-engine state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scoreHome, setScoreHome] = useState(14);
  const [scoreAway, setScoreAway] = useState(10);
  const [down, setDown] = useState(1);
  const [yardsToGo, setYardsToGo] = useState(10);
  const [yardLine, setYardLine] = useState(25);
  const [playState, setPlayState] = useState<'PRE_SNAP' | 'PLAYING' | 'TOUCHDOWN' | 'INTERCEPTED'>('PRE_SNAP');

  const engineRef = useRef({
    qb: { x: 120, y: 260, hasBall: true },
    ball: { x: 120, y: 260, vx: 0, vy: 0, inAir: false, targetX: 0, targetY: 0 },
    receivers: [
      { x: 160, y: 140, vx: 3.5, vy: -0.5, hasBall: false, caught: false },
      { x: 160, y: 380, vx: 4.0, vy: 0.8, hasBall: false, caught: false },
    ],
    defenders: [
      { x: 340, y: 150, vx: 0, vy: 0 },
      { x: 380, y: 260, vx: 0, vy: 0 },
      { x: 340, y: 370, vx: 0, vy: 0 },
    ],
    aim: { active: false, x: 0, y: 0 },
  });

  const snapBall = () => {
    setPlayState('PLAYING');
    sound.playJump();
  };

  const resetPlay = (newYardLine = yardLine) => {
    engineRef.current = {
      qb: { x: 120, y: 260, hasBall: true },
      ball: { x: 120, y: 260, vx: 0, vy: 0, inAir: false, targetX: 0, targetY: 0 },
      receivers: [
        { x: 160, y: 140, vx: 3.5, vy: -0.4, hasBall: false, caught: false },
        { x: 160, y: 380, vx: 4.0, vy: 0.6, hasBall: false, caught: false },
      ],
      defenders: [
        { x: 340, y: 150, vx: 0, vy: 0 },
        { x: 380, y: 260, vx: 0, vy: 0 },
        { x: 340, y: 370, vx: 0, vy: 0 },
      ],
      aim: { active: false, x: 0, y: 0 },
    };
    setYardLine(newYardLine);
    setPlayState('PRE_SNAP');
  };

  useEffect(() => {
    if (useEmbed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (playState !== 'PLAYING') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      engineRef.current.aim.active = true;
      engineRef.current.aim.x = (e.clientX - rect.left) * scaleX;
      engineRef.current.aim.y = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!engineRef.current.aim.active) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      engineRef.current.aim.x = (e.clientX - rect.left) * scaleX;
      engineRef.current.aim.y = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseUp = () => {
      const state = engineRef.current;
      if (state.aim.active && state.qb.hasBall) {
        // Throw ball towards aim
        sound.playLaser();
        state.qb.hasBall = false;
        state.ball.inAir = true;
        const dx = state.aim.x - state.qb.x;
        const dy = state.aim.y - state.qb.y;
        const dist = Math.hypot(dx, dy);
        const speed = 8.5;
        state.ball.vx = (dx / dist) * speed;
        state.ball.vy = (dy / dist) * speed;
        state.ball.targetX = state.aim.x;
        state.ball.targetY = state.aim.y;
      }
      state.aim.active = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [useEmbed, playState]);

  // Native game loop
  useEffect(() => {
    if (useEmbed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const state = engineRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Update positions
      if (playState === 'PLAYING') {
        // Receivers running
        for (const rec of state.receivers) {
          rec.x += rec.vx;
          rec.y += rec.vy;
          if (rec.y < 60 || rec.y > height - 60) rec.vy = -rec.vy;
        }

        // Defenders tracking ball or nearest receiver
        for (const def of state.defenders) {
          let target = state.receivers[0];
          let minDist = 9999;
          for (const r of state.receivers) {
            const d = Math.hypot(r.x - def.x, r.y - def.y);
            if (d < minDist) {
              minDist = d;
              target = r;
            }
          }

          if (state.ball.inAir) {
            def.vx = (state.ball.x - def.x) * 0.04;
            def.vy = (state.ball.y - def.y) * 0.04;
          } else {
            def.vx = (target.x - def.x) * 0.035;
            def.vy = (target.y - def.y) * 0.035;
          }

          def.x += def.vx;
          def.y += def.vy;
        }

        // Ball physics
        if (state.ball.inAir) {
          state.ball.x += state.ball.vx;
          state.ball.y += state.ball.vy;

          // Check receiver catch
          for (const rec of state.receivers) {
            if (Math.hypot(rec.x - state.ball.x, rec.y - state.ball.y) < 26) {
              state.ball.inAir = false;
              rec.hasBall = true;
              rec.caught = true;
              sound.playJump();
              break;
            }
          }

          // Check defender interception
          for (const def of state.defenders) {
            if (Math.hypot(def.x - state.ball.x, def.y - state.ball.y) < 20) {
              state.ball.inAir = false;
              sound.playExplosion();
              setPlayState('INTERCEPTED');
              break;
            }
          }
        }

        // Check runner tackled or touchdown
        for (const rec of state.receivers) {
          if (rec.hasBall) {
            state.ball.x = rec.x;
            state.ball.y = rec.y;

            // Touchdown!
            if (rec.x > width - 70) {
              sound.playCoin();
              setPlayState('TOUCHDOWN');
              setScoreHome((prev) => prev + 7);
              break;
            }

            // Tackled?
            for (const def of state.defenders) {
              if (Math.hypot(def.x - rec.x, def.y - rec.y) < 24) {
                sound.playExplosion();
                const gainedYards = Math.round((rec.x - 120) / 10);
                if (gainedYards >= yardsToGo) {
                  setDown(1);
                  setYardsToGo(10);
                } else {
                  setDown((prev) => Math.min(4, prev + 1));
                  setYardsToGo((prev) => Math.max(1, prev - gainedYards));
                }
                resetPlay(Math.min(95, yardLine + gainedYards));
                break;
              }
            }
          }
        }
      }

      // Render 8-Bit Retro Gridiron Stadium
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 0, width, height);

      // Yard lines
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      for (let x = 60; x < width - 60; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${((x / 60) * 10) % 50}`, x, 40);
        ctx.fillText(`${((x / 60) * 10) % 50}`, x, height - 30);
      }

      // Endzones
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 0, 60, height);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(width - 60, 0, 60, height);

      // Line of scrimmage & First down marker
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(120, 0);
      ctx.lineTo(120, height);
      ctx.stroke();

      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(120 + yardsToGo * 10, 0);
      ctx.lineTo(120 + yardsToGo * 10, height);
      ctx.stroke();

      // Aiming trajectory line
      if (state.aim.active && state.qb.hasBall) {
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(state.qb.x, state.qb.y);
        ctx.lineTo(state.aim.x, state.aim.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target reticle
        ctx.strokeStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(state.aim.x, state.aim.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw QB
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(state.qb.x, state.qb.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QB', state.qb.x, state.qb.y);

      // Draw Receivers (Blue)
      for (const rec of state.receivers) {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(rec.x, rec.y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('WR', rec.x, rec.y);
      }

      // Draw Defenders (Red)
      for (const def of state.defenders) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(def.x, def.y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('CB', def.x, def.y);
      }

      // Draw Football
      if (state.ball.inAir || !state.qb.hasBall) {
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(state.ball.x, state.ball.y, 9, 6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (state.qb.hasBall) {
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(state.qb.x + 10, state.qb.y - 6, 8, 5, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [useEmbed, playState, yardLine, yardsToGo]);

  const defaultEmbed = embedUrl || 'https://raw.githack.com/3kh0/3kh0-assets/main/retro-bowl/index.html';

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 font-display select-none">
      {useEmbed && !embedError ? (
        <div className="relative w-full h-full flex flex-col">
          <iframe
            src={defaultEmbed}
            title="Retro Bowl"
            className="w-full h-full border-0 rounded-lg shadow-2xl bg-black"
            allow="fullscreen; gamepad"
            onError={() => {
              setEmbedError(true);
              setUseEmbed(false);
            }}
          />
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
            className="w-full h-full max-h-[520px] object-contain rounded-lg border border-slate-800 shadow-2xl bg-emerald-800"
          />

          {/* Retro Scoreboard HUD */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none px-4">
            <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl px-5 py-2 flex items-center gap-6 shadow-xl">
              <div className="text-center">
                <span className="text-[10px] text-blue-400 font-bold block uppercase">RETRO CATS</span>
                <span className="text-2xl font-bold font-mono text-white tabular-nums">{scoreHome}</span>
              </div>
              <span className="text-xs text-slate-500 font-bold">VS</span>
              <div className="text-center">
                <span className="text-[10px] text-red-400 font-bold block uppercase">GRID DAWGS</span>
                <span className="text-2xl font-bold font-mono text-white tabular-nums">{scoreAway}</span>
              </div>
            </div>

            <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">DOWN</span>
                <span className="text-lg font-bold font-mono text-amber-400">{down} & {yardsToGo}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">BALL ON</span>
                <span className="text-lg font-bold font-mono text-cyan-400">{yardLine} YD</span>
              </div>
            </div>
          </div>

          {playState === 'PRE_SNAP' && (
            <div className="absolute bottom-6 flex gap-3">
              <button
                onClick={snapBall}
                className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-105"
              >
                <Play className="w-5 h-5 fill-current" />
                HIKE BALL / SNAP
              </button>
            </div>
          )}

          {playState === 'TOUCHDOWN' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <Trophy className="w-14 h-14 text-amber-400 mb-2 animate-bounce" />
              <h2 className="text-4xl font-black text-white mb-2">TOUCHDOWN!</h2>
              <p className="text-emerald-400 font-semibold mb-6">+7 POINTS ON THE BOARD</p>
              <button
                onClick={() => resetPlay(25)}
                className="px-7 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg cursor-pointer"
              >
                NEXT DRIVE
              </button>
            </div>
          )}

          {playState === 'INTERCEPTED' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="text-rose-500 font-bold text-sm tracking-widest uppercase mb-1">TURNOVER</div>
              <h2 className="text-4xl font-black text-white mb-4">INTERCEPTED!</h2>
              <button
                onClick={() => resetPlay(25)}
                className="flex items-center gap-2 px-7 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                TRY NEXT DRIVE
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
