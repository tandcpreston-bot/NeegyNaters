import React from 'react';
import { GameItem } from '../types/game';
import { Play, Star, Heart, Flame } from 'lucide-react';
import { sound } from '../utils/audio';

interface GameCardProps {
  game: GameItem;
  isFavorite: boolean;
  onSelectGame: (game: GameItem) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  layout?: 'standard' | 'featured' | 'compact';
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isFavorite,
  onSelectGame,
  onToggleFavorite,
  layout = 'standard',
}) => {
  const handleClick = () => {
    sound.playClick();
    onSelectGame(game);
  };

  const isFeatured = layout === 'featured';

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className={`group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 shadow-md hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer flex flex-col ${
        isFeatured ? 'col-span-1 md:col-span-2 row-span-2' : ''
      }`}
    >
      {/* Thumbnail Aspect Container */}
      <div
        className={`relative w-full overflow-hidden bg-slate-950 ${
          isFeatured ? 'h-64 md:h-80' : 'h-44 sm:h-48'
        }`}
      >
        <img
          src={game.thumbnailUrl}
          alt={game.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
          onError={(e) => {
            // Gradient fallback if image ever fails
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />

        {/* Fallback colored gradient backing if image fails */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${game.fallbackGradient} -z-10 flex items-center justify-center p-4`}
        >
          <span className="text-white font-black text-xl text-center drop-shadow">
            {game.title}
          </span>
        </div>

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {game.isCustom ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow">
              My Added Game
            </span>
          ) : game.featured ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider shadow">
              <Flame className="w-3 h-3 fill-current" />
              HOT
            </span>
          ) : (
            <div />
          )}

          {/* Favorite Heart Button */}
          <button
            onClick={(e) => onToggleFavorite(game.id, e)}
            className={`pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-90 cursor-pointer ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40'
                : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-950/80'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Hover Dark Overlay with Big Play Icon */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px]">
          <div className="w-14 h-14 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-400/40 transform scale-75 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Category Tag pill */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md text-[11px] font-semibold text-cyan-300 border border-slate-700/50">
            {game.category}
          </span>
        </div>
      </div>

      {/* Card Info Content */}
      <div className="p-3.5 flex flex-col justify-between flex-1 bg-slate-900">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
            {game.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
            {game.tagline}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-1 text-amber-400 font-semibold font-mono">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{game.rating.toFixed(1)}</span>
          </div>

          <div className="font-mono text-[11px] text-slate-400">
            {(game.playCount / 1000).toFixed(0)}k plays
          </div>
        </div>
      </div>
    </div>
  );
};
