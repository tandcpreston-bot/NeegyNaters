import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../../utils/audio';
import { Play, RotateCcw, Sparkles, Clock } from 'lucide-react';

interface GemstoneCascadeGameProps {
  isMuted: boolean;
}

const GRID_SIZE = 8;
const GEM_COLORS = [
  { id: 0, name: 'Ruby', color: '#ef4444', icon: '◆' },
  { id: 1, name: 'Emerald', color: '#10b981', icon: '▲' },
  { id: 2, name: 'Sapphire', color: '#3b82f6', icon: '●' },
  { id: 3, name: 'Topaz', color: '#f59e0b', icon: '★' },
  { id: 4, name: 'Amethyst', color: '#8b5cf6', icon: '⬟' },
  { id: 5, name: 'Diamond', color: '#06b6d4', icon: '◈' },
];

export const GemstoneCascadeGame: React.FC<GemstoneCascadeGameProps> = () => {
  const [board, setBoard] = useState<number[][]>([]);
  const [selectedGem, setSelectedGem] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [isCascading, setIsCascading] = useState(false);
  const [matchedCells, setMatchedCells] = useState<{ r: number; c: number }[]>([]);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gemstone_cascade_highscore') || '0', 10);
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize a random board with no initial matches
  const createValidBoard = useCallback(() => {
    const newBoard: number[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      newBoard[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        let val: number;
        do {
          val = Math.floor(Math.random() * GEM_COLORS.length);
        } while (
          (r >= 2 && newBoard[r - 1][c] === val && newBoard[r - 2][c] === val) ||
          (c >= 2 && newBoard[r][c - 1] === val && newBoard[r][c - 2] === val)
        );
        newBoard[r][c] = val;
      }
    }
    return newBoard;
  }, []);

  const startGame = () => {
    setBoard(createValidBoard());
    setScore(0);
    setCombo(1);
    setTimeLeft(60);
    setSelectedGem(null);
    setMatchedCells([]);
    setGameState('PLAYING');
    sound.playPowerup();
  };

  // Timer countdown
  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setGameState('GAMEOVER');
            sound.playGameOver();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Update highscore
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('gemstone_cascade_highscore', score.toString());
    }
  }, [score, highScore]);

  // Check board for matches
  const findMatches = (currentBoard: number[][]) => {
    const matches: { r: number; c: number }[] = [];
    const matchedSet = new Set<string>();

    // Horizontal check
    for (let r = 0; r < GRID_SIZE; r++) {
      let matchLength = 1;
      for (let c = 0; c < GRID_SIZE; c++) {
        const checkEnd = c === GRID_SIZE - 1;
        const currentVal = currentBoard[r][c];
        const nextVal = !checkEnd ? currentBoard[r][c + 1] : null;

        if (currentVal !== -1 && currentVal === nextVal) {
          matchLength++;
        } else {
          if (matchLength >= 3) {
            for (let i = 0; i < matchLength; i++) {
              const key = `${r},${c - i}`;
              if (!matchedSet.has(key)) {
                matchedSet.add(key);
                matches.push({ r, c: c - i });
              }
            }
          }
          matchLength = 1;
        }
      }
    }

    // Vertical check
    for (let c = 0; c < GRID_SIZE; c++) {
      let matchLength = 1;
      for (let r = 0; r < GRID_SIZE; r++) {
        const checkEnd = r === GRID_SIZE - 1;
        const currentVal = currentBoard[r][c];
        const nextVal = !checkEnd ? currentBoard[r + 1][c] : null;

        if (currentVal !== -1 && currentVal === nextVal) {
          matchLength++;
        } else {
          if (matchLength >= 3) {
            for (let i = 0; i < matchLength; i++) {
              const key = `${r - i},${c}`;
              if (!matchedSet.has(key)) {
                matchedSet.add(key);
                matches.push({ r: r - i, c });
              }
            }
          }
          matchLength = 1;
        }
      }
    }

    return matches;
  };

  // Process cascading drops
  const processCascades = useCallback(async (currentBoard: number[][], currentMultiplier = 1) => {
    setIsCascading(true);
    const matches = findMatches(currentBoard);

    if (matches.length === 0) {
      setIsCascading(false);
      setCombo(1);
      return;
    }

    // Highlight matches
    setMatchedCells(matches);
    sound.playMatch();
    const pointsGained = matches.length * 50 * currentMultiplier;
    setScore((prev) => prev + pointsGained);
    setCombo(currentMultiplier);

    await new Promise((resolve) => setTimeout(resolve, 250));

    // Clear matched gems
    const newBoard = currentBoard.map((row) => [...row]);
    matches.forEach(({ r, c }) => {
      newBoard[r][c] = -1;
    });

    setBoard([...newBoard]);
    setMatchedCells([]);
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Gravity: pull gems down
    for (let c = 0; c < GRID_SIZE; c++) {
      let emptyRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (newBoard[r][c] !== -1) {
          if (emptyRow !== r) {
            newBoard[emptyRow][c] = newBoard[r][c];
            newBoard[r][c] = -1;
          }
          emptyRow--;
        }
      }
      // Fill from top
      for (let r = emptyRow; r >= 0; r--) {
        newBoard[r][c] = Math.floor(Math.random() * GEM_COLORS.length);
      }
    }

    setBoard([...newBoard]);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Chain reaction cascade
    processCascades(newBoard, currentMultiplier + 1);
  }, []);

  const handleGemClick = (r: number, c: number) => {
    if (gameState !== 'PLAYING' || isCascading) return;

    sound.playClick();

    if (!selectedGem) {
      setSelectedGem({ r, c });
      return;
    }

    // Already selected same gem
    if (selectedGem.r === r && selectedGem.c === c) {
      setSelectedGem(null);
      return;
    }

    // Check adjacency (horizontal or vertical, not diagonal)
    const isAdjacent =
      (Math.abs(selectedGem.r - r) === 1 && selectedGem.c === c) ||
      (Math.abs(selectedGem.c - c) === 1 && selectedGem.r === r);

    if (!isAdjacent) {
      setSelectedGem({ r, c });
      return;
    }

    // Try swap
    const newBoard = board.map((row) => [...row]);
    const temp = newBoard[r][c];
    newBoard[r][c] = newBoard[selectedGem.r][selectedGem.c];
    newBoard[selectedGem.r][selectedGem.c] = temp;

    const matches = findMatches(newBoard);
    if (matches.length > 0) {
      setBoard(newBoard);
      setSelectedGem(null);
      processCascades(newBoard, 1);
    } else {
      // Invalid swap - shake / revert
      setSelectedGem(null);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 select-none overflow-hidden font-display p-4">
      {/* Top HUD */}
      {gameState === 'PLAYING' && (
        <div className="w-full max-w-md flex items-center justify-between mb-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl px-5 py-3 shadow-xl">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">Score</span>
            <span className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">{score}</span>
          </div>

          {combo > 1 && (
            <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 text-xs font-bold animate-bounce">
              {combo}X COMBO!
            </div>
          )}

          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">Time Left</span>
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  timeLeft <= 10 ? 'text-rose-400' : 'text-white'
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Gem Grid Board */}
      <div className="relative bg-slate-900 border-2 border-slate-800 rounded-3xl p-3 shadow-2xl">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            width: 'min(80vw, 420px)',
            height: 'min(80vw, 420px)',
          }}
        >
          {board.length > 0 &&
            board.map((row, r) =>
              row.map((gemId, c) => {
                const gem = GEM_COLORS[gemId] || GEM_COLORS[0];
                const isSelected = selectedGem?.r === r && selectedGem?.c === c;
                const isMatched = matchedCells.some((m) => m.r === r && m.c === c);

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleGemClick(r, c)}
                    disabled={isCascading}
                    className={`relative w-full h-full rounded-xl flex items-center justify-center transition-all duration-150 transform cursor-pointer ${
                      isSelected
                        ? 'scale-110 ring-4 ring-white shadow-lg z-10'
                        : isMatched
                        ? 'scale-0 opacity-0 duration-200'
                        : 'hover:scale-105 active:scale-95'
                    }`}
                    style={{
                      backgroundColor: gem.color,
                      boxShadow: isSelected ? `0 0 20px ${gem.color}` : 'none',
                    }}
                  >
                    <span className="text-white text-lg drop-shadow font-black select-none">
                      {gem.icon}
                    </span>
                  </button>
                );
              })
            )}
        </div>
      </div>

      {/* Start Modal */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            MATCH-3 CASCADE BLITZ
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">
            GEMSTONE CASCADE
          </h2>
          <p className="text-slate-300 text-sm max-w-md mb-6">
            Swap radiant crystals to match 3 or more in a row! Trigger explosive combo chains before the 60s timer expires.
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-8 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <span>Click gem then adjacent gem to swap</span>
            <span>·</span>
            <span>Chains trigger bonus multipliers</span>
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-base rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            START BLITZ
          </button>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="text-amber-400 font-bold text-sm tracking-widest uppercase mb-1">Time's Up!</div>
          <h2 className="text-4xl font-black text-white mb-4">ROUND SUMMARY</h2>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 w-full max-w-xs shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">Gem Points</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">{score}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-slate-400 text-sm">Best Record</span>
              <span className="text-xl font-bold font-mono text-amber-400">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
