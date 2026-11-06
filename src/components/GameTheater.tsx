import React, { useState, useRef } from 'react';
import { GameItem, UserReview } from '../types/game';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Heart,
  Star,
  Share2,
  Keyboard,
  Info,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { sound } from '../utils/audio';

// Games
import { FootballBrosGame } from './games/FootballBrosGame';
import { PolyTrackGame } from './games/PolyTrackGame';
import { DriveMadGame } from './games/DriveMadGame';
import { RetroBowlGame } from './games/RetroBowlGame';
import { GtaSanAndreasGame } from './games/GtaSanAndreasGame';
import { NeonDriftGame } from './games/NeonDriftGame';
import { NebulaStrikeGame } from './games/NebulaStrikeGame';
import { GemstoneCascadeGame } from './games/GemstoneCascadeGame';
import { ArcaneDefendersGame } from './games/ArcaneDefendersGame';
import { CustomEmbedGame } from './games/CustomEmbedGame';

interface GameTheaterProps {
  game: GameItem;
  allGames: GameItem[];
  isFavorite: boolean;
  onBackToPortal: () => void;
  onSelectGame: (game: GameItem) => void;
  onToggleFavorite: (gameId: string) => void;
}

export const GameTheater: React.FC<GameTheaterProps> = ({
  game,
  allGames,
  isFavorite,
  onBackToPortal,
  onSelectGame,
  onToggleFavorite,
}) => {
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [reviews, setReviews] = useState<UserReview[]>(() => {
    const saved = localStorage.getItem(`reviews_${game.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: '1',
        gameId: game.id,
        username: 'RetroGamer99',
        avatarSeed: 'RG',
        rating: 5,
        comment: `Loving ${game.title}! Super smooth in browser without having to leave PokiPlay.`,
        createdAt: '2 hours ago',
      },
      {
        id: '2',
        gameId: game.id,
        username: 'SpeedRunnerX',
        avatarSeed: 'SR',
        rating: 5,
        comment: 'Controls are super responsive! Added this to my favorites.',
        createdAt: 'Yesterday',
      },
    ];
  });

  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) sound.playClick();
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleShare = () => {
    sound.playClick();
    const url = new URL(window.location.href);
    url.searchParams.set('game', game.slug);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const handleRate = (star: number) => {
    sound.playCoin();
    setUserRating(star);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    sound.playClick();
    const newRev: UserReview = {
      id: Date.now().toString(),
      gameId: game.id,
      username: 'Player_' + Math.floor(1000 + Math.random() * 9000),
      avatarSeed: 'P',
      rating: userRating || 5,
      comment: commentText.trim(),
      createdAt: 'Just now',
    };
    const updated = [newRev, ...reviews];
    setReviews(updated);
    localStorage.setItem(`reviews_${game.id}`, JSON.stringify(updated));
    setCommentText('');
  };

  const [playMode, setPlayMode] = useState<'embed' | 'native'>('embed');

  // Related games
  const relatedGames = allGames
    .filter((g) => g.id !== game.id)
    .sort((a, b) => (b.category === game.category ? 1 : 0) - (a.category === game.category ? 1 : 0))
    .slice(0, 6);

  // Render the matching game content
  const renderGameContent = () => {
    // If the game has an embedUrl and we are in embed mode (the default), run the actual real version!
    if (game.embedUrl && playMode === 'embed') {
      return (
        <iframe
          src={game.embedUrl}
          title={game.title}
          className="w-full h-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; gamepad; focus-without-user-activation *"
          sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
          allowFullScreen
        />
      );
    }

    if (game.customHtml) {
      return (
        <iframe
          srcDoc={game.customHtml}
          title={game.title}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          className="w-full h-full border-0 bg-black"
        />
      );
    }

    // Built-in native engines
    switch (game.id) {
      case 'football-bros':
        return <FootballBrosGame isMuted={isMuted} embedUrl={game.embedUrl} />;
      case 'poly-track':
        return <PolyTrackGame isMuted={isMuted} embedUrl={game.embedUrl} />;
      case 'drive-mad':
        return <DriveMadGame isMuted={isMuted} embedUrl={game.embedUrl} />;
      case 'retro-bowl':
        return <RetroBowlGame isMuted={isMuted} embedUrl={game.embedUrl} />;
      case 'gta-san-andreas':
        return <GtaSanAndreasGame isMuted={isMuted} embedUrl={game.embedUrl} />;
      case 'neon-drift':
        return <NeonDriftGame isMuted={isMuted} />;
      case 'nebula-strike':
        return <NebulaStrikeGame isMuted={isMuted} />;
      case 'gemstone-cascade':
        return <GemstoneCascadeGame isMuted={isMuted} />;
      case 'arcane-defenders':
        return <ArcaneDefendersGame isMuted={isMuted} />;
      default:
        return (
          <CustomEmbedGame
            embedUrl={game.embedUrl}
            customHtml={game.customHtml}
            title={game.title}
          />
        );
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-6">
      {/* Top Breadcrumb & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onBackToPortal();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Games</span>
          </button>

          <div className="hidden sm:block w-px h-6 bg-slate-800" />

          <div>
            <h1 className="text-base sm:text-lg font-black text-white leading-tight">
              {game.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-cyan-400 font-medium">{game.category}</span>
              <span aria-hidden="true">·</span>
              <span>By {game.author}</span>
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2">
          {game.embedUrl && (
            <div className="hidden sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setPlayMode('embed')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  playMode === 'embed'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Official Web Build
              </button>
              <button
                onClick={() => setPlayMode('native')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  playMode === 'native'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Arcade Canvas Mode
              </button>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Favorite Toggle */}
          <button
            onClick={() => {
              sound.playCoin();
              onToggleFavorite(game.id);
            }}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isFavorite
                ? 'bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-500/30'
                : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={isFavorite ? 'Saved in Favorites' : 'Add to Favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* Share Link */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Copy Game Link"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{shareCopied ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-cyan-500/30 cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Game Screen Viewport */}
      <div
        ref={playerContainerRef}
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[640px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center"
      >
        {renderGameContent()}
      </div>

      {/* Bottom Metadata & Controls Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Info & Controls Guide */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">About {game.title}</h2>
                <p className="text-xs text-slate-400">
                  Play free inside NexusPlay with zero downloads or redirects.
                </p>
              </div>

              {/* Star Rating System */}
              <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 mr-1">Rate:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (userRating !== null ? star <= userRating : star <= Math.round(game.rating))
                          ? 'text-amber-400 fill-current'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {game.description}
            </p>

            {/* Controls Box */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                <Keyboard className="w-4 h-4" />
                Game Controls
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {game.controls.map((ctrl, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs"
                  >
                    <span className="font-mono text-cyan-300 bg-slate-800 px-2 py-0.5 rounded font-bold">
                      {ctrl.key}
                    </span>
                    <span className="text-slate-300">{ctrl.action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap pt-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Tags:</span>
              {game.tags.map((t, idx) => (
                <span key={idx}>
                  {idx > 0 && <span className="mr-2" aria-hidden="true">·</span>}
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Comments & Community Tips */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Community Tips & High Scores
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Share a tip or celebrate your high score..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Post
              </button>
            </form>

            <div className="space-y-3 pt-2">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {rev.avatarSeed}
                      </div>
                      <span className="font-bold text-slate-200">{rev.username}</span>
                    </div>
                    <span className="text-slate-500">{rev.createdAt}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 pl-8">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: More Games You'll Love */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            More Games Like This
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {relatedGames.map((relGame) => (
              <div
                key={relGame.id}
                onClick={() => {
                  sound.playClick();
                  onSelectGame(relGame);
                }}
                className="group flex flex-col sm:flex-row items-center gap-3 p-2.5 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all cursor-pointer shadow hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="w-full sm:w-24 h-20 rounded-lg overflow-hidden bg-slate-950 shrink-0 relative">
                  <img
                    src={relGame.thumbnailUrl}
                    alt={relGame.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                    {relGame.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {relGame.tagline}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-amber-400 font-mono mt-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{relGame.rating.toFixed(1)}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">{relGame.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
