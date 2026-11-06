import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { Play, RotateCcw, Zap } from 'lucide-react';

interface NeonDriftGameProps {
  isMuted: boolean;
}

export const NeonDriftGame: React.FC<NeonDriftGameProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('neon_drift_highscore') || '0', 10);
  });
  const [nitro, setNitro] = useState(100);

  const gameLoopRef = useRef<number | null>(null);
  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean; space: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
    space: false,
  });

  const stateRef = useRef({
    carX: 0,
    carSpeed: 5,
    maxSpeed: 14,
    nitroSpeed: 20,
    distance: 0,
    score: 0,
    nitro: 100,
    isBoosting: false,
    obstacles: [] as { x: number; y: number; width: number; height: number; speed: number; color: string; type: 'car' | 'coin' }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number }[],
    roadOffset: 0,
    gameOver: false,
  });

  const startGame = () => {
    stateRef.current = {
      carX: 0,
      carSpeed: 6,
      maxSpeed: 13,
      nitroSpeed: 19,
      distance: 0,
      score: 0,
      nitro: 100,
      isBoosting: false,
      obstacles: [],
      particles: [],
      roadOffset: 0,
      gameOver: false,
    };
    setScore(0);
    setNitro(100);
    setGameState('PLAYING');
    sound.playJump();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        keysRef.current.left = true;
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        keysRef.current.right = true;
      }
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        keysRef.current.up = true;
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        keysRef.current.down = true;
      }
      if (['Space', 'ShiftLeft'].includes(e.code)) {
        keysRef.current.space = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        keysRef.current.left = false;
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        keysRef.current.right = false;
      }
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        keysRef.current.up = false;
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        keysRef.current.down = false;
      }
      if (['Space', 'ShiftLeft'].includes(e.code)) {
        keysRef.current.space = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastSpawn = 0;

    const updateAndDraw = (time: number) => {
      const state = stateRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Handle Nitro and Speed
      const isBoosting = keysRef.current.space && state.nitro > 0;
      state.isBoosting = isBoosting;

      let targetSpeed = 7;
      if (isBoosting) {
        targetSpeed = state.nitroSpeed;
        state.nitro = Math.max(0, state.nitro - 0.4);
      } else {
        targetSpeed = keysRef.current.up ? state.maxSpeed : (keysRef.current.down ? 4 : 7);
        state.nitro = Math.min(100, state.nitro + 0.08);
      }
      setNitro(Math.round(state.nitro));

      state.carSpeed += (targetSpeed - state.carSpeed) * 0.1;
      state.distance += state.carSpeed;
      state.score += Math.round(state.carSpeed * 0.15);
      setScore(state.score);

      // Steering
      const steerSpeed = 6.5;
      if (keysRef.current.left) {
        state.carX -= steerSpeed;
      }
      if (keysRef.current.right) {
        state.carX += steerSpeed;
      }

      // Constrain car to road boundaries
      const roadHalfWidth = width * 0.35;
      state.carX = Math.max(-roadHalfWidth + 30, Math.min(roadHalfWidth - 30, state.carX));

      // Spawning obstacles / coins
      if (time - lastSpawn > Math.max(500, 1400 - state.score * 0.1)) {
        lastSpawn = time;
        const isCoin = Math.random() < 0.35;
        const spawnX = (Math.random() - 0.5) * (roadHalfWidth * 1.7);
        state.obstacles.push({
          x: spawnX,
          y: -80,
          width: isCoin ? 24 : 44,
          height: isCoin ? 24 : 74,
          speed: isCoin ? 0 : 2 + Math.random() * 2,
          color: isCoin ? '#fbbf24' : ['#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 4)],
          type: isCoin ? 'coin' : 'car',
        });
      }

      // Road background drawing
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Horizon grid & synthwave sun
      const horizonY = height * 0.38;
      const gradient = ctx.createLinearGradient(0, 0, 0, horizonY);
      gradient.addColorStop(0, '#1e1035');
      gradient.addColorStop(1, '#090d16');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, horizonY);

      // Sun
      ctx.beginPath();
      ctx.arc(width / 2, horizonY, 65, Math.PI, 0, false);
      const sunGrad = ctx.createLinearGradient(width / 2, horizonY - 65, width / 2, horizonY);
      sunGrad.addColorStop(0, '#f43f5e');
      sunGrad.addColorStop(0.6, '#fbbf24');
      sunGrad.addColorStop(1, '#fb7185');
      ctx.fillStyle = sunGrad;
      ctx.fill();

      // Road geometry
      state.roadOffset = (state.roadOffset + state.carSpeed) % 40;

      ctx.beginPath();
      ctx.moveTo(width / 2 - 80, horizonY);
      ctx.lineTo(width / 2 + 80, horizonY);
      ctx.lineTo(width / 2 + roadHalfWidth + 40, height);
      ctx.lineTo(width / 2 - roadHalfWidth - 40, height);
      ctx.closePath();
      ctx.fillStyle = '#111827';
      ctx.fill();

      // Road borders with neon glow
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 80, horizonY);
      ctx.lineTo(width / 2 - roadHalfWidth - 40, height);
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(width / 2 + 80, horizonY);
      ctx.lineTo(width / 2 + roadHalfWidth + 40, height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dashed lane lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      for (let y = horizonY + (state.roadOffset % 30); y < height; y += 45) {
        const factor = (y - horizonY) / (height - horizonY);
        const w = 4 + factor * 6;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 2, y);
        ctx.lineTo(width / 2 - 2, y + w * 2);
        ctx.stroke();
      }

      // Update & Draw Obstacles
      const playerCarY = height - 110;
      const playerCarW = 46;
      const playerCarH = 78;
      const playerCarLeft = width / 2 + state.carX - playerCarW / 2;
      const playerCarRight = playerCarLeft + playerCarW;
      const playerCarTop = playerCarY;
      const playerCarBottom = playerCarY + playerCarH;

      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        obs.y += state.carSpeed - obs.speed;

        // Perspective scale based on Y
        const screenY = obs.y;
        if (screenY > height + 100) {
          state.obstacles.splice(i, 1);
          continue;
        }

        const renderX = width / 2 + obs.x;

        // Collision Check
        const collides =
          renderX - obs.width / 2 < playerCarRight &&
          renderX + obs.width / 2 > playerCarLeft &&
          screenY < playerCarBottom &&
          screenY + obs.height > playerCarTop;

        if (collides) {
          if (obs.type === 'coin') {
            sound.playCoin();
            state.score += 250;
            state.nitro = Math.min(100, state.nitro + 25);
            // Spawn gold sparkles
            for (let p = 0; p < 8; p++) {
              state.particles.push({
                x: renderX,
                y: screenY,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#fbbf24',
                life: 1,
              });
            }
            state.obstacles.splice(i, 1);
            continue;
          } else {
            // Crash!
            sound.playExplosion();
            for (let p = 0; p < 25; p++) {
              state.particles.push({
                x: renderX,
                y: screenY,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                color: ['#f43f5e', '#fbbf24', '#ffffff', '#38bdf8'][Math.floor(Math.random() * 4)],
                life: 1,
              });
            }
            state.gameOver = true;
            setGameState('GAMEOVER');
            setHighScore((prev) => {
              const newHigh = Math.max(prev, state.score);
              localStorage.setItem('neon_drift_highscore', newHigh.toString());
              return newHigh;
            });
            return;
          }
        }

        // Draw item
        if (obs.type === 'coin') {
          ctx.save();
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(renderX, screenY + 12, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', renderX, screenY + 12);
          ctx.restore();
        } else {
          // Rival Car
          ctx.save();
          ctx.fillStyle = obs.color;
          ctx.shadowColor = obs.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(renderX - obs.width / 2, screenY, obs.width, obs.height, 6);
          ctx.fill();
          // Roof / windshield
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(renderX - obs.width / 2 + 6, screenY + 14, obs.width - 12, obs.height - 30);
          // Taillights
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(renderX - obs.width / 2 + 4, screenY + obs.height - 4, 8, 4);
          ctx.fillRect(renderX + obs.width / 2 - 12, screenY + obs.height - 4, 8, 4);
          ctx.restore();
        }
      }

      // Draw Player Car
      ctx.save();
      const carCenterX = width / 2 + state.carX;
      // Nitro flames
      if (state.isBoosting) {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(carCenterX - 14, playerCarBottom);
        ctx.lineTo(carCenterX - 8, playerCarBottom + 25 + Math.random() * 15);
        ctx.lineTo(carCenterX - 2, playerCarBottom);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(carCenterX + 2, playerCarBottom);
        ctx.lineTo(carCenterX + 8, playerCarBottom + 25 + Math.random() * 15);
        ctx.lineTo(carCenterX + 14, playerCarBottom);
        ctx.fill();
      }

      // Car body
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isBoosting ? 20 : 10;
      ctx.beginPath();
      ctx.roundRect(playerCarLeft, playerCarTop, playerCarW, playerCarH, 8);
      ctx.fill();

      // Cyber racing stripes & windshield
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(playerCarLeft + 10, playerCarTop + 4, playerCarW - 20, playerCarH - 8);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(playerCarLeft + 8, playerCarTop + 18, playerCarW - 16, 22);

      // Headlights glow
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(playerCarLeft + 4, playerCarTop + 2, 8, 6);
      ctx.fillRect(playerCarRight - 12, playerCarTop + 2, 8, 6);

      // Tail lights
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(playerCarLeft + 4, playerCarBottom - 6, 9, 4);
      ctx.fillRect(playerCarRight - 13, playerCarBottom - 6, 9, 4);
      ctx.restore();

      // Particles
      for (let p = state.particles.length - 1; p >= 0; p--) {
        const pt = state.particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 0.03;
        if (pt.life <= 0) {
          state.particles.splice(p, 1);
          continue;
        }
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      gameLoopRef.current = requestAnimationFrame(updateAndDraw);
    };

    gameLoopRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 select-none overflow-hidden font-display">
      <canvas
        ref={canvasRef}
        width={800}
        height={560}
        className="w-full h-full max-h-[560px] object-contain rounded-lg border border-slate-800 shadow-2xl bg-slate-900"
      />

      {/* Top HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none px-4">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2 flex items-center gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">Score</span>
              <span className="text-xl font-bold font-mono text-cyan-400 tabular-nums">{score}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">Best</span>
              <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">{highScore}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2 flex items-center gap-3">
            <Zap className={`w-4 h-4 ${nitro > 20 ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <div className="w-28 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-rose-500 transition-all duration-75"
                style={{ width: `${nitro}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-300 w-8">{nitro}%</span>
          </div>
        </div>
      )}

      {/* Start Overlay */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium mb-3">
            HIGH-SPEED RETRO DRIFT
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">
            NEON DRIFT: VELOCITY
          </h2>
          <p className="text-slate-300 text-sm max-w-md mb-6">
            Dodge cyberpunk traffic, collect gold energy coins, and burn nitro down the futuristic twilight highway!
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-8 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <span><strong className="text-white">A / D</strong> or <strong className="text-white">← →</strong> to Steer</span>
            <span>·</span>
            <span><strong className="text-white">Space</strong> for Nitro Boost</span>
            <span>·</span>
            <span><strong className="text-white">W / S</strong> Speed</span>
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            START RACING
          </button>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="text-rose-500 font-bold text-sm tracking-widest uppercase mb-1">Crash Collision!</div>
          <h2 className="text-4xl font-black text-white mb-4">GAME OVER</h2>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 w-full max-w-xs shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">Final Score</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">{score}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-slate-400 text-sm">Best Record</span>
              <span className="text-xl font-bold font-mono text-amber-400">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base rounded-xl shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
