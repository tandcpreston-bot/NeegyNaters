import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { Play, RotateCcw, Shield, Sparkles } from 'lucide-react';

interface NebulaStrikeGameProps {
  isMuted: boolean;
}

export const NebulaStrikeGame: React.FC<NebulaStrikeGameProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('nebula_strike_highscore') || '0', 10);
  });
  const [lives, setLives] = useState(3);
  const [shieldActive, setShieldActive] = useState(false);

  const gameLoopRef = useRef<number | null>(null);

  const stateRef = useRef({
    player: {
      x: 400,
      y: 500,
      width: 44,
      height: 48,
      speed: 7,
      shield: false,
      shieldTimer: 0,
      weaponLevel: 1,
      weaponTimer: 0,
    },
    lasers: [] as { x: number; y: number; vx: number; vy: number; color: string; isEnemy: boolean }[],
    enemies: [] as {
      x: number;
      y: number;
      width: number;
      height: number;
      hp: number;
      maxHp: number;
      vx: number;
      vy: number;
      type: 'scout' | 'interceptor' | 'boss';
      color: string;
      shootCooldown: number;
    }[],
    powerups: [] as { x: number; y: number; type: 'triple' | 'shield' | 'life'; vy: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number; size: number }[],
    stars: [] as { x: number; y: number; speed: number; size: number; alpha: number }[],
    keys: { left: false, right: false, up: false, down: false, fire: false },
    mouse: { x: 400, y: 500, active: false },
    score: 0,
    lives: 3,
    lastFire: 0,
    lastSpawn: 0,
  });

  const startGame = () => {
    const stars = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * 800,
        y: Math.random() * 560,
        speed: 0.5 + Math.random() * 2,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.8 + 0.2,
      });
    }

    stateRef.current = {
      player: {
        x: 400,
        y: 480,
        width: 44,
        height: 48,
        speed: 7,
        shield: true,
        shieldTimer: 180, // initial grace period
        weaponLevel: 1,
        weaponTimer: 0,
      },
      lasers: [],
      enemies: [],
      powerups: [],
      particles: [],
      stars,
      keys: { left: false, right: false, up: false, down: false, fire: false },
      mouse: { x: 400, y: 480, active: false },
      score: 0,
      lives: 3,
      lastFire: 0,
      lastSpawn: 0,
    };
    setScore(0);
    setLives(3);
    setShieldActive(true);
    setGameState('PLAYING');
    sound.playPowerup();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { keys } = stateRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keys.down = true;
      if (['Space', 'KeyJ'].includes(e.code)) keys.fire = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const { keys } = stateRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keys.down = false;
      if (['Space', 'KeyJ'].includes(e.code)) keys.fire = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mouse.x = (e.clientX - rect.left) * scaleX;
      stateRef.current.mouse.y = (e.clientY - rect.top) * scaleY;
      stateRef.current.mouse.active = true;
    };

    const handleMouseDown = () => {
      stateRef.current.keys.fire = true;
    };

    const handleMouseUp = () => {
      stateRef.current.keys.fire = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateAndDraw = (time: number) => {
      const state = stateRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const p = state.player;

      // Update Stars Background
      for (const star of state.stars) {
        star.y += star.speed;
        if (star.y > height) {
          star.y = 0;
          star.x = Math.random() * width;
        }
      }

      // Update Player position
      if (state.mouse.active) {
        p.x += (state.mouse.x - p.x) * 0.15;
        p.y += (state.mouse.y - p.y) * 0.15;
      } else {
        if (state.keys.left) p.x -= p.speed;
        if (state.keys.right) p.x += p.speed;
        if (state.keys.up) p.y -= p.speed;
        if (state.keys.down) p.y += p.speed;
      }

      // Keep within bounds
      p.x = Math.max(30, Math.min(width - 30, p.x));
      p.y = Math.max(50, Math.min(height - 40, p.y));

      // Weapon and Shield timers
      if (p.shieldTimer > 0) {
        p.shieldTimer--;
        p.shield = true;
        setShieldActive(true);
      } else {
        p.shield = false;
        setShieldActive(false);
      }

      if (p.weaponTimer > 0) {
        p.weaponTimer--;
      } else {
        p.weaponLevel = 1;
      }

      // Auto firing or Space firing
      const fireInterval = p.weaponLevel > 1 ? 140 : 190;
      if (time - state.lastFire > fireInterval) {
        state.lastFire = time;
        sound.playLaser();

        if (p.weaponLevel === 1) {
          state.lasers.push({ x: p.x, y: p.y - 20, vx: 0, vy: -12, color: '#38bdf8', isEnemy: false });
        } else if (p.weaponLevel === 2) {
          state.lasers.push({ x: p.x - 12, y: p.y - 18, vx: 0, vy: -12, color: '#38bdf8', isEnemy: false });
          state.lasers.push({ x: p.x + 12, y: p.y - 18, vx: 0, vy: -12, color: '#38bdf8', isEnemy: false });
        } else {
          state.lasers.push({ x: p.x, y: p.y - 20, vx: 0, vy: -12, color: '#a855f7', isEnemy: false });
          state.lasers.push({ x: p.x - 14, y: p.y - 16, vx: -2.5, vy: -11, color: '#a855f7', isEnemy: false });
          state.lasers.push({ x: p.x + 14, y: p.y - 16, vx: 2.5, vy: -11, color: '#a855f7', isEnemy: false });
        }
      }

      // Spawn Enemies
      if (time - state.lastSpawn > Math.max(700, 1500 - state.score * 0.08)) {
        state.lastSpawn = time;
        const isBoss = state.score > 0 && state.score % 2000 < 100 && !state.enemies.some(e => e.type === 'boss');
        if (isBoss) {
          state.enemies.push({
            x: width / 2,
            y: -80,
            width: 90,
            height: 60,
            hp: 20,
            maxHp: 20,
            vx: 1.8,
            vy: 1.2,
            type: 'boss',
            color: '#dc2626',
            shootCooldown: 0,
          });
        } else {
          const type = Math.random() < 0.35 ? 'interceptor' : 'scout';
          state.enemies.push({
            x: 60 + Math.random() * (width - 120),
            y: -50,
            width: type === 'interceptor' ? 44 : 32,
            height: type === 'interceptor' ? 38 : 28,
            hp: type === 'interceptor' ? 3 : 1,
            maxHp: type === 'interceptor' ? 3 : 1,
            vx: (Math.random() - 0.5) * 2.5,
            vy: 2 + Math.random() * 2,
            type,
            color: type === 'interceptor' ? '#f43f5e' : '#fb923c',
            shootCooldown: Math.random() * 80,
          });
        }
      }

      // Update Lasers
      for (let i = state.lasers.length - 1; i >= 0; i--) {
        const l = state.lasers[i];
        l.x += l.vx;
        l.y += l.vy;

        if (l.y < -20 || l.y > height + 20 || l.x < -20 || l.x > width + 20) {
          state.lasers.splice(i, 1);
          continue;
        }

        // Check player hit by enemy laser
        if (l.isEnemy) {
          const dist = Math.hypot(l.x - p.x, l.y - p.y);
          if (dist < 26) {
            state.lasers.splice(i, 1);
            if (p.shield) {
              sound.playJump();
            } else {
              sound.playExplosion();
              state.lives--;
              setLives(state.lives);
              p.shield = true;
              p.shieldTimer = 120;
              setShieldActive(true);
              if (state.lives <= 0) {
                setGameState('GAMEOVER');
                setHighScore(prev => {
                  const newHigh = Math.max(prev, state.score);
                  localStorage.setItem('nebula_strike_highscore', newHigh.toString());
                  return newHigh;
                });
                return;
              }
            }
          }
        }
      }

      // Update Enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        e.x += e.vx;
        e.y += e.vy;

        if (e.x < 40 || e.x > width - 40) e.vx = -e.vx;

        // Enemy shooting
        e.shootCooldown++;
        if (e.type === 'boss' && e.shootCooldown % 40 === 0) {
          state.lasers.push({ x: e.x - 20, y: e.y + 30, vx: -1.5, vy: 5, color: '#f43f5e', isEnemy: true });
          state.lasers.push({ x: e.x + 20, y: e.y + 30, vx: 1.5, vy: 5, color: '#f43f5e', isEnemy: true });
        } else if (e.type === 'interceptor' && e.shootCooldown > 90) {
          e.shootCooldown = 0;
          state.lasers.push({ x: e.x, y: e.y + 20, vx: 0, vy: 6, color: '#fb923c', isEnemy: true });
        }

        // Check if enemy hit by player lasers
        for (let j = state.lasers.length - 1; j >= 0; j--) {
          const l = state.lasers[j];
          if (l.isEnemy) continue;

          if (
            l.x > e.x - e.width / 2 &&
            l.x < e.x + e.width / 2 &&
            l.y > e.y - e.height / 2 &&
            l.y < e.y + e.height / 2
          ) {
            state.lasers.splice(j, 1);
            e.hp--;

            // Sparks
            for (let sp = 0; sp < 4; sp++) {
              state.particles.push({
                x: l.x,
                y: l.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#38bdf8',
                life: 0.6,
                size: 2,
              });
            }

            if (e.hp <= 0) {
              sound.playExplosion();
              const pts = e.type === 'boss' ? 1000 : (e.type === 'interceptor' ? 250 : 100);
              state.score += pts;
              setScore(state.score);

              // Chance for powerup
              if (Math.random() < 0.28 || e.type === 'boss') {
                const types: ('triple' | 'shield' | 'life')[] = ['triple', 'shield', 'life'];
                state.powerups.push({
                  x: e.x,
                  y: e.y,
                  type: types[Math.floor(Math.random() * types.length)],
                  vy: 2.2,
                });
              }

              // Big explosion
              for (let sp = 0; sp < (e.type === 'boss' ? 40 : 18); sp++) {
                state.particles.push({
                  x: e.x,
                  y: e.y,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10,
                  color: ['#f43f5e', '#fbbf24', '#ffffff', '#38bdf8'][Math.floor(Math.random() * 4)],
                  life: 1,
                  size: 3 + Math.random() * 3,
                });
              }

              state.enemies.splice(i, 1);
              break;
            }
          }
        }

        // Collision with player
        const distToPlayer = Math.hypot(e.x - p.x, e.y - p.y);
        if (distToPlayer < 36) {
          state.enemies.splice(i, 1);
          if (p.shield) {
            sound.playJump();
          } else {
            sound.playExplosion();
            state.lives--;
            setLives(state.lives);
            p.shield = true;
            p.shieldTimer = 120;
            setShieldActive(true);
            if (state.lives <= 0) {
              setGameState('GAMEOVER');
              return;
            }
          }
        }

        if (e.y > height + 60) {
          state.enemies.splice(i, 1);
        }
      }

      // Update Powerups
      for (let i = state.powerups.length - 1; i >= 0; i--) {
        const pw = state.powerups[i];
        pw.y += pw.vy;

        if (Math.hypot(pw.x - p.x, pw.y - p.y) < 36) {
          sound.playPowerup();
          if (pw.type === 'triple') {
            p.weaponLevel = 3;
            p.weaponTimer = 500;
          } else if (pw.type === 'shield') {
            p.shield = true;
            p.shieldTimer = 400;
            setShieldActive(true);
          } else if (pw.type === 'life') {
            state.lives = Math.min(5, state.lives + 1);
            setLives(state.lives);
          }
          state.powerups.splice(i, 1);
          continue;
        }

        if (pw.y > height + 40) {
          state.powerups.splice(i, 1);
        }
      }

      // Render Everything
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, width, height);

      // Stars
      for (const star of state.stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Lasers
      for (const l of state.lasers) {
        ctx.fillStyle = l.color;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(l.x - 3, l.y - 8, 6, 16, 3);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw Powerups
      for (const pw of state.powerups) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = pw.type === 'life' ? '#10b981' : (pw.type === 'shield' ? '#38bdf8' : '#a855f7');
        ctx.fillStyle = ctx.shadowColor;
        ctx.beginPath();
        ctx.arc(pw.x, pw.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pw.type === 'life' ? '+1' : (pw.type === 'shield' ? 'S' : '3X'), pw.x, pw.y);
        ctx.restore();
      }

      // Draw Enemies
      for (const e of state.enemies) {
        ctx.save();
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = e.color;

        if (e.type === 'boss') {
          // Boss Mothership
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + 30);
          ctx.lineTo(e.x - 45, e.y - 20);
          ctx.lineTo(e.x, e.y - 30);
          ctx.lineTo(e.x + 45, e.y - 20);
          ctx.closePath();
          ctx.fill();

          // HP Bar for boss
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(e.x - 35, e.y - 45, 70, 7);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(e.x - 35, e.y - 45, (e.hp / e.maxHp) * 70, 7);
        } else {
          // Scout or interceptor
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + 16);
          ctx.lineTo(e.x - 16, e.y - 14);
          ctx.lineTo(e.x, e.y - 8);
          ctx.lineTo(e.x + 16, e.y - 14);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Player Ship
      ctx.save();
      // Shield Aura
      if (p.shield) {
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 32, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ship thruster flames
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(p.x - 8, p.y + 20);
      ctx.lineTo(p.x, p.y + 32 + Math.random() * 8);
      ctx.lineTo(p.x + 8, p.y + 20);
      ctx.fill();

      // Ship hull
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 24);
      ctx.lineTo(p.x - 22, p.y + 18);
      ctx.lineTo(p.x, p.y + 12);
      ctx.lineTo(p.x + 22, p.y + 18);
      ctx.closePath();
      ctx.fill();

      // Cockpit
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Particles
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
        ctx.globalAlpha = pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
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
        className="w-full h-full max-h-[560px] object-contain rounded-lg border border-slate-800 shadow-2xl bg-slate-900 cursor-crosshair"
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

          <div className="flex items-center gap-3">
            {shieldActive && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 text-xs font-semibold animate-pulse">
                <Shield className="w-4 h-4" />
                SHIELD ACTIVE
              </div>
            )}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">LIVES</span>
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx < lives ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            ARCADE SPACE COMBAT
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">
            NEBULA STRIKE: GALACTIC FURY
          </h2>
          <p className="text-slate-300 text-sm max-w-md mb-6">
            Pilot your starfighter through alien battle fleets, collect weapon powerups, and obliterate flagship bosses!
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-8 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <span><strong className="text-white">Mouse / WASD</strong> to Move</span>
            <span>·</span>
            <span><strong className="text-white">Auto-Fire / Space</strong> to Shoot</span>
            <span>·</span>
            <span>Collect <strong className="text-cyan-400">Powerups</strong></span>
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-base rounded-xl shadow-lg shadow-violet-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            LAUNCH MISSION
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="text-rose-500 font-bold text-sm tracking-widest uppercase mb-1">Starfighter Destroyed</div>
          <h2 className="text-4xl font-black text-white mb-4">MISSION FAILED</h2>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 w-full max-w-xs shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">Fleet Score</span>
              <span className="text-2xl font-bold font-mono text-violet-400">{score}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-slate-400 text-sm">Best Record</span>
              <span className="text-xl font-bold font-mono text-amber-400">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-base rounded-xl shadow-lg shadow-violet-600/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
