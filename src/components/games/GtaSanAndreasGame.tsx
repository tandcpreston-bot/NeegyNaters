import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { Radio, Shield, Heart, DollarSign, Crosshair, RotateCcw } from 'lucide-react';

interface GtaSanAndreasGameProps {
  isMuted: boolean;
  embedUrl?: string;
}

export const GtaSanAndreasGame: React.FC<GtaSanAndreasGameProps> = ({ embedUrl }) => {
  const [useEmbed, setUseEmbed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // HUD state
  const [hp, setHp] = useState(100);
  const [armor, setArmor] = useState(50);
  const [cash, setCash] = useState(1250);
  const [wantedStars, setWantedStars] = useState(1);
  const [radioStation, setRadioStation] = useState('Radio Los Santos 106.1');
  const [vehicleStatus, setVehicleStatus] = useState<string>('On Foot');
  const [missionText, setMissionText] = useState('Explore Los Santos or hijack a lowrider (Press E/Enter)');
  const [gameOver, setGameOver] = useState(false);

  const engineRef = useRef({
    player: {
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 3.2,
      inCar: false,
      carIndex: -1,
      hp: 100,
      armor: 50,
      cash: 1250,
      wanted: 1,
    },
    cars: [
      { id: 1, x: 340, y: 300, angle: 0, speed: 0, maxSpeed: 7, color: '#a855f7', name: 'Savanna Lowrider', occupied: false },
      { id: 2, x: 550, y: 180, angle: Math.PI / 2, speed: 2, maxSpeed: 6.5, color: '#eab308', name: 'Taxi Cab', occupied: false },
      { id: 3, x: 200, y: 480, angle: -Math.PI / 2, speed: 2, maxSpeed: 7.5, color: '#ef4444', name: 'Infernus', occupied: false },
    ],
    cops: [
      { x: 100, y: 100, vx: 0, vy: 0, angle: 0, speed: 2.8, alert: false },
    ],
    bullets: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number }[],
    keys: { w: false, s: false, a: false, d: false, space: false, enter: false },
  });

  const radioStations = [
    'Radio Los Santos 106.1',
    'Bounce FM - Funk & Groove',
    'K-DST - The Dust Rock',
    'Radio Off',
  ];

  const cycleRadio = () => {
    sound.playClick();
    setRadioStation((prev) => {
      const idx = radioStations.indexOf(prev);
      return radioStations[(idx + 1) % radioStations.length];
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { keys, player, cars } = engineRef.current;
      if (['KeyW', 'ArrowUp'].includes(e.code)) keys.w = true;
      if (['KeyS', 'ArrowDown'].includes(e.code)) keys.s = true;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) keys.a = true;
      if (['KeyD', 'ArrowRight'].includes(e.code)) keys.d = true;
      if (e.code === 'Space') keys.space = true;
      if (['KeyE', 'Enter', 'KeyF'].includes(e.code)) {
        // Toggle vehicle entry / exit
        if (player.inCar) {
          player.inCar = false;
          cars[player.carIndex].occupied = false;
          player.carIndex = -1;
          setVehicleStatus('On Foot');
          sound.playJump();
        } else {
          // Find closest car
          for (let i = 0; i < cars.length; i++) {
            const c = cars[i];
            const dist = Math.hypot(c.x - player.x, c.y - player.y);
            if (dist < 45) {
              player.inCar = true;
              player.carIndex = i;
              c.occupied = true;
              setVehicleStatus(c.name);
              sound.playJump();
              setMissionText(`Cruising in ${c.name}! Press R for Radio.`);
              break;
            }
          }
        }
      }
      if (e.code === 'KeyR') {
        cycleRadio();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const { keys } = engineRef.current;
      if (['KeyW', 'ArrowUp'].includes(e.code)) keys.w = false;
      if (['KeyS', 'ArrowDown'].includes(e.code)) keys.s = false;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) keys.a = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) keys.d = false;
      if (e.code === 'Space') keys.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Open World Sandbox Game Loop
  useEffect(() => {
    if (useEmbed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const state = engineRef.current;
      const p = state.player;
      const width = canvas.width;
      const height = canvas.height;

      // Player Movement
      if (p.inCar) {
        const car = state.cars[p.carIndex];
        if (car) {
          if (state.keys.w) car.speed = Math.min(car.maxSpeed, car.speed + 0.2);
          else if (state.keys.s) car.speed = Math.max(-3, car.speed - 0.2);
          else car.speed *= 0.96;

          if (state.keys.a) car.angle -= 0.05 * (car.speed / car.maxSpeed);
          if (state.keys.d) car.angle += 0.05 * (car.speed / car.maxSpeed);

          car.x += Math.cos(car.angle) * car.speed;
          car.y += Math.sin(car.angle) * car.speed;

          // Wrap boundaries
          if (car.x < 30) car.x = width - 40;
          if (car.x > width - 30) car.x = 40;
          if (car.y < 30) car.y = height - 40;
          if (car.y > height - 30) car.y = 40;

          p.x = car.x;
          p.y = car.y;
          p.angle = car.angle;

          // Skidding particles
          if (Math.abs(car.speed) > 4 && (state.keys.a || state.keys.d)) {
            state.particles.push({
              x: car.x - Math.cos(car.angle) * 20,
              y: car.y - Math.sin(car.angle) * 20,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              color: 'rgba(255,255,255,0.4)',
              life: 0.5,
            });
          }
        }
      } else {
        // On Foot
        let moveX = 0;
        let moveY = 0;
        if (state.keys.w) moveY -= 1;
        if (state.keys.s) moveY += 1;
        if (state.keys.a) moveX -= 1;
        if (state.keys.d) moveX += 1;

        if (moveX !== 0 || moveY !== 0) {
          p.angle = Math.atan2(moveY, moveX);
          p.x += moveX * p.speed;
          p.y += moveY * p.speed;
        }

        p.x = Math.max(25, Math.min(width - 25, p.x));
        p.y = Math.max(25, Math.min(height - 25, p.y));

        // Punch / shoot
        if (state.keys.space && state.bullets.length < 5) {
          state.keys.space = false;
          sound.playLaser();
          state.bullets.push({
            x: p.x + Math.cos(p.angle) * 15,
            y: p.y + Math.sin(p.angle) * 15,
            vx: Math.cos(p.angle) * 9,
            vy: Math.sin(p.angle) * 9,
            life: 40,
          });
        }
      }

      // Update Cop Pursuits
      for (const cop of state.cops) {
        const dx = p.x - cop.x;
        const dy = p.y - cop.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 35) {
          cop.angle = Math.atan2(dy, dx);
          cop.x += Math.cos(cop.angle) * cop.speed;
          cop.y += Math.sin(cop.angle) * cop.speed;
        } else {
          // Cop arresting / damaging player
          p.hp = Math.max(0, p.hp - 0.5);
          setHp(Math.round(p.hp));
          if (p.hp <= 0) {
            setGameOver(true);
            sound.playGameOver();
          }
        }
      }

      // Update Bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        if (b.life <= 0) {
          state.bullets.splice(i, 1);
        }
      }

      // RENDER LOS SANTOS DISTRICT
      // Asphalt streets & Sidewalks
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);

      // Roads
      ctx.fillStyle = '#0f172a';
      // Horizontal major avenue
      ctx.fillRect(0, 220, width, 140);
      // Vertical boulevard
      ctx.fillRect(320, 0, 160, height);

      // Yellow road divider lines
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(0, 290);
      ctx.lineTo(width, 290);
      ctx.moveTo(400, 0);
      ctx.lineTo(400, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Grove Street Cul-de-Sac grassy lots & palm trees
      ctx.fillStyle = '#15803d';
      ctx.fillRect(20, 20, 280, 180);
      ctx.fillRect(500, 20, 280, 180);
      ctx.fillRect(20, 380, 280, 120);
      ctx.fillRect(500, 380, 280, 120);

      // Houses / Brick Buildings
      ctx.fillStyle = '#78350f';
      ctx.fillRect(50, 40, 90, 70);
      ctx.fillRect(170, 40, 100, 70);
      ctx.fillRect(530, 40, 110, 70);
      ctx.fillRect(660, 40, 100, 70);

      // Palm Trees
      const drawPalm = (px: number, py: number) => {
        ctx.fillStyle = '#713f12';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
          ctx.beginPath();
          ctx.ellipse(px + Math.cos(a) * 16, py + Math.sin(a) * 16, 14, 5, a, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      drawPalm(40, 160);
      drawPalm(280, 160);
      drawPalm(520, 160);
      drawPalm(760, 160);

      // Draw Cars
      for (const car of state.cars) {
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);

        // Body
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.roundRect(-24, -13, 48, 26, 4);
        ctx.fill();

        // Windshield
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-6, -10, 14, 20);

        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(20, -11, 4, 6);
        ctx.fillRect(20, 5, 4, 6);

        // Taillights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-24, -11, 3, 5);
        ctx.fillRect(-24, 6, 3, 5);

        ctx.restore();
      }

      // Draw Cop Cruisers
      for (const cop of state.cops) {
        ctx.save();
        ctx.translate(cop.x, cop.y);
        ctx.rotate(cop.angle);

        // Black and white police car
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(-24, -13, 48, 26, 4);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-24, -13, 14, 26);
        ctx.fillRect(10, -13, 14, 26);

        // Police flashing lightbar
        ctx.fillStyle = Math.sin(Date.now() * 0.02) > 0 ? '#ef4444' : '#3b82f6';
        ctx.fillRect(-4, -6, 8, 12);

        ctx.restore();
      }

      // Draw Bullets
      for (const b of state.bullets) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player if not in car
      if (!p.inCar) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // CJ / Protagonist: green bandana / tank top
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // Arms
        ctx.fillStyle = '#a16207';
        ctx.fillRect(2, -8, 6, 4);
        ctx.fillRect(2, 4, 6, 4);

        ctx.restore();
      }

      // Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 0.03;
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
  }, [useEmbed]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 font-display select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={520}
        className="w-full h-full max-h-[520px] object-contain rounded-lg border border-slate-800 shadow-2xl bg-slate-900"
      />

      {/* Top San Andreas HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none px-4">
        {/* Health & Armor */}
        <div className="flex items-center gap-3 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl px-4 py-2.5 shadow-xl">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-current" />
            <div className="w-24 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className="bg-rose-500 h-full transition-all" style={{ width: `${hp}%` }} />
            </div>
            <span className="text-xs font-mono text-white font-bold ml-1">{hp}</span>
          </div>

          <div className="w-px h-5 bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-400 fill-current" />
            <div className="w-16 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className="bg-blue-400 h-full transition-all" style={{ width: `${armor * 2}%` }} />
            </div>
          </div>

          <div className="w-px h-5 bg-slate-800" />

          <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-sm">
            <DollarSign className="w-4 h-4" />
            {cash}
          </div>
        </div>

        {/* Wanted Stars & Radio */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-1">
            {[...Array(5)].map((_, idx) => (
              <span
                key={idx}
                className={`text-lg transition-colors ${
                  idx < wantedStars ? 'text-amber-400 animate-pulse' : 'text-slate-700'
                }`}
              >
                ★
              </span>
            ))}
          </div>

          <button
            onClick={cycleRadio}
            className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[140px] truncate">{radioStation}</span>
          </button>
        </div>
      </div>

      {/* Mission / Context bar */}
      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 shadow-lg">
          <span className="text-amber-400 font-bold mr-2">LOS SANTOS:</span>
          {missionText}
        </div>
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 font-mono">
          STATUS: <span className="text-white font-bold">{vehicleStatus}</span>
        </div>
      </div>

      {/* Busted / Wasted screen */}
      {gameOver && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-6xl font-black text-rose-500 tracking-wider mb-2 font-display">WASTED</h2>
          <p className="text-slate-300 text-sm mb-6">You got busted in Los Santos.</p>
          <button
            onClick={() => {
              setHp(100);
              setWantedStars(1);
              setGameOver(false);
              engineRef.current.player.hp = 100;
              engineRef.current.player.x = 400;
              engineRef.current.player.y = 300;
            }}
            className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            RESPAWN AT HOSPITAL
          </button>
        </div>
      )}
    </div>
  );
};
