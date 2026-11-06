import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { Shield, Sparkles, Zap, Flame, Snowflake, RotateCcw, Play } from 'lucide-react';

interface ArcaneDefendersGameProps {
  isMuted: boolean;
}

type TowerType = 'archer' | 'fire' | 'frost' | 'lightning';

export const ArcaneDefendersGame: React.FC<ArcaneDefendersGameProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gold, setGold] = useState(250);
  const [crystalHp, setCrystalHp] = useState(100);
  const [wave, setWave] = useState(1);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType>('archer');
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('START');

  const engineRef = useRef({
    gold: 250,
    crystalHp: 100,
    wave: 1,
    enemies: [] as {
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      speed: number;
      pathIdx: number;
      slowTimer: number;
      reward: number;
    }[],
    towers: [] as {
      x: number;
      y: number;
      type: TowerType;
      range: number;
      damage: number;
      cooldown: number;
      lastShot: number;
    }[],
    projectiles: [] as {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      targetEnemy: any;
      type: TowerType;
      life: number;
    }[],
    path: [
      { x: 40, y: 260 },
      { x: 220, y: 260 },
      { x: 220, y: 120 },
      { x: 460, y: 120 },
      { x: 460, y: 380 },
      { x: 680, y: 380 },
      { x: 680, y: 260 },
      { x: 760, y: 260 },
    ],
    lastSpawn: 0,
    enemiesSpawned: 0,
    maxWaveEnemies: 12,
  });

  const towerCosts: Record<TowerType, number> = {
    archer: 100,
    fire: 140,
    frost: 120,
    lightning: 180,
  };

  const startLevel = () => {
    engineRef.current.gold = 250;
    engineRef.current.crystalHp = 100;
    engineRef.current.wave = 1;
    engineRef.current.enemies = [];
    engineRef.current.towers = [];
    engineRef.current.projectiles = [];
    engineRef.current.enemiesSpawned = 0;
    setGold(250);
    setCrystalHp(100);
    setWave(1);
    setGameState('PLAYING');
    sound.playPowerup();
  };

  const placeTower = (x: number, y: number) => {
    const cost = towerCosts[selectedTowerType];
    if (engineRef.current.gold < cost) return;

    // Check not on path or too close to other towers
    for (const t of engineRef.current.towers) {
      if (Math.hypot(t.x - x, t.y - y) < 40) return;
    }

    sound.playCoin();
    engineRef.current.gold -= cost;
    setGold(engineRef.current.gold);

    const stats = {
      archer: { range: 120, damage: 18, cooldown: 400 },
      fire: { range: 90, damage: 32, cooldown: 900 },
      frost: { range: 110, damage: 10, cooldown: 600 },
      lightning: { range: 140, damage: 45, cooldown: 1100 },
    }[selectedTowerType];

    engineRef.current.towers.push({
      x,
      y,
      type: selectedTowerType,
      range: stats.range,
      damage: stats.damage,
      cooldown: stats.cooldown,
      lastShot: 0,
    });
  };

  // Canvas interaction
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      if (gameState !== 'PLAYING') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;
      placeTower(clickX, clickY);
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [gameState, selectedTowerType]);

  // Tower defense loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = (time: number) => {
      const state = engineRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Spawn Enemies
      if (
        state.enemiesSpawned < state.maxWaveEnemies &&
        time - state.lastSpawn > 1200
      ) {
        state.lastSpawn = time;
        state.enemiesSpawned++;
        state.enemies.push({
          x: state.path[0].x,
          y: state.path[0].y,
          hp: 40 + state.wave * 25,
          maxHp: 40 + state.wave * 25,
          speed: 1.6 + Math.random() * 0.4,
          pathIdx: 0,
          slowTimer: 0,
          reward: 25,
        });
      }

      // Update Enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        if (e.slowTimer > 0) e.slowTimer--;

        const currentTarget = state.path[e.pathIdx + 1];
        if (!currentTarget) {
          // Reached Crystal Base!
          state.crystalHp -= 15;
          setCrystalHp(Math.max(0, state.crystalHp));
          sound.playExplosion();
          state.enemies.splice(i, 1);
          if (state.crystalHp <= 0) {
            setGameState('GAMEOVER');
            return;
          }
          continue;
        }

        const dx = currentTarget.x - e.x;
        const dy = currentTarget.y - e.y;
        const dist = Math.hypot(dx, dy);
        const currentSpeed = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;

        if (dist < 4) {
          e.pathIdx++;
        } else {
          e.x += (dx / dist) * currentSpeed;
          e.y += (dy / dist) * currentSpeed;
        }
      }

      // Tower Target & Shoot
      for (const t of state.towers) {
        if (time - t.lastShot > t.cooldown) {
          // Find first enemy in range
          for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            const dist = Math.hypot(e.x - t.x, e.y - t.y);
            if (dist <= t.range) {
              t.lastShot = time;
              sound.playLaser();
              state.projectiles.push({
                x: t.x,
                y: t.y,
                targetX: e.x,
                targetY: e.y,
                targetEnemy: e,
                type: t.type,
                life: 15,
              });

              // Apply damage
              e.hp -= t.damage;
              if (t.type === 'frost') e.slowTimer = 90;

              if (e.hp <= 0) {
                sound.playCoin();
                state.gold += e.reward;
                setGold(state.gold);
                state.enemies.splice(i, 1);
              }
              break;
            }
          }
        }
      }

      // Update Projectiles
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.life--;
        if (p.life <= 0) {
          state.projectiles.splice(i, 1);
        }
      }

      // Check next wave
      if (state.enemiesSpawned >= state.maxWaveEnemies && state.enemies.length === 0) {
        if (state.wave >= 5) {
          setGameState('VICTORY');
          sound.playPowerup();
          return;
        } else {
          state.wave++;
          setWave(state.wave);
          state.enemiesSpawned = 0;
          state.maxWaveEnemies += 4;
          state.gold += 100;
          setGold(state.gold);
          sound.playPowerup();
        }
      }

      // RENDER ISLAND & PATH
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Arcane floating island grass
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(20, 20, width - 40, height - 40, 24);
      ctx.fill();

      // Stone Path
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(state.path[0].x, state.path[0].y);
      for (let i = 1; i < state.path.length; i++) {
        ctx.lineTo(state.path[i].x, state.path[i].y);
      }
      ctx.stroke();

      // Path inner trail
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 26;
      ctx.stroke();

      // Crystal Bastion Spire at end of path
      const endPoint = state.path[state.path.length - 1];
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(endPoint.x, endPoint.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Towers
      for (const t of state.towers) {
        const color = {
          archer: '#10b981',
          fire: '#ef4444',
          frost: '#06b6d4',
          lightning: '#f59e0b',
        }[t.type];

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Projectiles
      for (const p of state.projectiles) {
        const color = {
          archer: '#10b981',
          fire: '#ef4444',
          frost: '#06b6d4',
          lightning: '#f59e0b',
        }[p.type];

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.targetX, p.targetY);
        ctx.stroke();
      }

      // Draw Enemies
      for (const e of state.enemies) {
        ctx.fillStyle = e.slowTimer > 0 ? '#38bdf8' : '#e11d48';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 11, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(e.x - 12, e.y - 18, 24, 4);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(e.x - 12, e.y - 18, (e.hp / e.maxHp) * 24, 4);
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
        height={500}
        className="w-full h-full max-h-[500px] object-contain rounded-lg border border-slate-800 shadow-2xl bg-slate-900 cursor-pointer"
      />

      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none px-4">
        <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl px-5 py-2 flex items-center gap-6 shadow-xl">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-medium block">Crystal Health</span>
            <span className="text-xl font-bold font-mono text-rose-400 tabular-nums">{crystalHp}%</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-medium block">Gold</span>
            <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">{gold} G</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-medium block">Wave</span>
            <span className="text-xl font-bold font-mono text-cyan-400 tabular-nums">{wave} / 5</span>
          </div>
        </div>

        {/* Tower Selector Shelf */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/95 border border-slate-800 p-1.5 rounded-xl shadow-xl">
          {(['archer', 'fire', 'frost', 'lightning'] as TowerType[]).map((type) => {
            const isSelected = selectedTowerType === type;
            const cost = towerCosts[type];
            return (
              <button
                key={type}
                onClick={() => setSelectedTowerType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {type === 'archer' && <Sparkles className="w-3.5 h-3.5" />}
                {type === 'fire' && <Flame className="w-3.5 h-3.5" />}
                {type === 'frost' && <Snowflake className="w-3.5 h-3.5" />}
                {type === 'lightning' && <Zap className="w-3.5 h-3.5" />}
                <span className="capitalize">{type}</span>
                <span className="opacity-75 text-[10px] font-mono">{cost}G</span>
              </button>
            );
          })}
        </div>
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-4xl font-black text-white mb-2">ARCANE DEFENDERS</h2>
          <p className="text-slate-300 text-sm max-w-md mb-6">
            Build and upgrade elemental crystal spires along the island path to protect the sacred crystal core!
          </p>
          <button
            onClick={startLevel}
            className="flex items-center gap-2 px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            START DEFENDING
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-4xl font-black text-rose-500 mb-2">CRYSTAL SHATTERED</h2>
          <button
            onClick={startLevel}
            className="flex items-center gap-2 px-7 py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            RETRY BASTION
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-4xl font-black text-emerald-400 mb-2">ISLAND DEFENDED!</h2>
          <p className="text-slate-300 mb-6">All 5 waves of invaders were repelled!</p>
          <button
            onClick={startLevel}
            className="flex items-center gap-2 px-7 py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
