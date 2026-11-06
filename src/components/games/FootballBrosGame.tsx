import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { Trophy, RotateCcw, Play } from 'lucide-react';

interface FootballBrosGameProps {
  isMuted: boolean;
  embedUrl?: string;
}

export const FootballBrosGame: React.FC<FootballBrosGameProps> = ({ embedUrl }) => {
  const [useEmbed, setUseEmbed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [scoreRed, setScoreRed] = useState(0);
  const [scoreBlue, setScoreBlue] = useState(0);
  const [clock, setClock] = useState(90);
  const [gameActive, setGameActive] = useState(false);
  const [bannerText, setBannerText] = useState('');

  const engineRef = useRef({
    player1: { x: 220, y: 380, vx: 0, vy: 0, grounded: true, isJumping: false, hasBall: true, name: 'Red Bro' },
    player2: { x: 580, y: 380, vx: 0, vy: 0, grounded: true, isJumping: false, hasBall: false, name: 'Blue Bro' },
    ball: { x: 240, y: 340, vx: 0, vy: 0, inAir: false },
    keys: { left: false, right: false, up: false, action: false },
  });

  const resetKickoff = (scoringTeam?: 'red' | 'blue') => {
    engineRef.current.player1 = { x: 220, y: 380, vx: 0, vy: 0, grounded: true, isJumping: false, hasBall: scoringTeam !== 'red', name: 'Red Bro' };
    engineRef.current.player2 = { x: 580, y: 380, vx: 0, vy: 0, grounded: true, isJumping: false, hasBall: scoringTeam === 'red', name: 'Blue Bro' };
    engineRef.current.ball = {
      x: scoringTeam === 'red' ? 560 : 240,
      y: 340,
      vx: 0,
      vy: 0,
      inAir: false,
    };
  };

  const startGame = () => {
    setScoreRed(0);
    setScoreBlue(0);
    setClock(90);
    resetKickoff();
    setGameActive(true);
    setBannerText('KICKOFF!');
    sound.playPowerup();
    setTimeout(() => setBannerText(''), 1500);
  };

  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setClock((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameActive(false);
          sound.playGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { keys } = engineRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = true;
      if (['Space', 'KeyJ'].includes(e.code)) keys.action = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const { keys } = engineRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = false;
      if (['Space', 'KeyJ'].includes(e.code)) keys.action = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Bobblehead Football Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const groundY = 400;

    const loop = () => {
      const state = engineRef.current;
      const p1 = state.player1;
      const p2 = state.player2;
      const ball = state.ball;
      const width = canvas.width;
      const height = canvas.height;

      if (gameActive) {
        // Player 1 controls
        const speed = 5.5;
        if (state.keys.left) p1.vx = -speed;
        else if (state.keys.right) p1.vx = speed;
        else p1.vx *= 0.8;

        if (state.keys.up && p1.grounded) {
          p1.vy = -13;
          p1.grounded = false;
          sound.playJump();
        }

        // P1 Action (Pass / Kick / Tackle)
        if (state.keys.action && p1.hasBall) {
          state.keys.action = false;
          p1.hasBall = false;
          ball.inAir = true;
          ball.x = p1.x + 25;
          ball.y = p1.y - 30;
          ball.vx = 11;
          ball.vy = -8;
          sound.playLaser();
        }

        // CPU Player 2 AI
        const p2Speed = 4.8;
        let targetX = ball.inAir ? ball.x : (p1.hasBall ? p1.x : ball.x);
        if (p2.x < targetX - 20) p2.vx = p2Speed;
        else if (p2.x > targetX + 20) p2.vx = -p2Speed;
        else p2.vx *= 0.8;

        // CPU Jump
        if (ball.inAir && Math.abs(ball.x - p2.x) < 40 && ball.y < p2.y - 20 && p2.grounded) {
          p2.vy = -12;
          p2.grounded = false;
        }

        // CPU throw ball
        if (p2.hasBall && Math.random() < 0.02) {
          p2.hasBall = false;
          ball.inAir = true;
          ball.x = p2.x - 25;
          ball.y = p2.y - 30;
          ball.vx = -11;
          ball.vy = -8;
          sound.playLaser();
        }

        // Gravity & Physics for P1
        p1.vy += 0.65;
        p1.x += p1.vx;
        p1.y += p1.vy;
        if (p1.y >= groundY) {
          p1.y = groundY;
          p1.vy = 0;
          p1.grounded = true;
        }
        p1.x = Math.max(80, Math.min(width - 80, p1.x));

        // Gravity & Physics for P2
        p2.vy += 0.65;
        p2.x += p2.vx;
        p2.y += p2.vy;
        if (p2.y >= groundY) {
          p2.y = groundY;
          p2.vy = 0;
          p2.grounded = true;
        }
        p2.x = Math.max(80, Math.min(width - 80, p2.x));

        // Ball physics
        if (ball.inAir) {
          ball.vy += 0.5;
          ball.x += ball.vx;
          ball.y += ball.vy;

          if (ball.y >= groundY - 10) {
            ball.y = groundY - 10;
            ball.vy *= -0.6;
            ball.vx *= 0.8;
            if (Math.abs(ball.vy) < 1) ball.inAir = false;
          }

          // P1 catch
          if (Math.hypot(p1.x - ball.x, p1.y - 30 - ball.y) < 36) {
            p1.hasBall = true;
            ball.inAir = false;
            sound.playCoin();
          }

          // P2 catch
          if (Math.hypot(p2.x - ball.x, p2.y - 30 - ball.y) < 36) {
            p2.hasBall = true;
            ball.inAir = false;
            sound.playCoin();
          }
        } else if (p1.hasBall) {
          ball.x = p1.x + 16;
          ball.y = p1.y - 25;
        } else if (p2.hasBall) {
          ball.x = p2.x - 16;
          ball.y = p2.y - 25;
        } else {
          // Ball on ground, check pickup
          if (Math.hypot(p1.x - ball.x, p1.y - ball.y) < 35) {
            p1.hasBall = true;
            sound.playCoin();
          } else if (Math.hypot(p2.x - ball.x, p2.y - ball.y) < 35) {
            p2.hasBall = true;
            sound.playCoin();
          }
        }

        // Tackle collision
        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 40) {
          if (p1.hasBall && Math.abs(p2.vx) > 3) {
            // P2 tackled P1!
            p1.hasBall = false;
            ball.inAir = true;
            ball.vx = (Math.random() - 0.5) * 8;
            ball.vy = -6;
            sound.playExplosion();
          } else if (p2.hasBall && Math.abs(p1.vx) > 3) {
            // P1 tackled P2!
            p2.hasBall = false;
            ball.inAir = true;
            ball.vx = (Math.random() - 0.5) * 8;
            ball.vy = -6;
            sound.playExplosion();
          }
        }

        // Touchdown checks!
        if (p1.hasBall && p1.x > width - 120) {
          // Red Touchdown!
          sound.playCoin();
          setScoreRed((prev) => prev + 7);
          setBannerText('RED TOUCHDOWN!');
          resetKickoff('red');
          setTimeout(() => setBannerText(''), 2000);
        } else if (p2.hasBall && p2.x < 120) {
          // Blue Touchdown!
          sound.playCoin();
          setScoreBlue((prev) => prev + 7);
          setBannerText('BLUE TOUCHDOWN!');
          resetKickoff('blue');
          setTimeout(() => setBannerText(''), 2000);
        }
      }

      // RENDER STADIUM
      // Stadium lights & cheering crowd
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Cheering pixel fans in stands
      for (let y = 140; y < 280; y += 18) {
        for (let x = 30; x < width - 30; x += 16) {
          ctx.fillStyle = ['#38bdf8', '#ef4444', '#fbbf24', '#a855f7', '#10b981'][
            (x + y) % 5
          ];
          ctx.beginPath();
          ctx.arc(x, y + Math.sin(Date.now() * 0.005 + x) * 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Field Turf
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, 280, width, height - 280);

      // End zones
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 280, 100, height - 280);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(width - 100, 280, 100, height - 280);

      // Yard lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      for (let x = 100; x < width - 100; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 280);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Goal posts
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 6;
      // Left goal post
      ctx.beginPath();
      ctx.moveTo(40, 400);
      ctx.lineTo(40, 220);
      ctx.lineTo(15, 170);
      ctx.moveTo(40, 220);
      ctx.lineTo(65, 170);
      ctx.stroke();

      // Right goal post
      ctx.beginPath();
      ctx.moveTo(width - 40, 400);
      ctx.lineTo(width - 40, 220);
      ctx.lineTo(width - 65, 170);
      ctx.moveTo(width - 40, 220);
      ctx.lineTo(width - 15, 170);
      ctx.stroke();

      // Draw Bobblehead Player Helper
      const drawBro = (x: number, y: number, color: string, isFacingRight: boolean, hasFootball: boolean) => {
        ctx.save();
        ctx.translate(x, y);

        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-14, -30, 28, 28, 6);
        ctx.fill();

        // Legs / cleats
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, -2, 7, 10);
        ctx.fillRect(3, -2, 7, 10);

        // Huge Bobblehead Helmet
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -48, 22, 0, Math.PI * 2);
        ctx.fill();

        // Face opening
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(isFacingRight ? 5 : -5, -46, 12, 0, Math.PI * 2);
        ctx.fill();

        // Facemask grill
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(isFacingRight ? 6 : -6, -46, 14, -0.4, 0.4);
        ctx.stroke();

        ctx.restore();
      };

      // Draw P1 (Red Bro) & P2 (Blue Bro)
      drawBro(p1.x, p1.y, '#dc2626', true, p1.hasBall);
      drawBro(p2.x, p2.y, '#2563eb', false, p2.hasBall);

      // Draw Football
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(ball.x, ball.y, 11, 7, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameActive]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 font-display select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={520}
        className="w-full h-full max-h-[520px] object-contain rounded-lg border border-slate-800 shadow-2xl bg-slate-900"
      />

      {/* Scoreboard HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none px-4">
        <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl px-5 py-2.5 flex items-center gap-6 shadow-xl">
          <div className="text-center">
            <span className="text-[10px] text-rose-400 font-bold block uppercase">RED BROS</span>
            <span className="text-3xl font-black font-mono text-white tabular-nums">{scoreRed}</span>
          </div>
          <span className="text-xs text-slate-500 font-bold">VS</span>
          <div className="text-center">
            <span className="text-[10px] text-blue-400 font-bold block uppercase">BLUE BROS</span>
            <span className="text-3xl font-black font-mono text-white tabular-nums">{scoreBlue}</span>
          </div>
        </div>

        <div className="bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
          <span className="text-[10px] text-slate-400 uppercase font-medium">CLOCK</span>
          <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">{clock}s</span>
        </div>
      </div>

      {bannerText && (
        <div className="absolute top-24 bg-amber-500 text-slate-950 font-black text-2xl px-6 py-2 rounded-2xl shadow-2xl animate-bounce">
          {bannerText}
        </div>
      )}

      {/* Start screen */}
      {!gameActive && clock === 90 && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">
            FOOTBALL BROS
          </h2>
          <p className="text-slate-300 text-sm max-w-md mb-6">
            Jump, tackle, and catch deep bombs for glorious touchdowns in this fast-paced cartoon arcade football clash!
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-8 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <span><strong className="text-white">A / D</strong> Move</span>
            <span>·</span>
            <span><strong className="text-white">W / Space</strong> Jump</span>
            <span>·</span>
            <span><strong className="text-white">Space / J</strong> Throw / Tackle</span>
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-base rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            START GAME
          </button>
        </div>
      )}

      {/* Final Summary */}
      {!gameActive && clock === 0 && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <Trophy className="w-14 h-14 text-amber-400 mb-2 animate-bounce" />
          <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
          <p className="text-xl font-bold mb-6 text-cyan-400">
            {scoreRed > scoreBlue ? 'RED BROS WIN!' : (scoreBlue > scoreRed ? 'BLUE BROS WIN!' : 'TIED GAME!')}
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
