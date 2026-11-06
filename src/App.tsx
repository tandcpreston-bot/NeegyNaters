import React, { useState, useEffect, useMemo } from 'react';
import { GameCategory, GameItem } from './types/game';
import { INITIAL_GAMES } from './data/initialGames';
import { GameCard } from './components/GameCard';
import { GameTheater } from './components/GameTheater';
import { AddGameModal } from './components/AddGameModal';
import { sound } from './utils/audio';
import {
  Gamepad2,
  Search,
  Plus,
  Flame,
  Sparkles,
  Shuffle,
  Heart,
  Grid,
  Trophy,
  Compass,
  Share2,
  Check,
  Globe,
  X,
} from 'lucide-react';

export default function App() {
  // Games Library state (Built-in + Custom User Added)
  const [games, setGames] = useState<GameItem[]>(() => {
    const saved = localStorage.getItem('nexus_custom_games');
    if (saved) {
      try {
        const custom: GameItem[] = JSON.parse(saved);
        // Merge custom with initial
        return [...custom, ...INITIAL_GAMES];
      } catch {
        return INITIAL_GAMES;
      }
    }
    return INITIAL_GAMES;
  });

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus_favorites');
    return saved ? JSON.parse(saved) : ['football-bros', 'poly-track', 'drive-mad', 'retro-bowl', 'gta-san-andreas'];
  });

  // Current active game in theater mode (null = browsing grid)
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedWebsiteLink, setCopiedWebsiteLink] = useState(false);

  const websitePublicUrl = 'https://ais-pre-f4nvlqalouj6kuddtkqtgz-77140439631.us-east1.run.app';

  const handleCopyWebsiteLink = () => {
    sound.playCoin();
    navigator.clipboard.writeText(websitePublicUrl).then(() => {
      setCopiedWebsiteLink(true);
      setTimeout(() => setCopiedWebsiteLink(false), 2500);
    });
  };

  // Categories list
  const categories: GameCategory[] = [
    'All',
    'Sports',
    'Racing',
    'Action',
    'Shooter',
    'Puzzle',
    'Strategy',
    'My Added Games',
    'Favorites',
  ];

  // URL query param handling (e.g. ?game=football-bros)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameSlug = params.get('game');
    if (gameSlug) {
      const match = games.find((g) => g.slug === gameSlug || g.id === gameSlug);
      if (match) {
        setActiveGame(match);
      }
    }
  }, []);

  // Sync favorites to localStorage
  const handleToggleFavorite = (gameId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playCoin();
    setFavorites((prev) => {
      const next = prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId];
      localStorage.setItem('nexus_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Add custom game
  const handleAddGame = (newGame: GameItem) => {
    const updated = [newGame, ...games];
    setGames(updated);
    // Extract only custom ones to store in localStorage
    const customOnly = updated.filter((g) => g.isCustom);
    localStorage.setItem('nexus_custom_games', JSON.stringify(customOnly));
    // Immediately open the newly added game in theater!
    setActiveGame(newGame);
  };

  // Surprise Me / Random Game
  const handleRandomGame = () => {
    sound.playPowerup();
    const randomIndex = Math.floor(Math.random() * games.length);
    setActiveGame(games[randomIndex]);
  };

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // Search matching
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        game.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategory === 'All') return true;
      if (selectedCategory === 'Favorites') return favorites.includes(game.id);
      if (selectedCategory === 'My Added Games') return !!game.isCustom;
      return game.category === selectedCategory;
    });
  }, [games, selectedCategory, searchQuery, favorites]);

  // Featured banner games
  const featuredGames = useMemo(() => {
    return games.filter((g) => g.featured).slice(0, 4);
  }, [games]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Bar Contract: 1-line Brand, 4-5 single-line nav links, 1 primary action */}
      <header className="sticky top-0 z-40 bg-[#0d1117]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <button
          onClick={() => {
            sound.playClick();
            setActiveGame(null);
            setSelectedCategory('All');
          }}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-black font-display tracking-tight text-white group-hover:text-cyan-400 transition-colors">
            Nexus<span className="text-cyan-400">Play</span>
          </span>
        </button>

        {/* Zone 2: 4-5 single-line clean nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-400">
          <button
            onClick={() => {
              setActiveGame(null);
              setSelectedCategory('All');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'All' && !activeGame ? 'text-cyan-400' : 'hover:text-white'
            }`}
          >
            Popular
          </button>
          <button
            onClick={() => {
              setActiveGame(null);
              setSelectedCategory('Sports');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'Sports' ? 'text-cyan-400' : 'hover:text-white'
            }`}
          >
            Sports & Bros
          </button>
          <button
            onClick={() => {
              setActiveGame(null);
              setSelectedCategory('Racing');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'Racing' ? 'text-cyan-400' : 'hover:text-white'
            }`}
          >
            Racing & Stunts
          </button>
          <button
            onClick={() => {
              setActiveGame(null);
              setSelectedCategory('Action');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'Action' ? 'text-cyan-400' : 'hover:text-white'
            }`}
          >
            Action & Open World
          </button>
          <button
            onClick={() => {
              setActiveGame(null);
              setSelectedCategory('Favorites');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'Favorites' ? 'text-cyan-400' : 'hover:text-white'
            }`}
          >
            Favorites ({favorites.length})
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setIsShareModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-cyan-500/30 shadow-sm"
            title="Share website link with friends"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Share Site</span>
          </button>

          <button
            onClick={handleRandomGame}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-700/60"
            title="Play a random game"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span>Surprise Me</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-cyan-500/25 transition-transform hover:scale-105 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Game</span>
          </button>
        </div>
      </header>

      {/* Top Public Website URL Banner */}
      <div className="bg-slate-900/80 border-b border-slate-800/60 px-4 sm:px-8 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">Live Public Web Address:</span>
          <a
            href={websitePublicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-cyan-400 hover:underline font-semibold"
          >
            {websitePublicUrl}
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyWebsiteLink}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold cursor-pointer bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
          >
            {copiedWebsiteLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy URL</span>
              </>
            )}
          </button>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="text-amber-400 hover:underline font-semibold cursor-pointer hidden sm:inline"
          >
            How to Post on Google →
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {/* If Active Game is selected, show In-Website Game Theater! */}
        {activeGame ? (
          <GameTheater
            game={activeGame}
            allGames={games}
            isFavorite={favorites.includes(activeGame.id)}
            onBackToPortal={() => setActiveGame(null)}
            onSelectGame={(g) => setActiveGame(g)}
            onToggleFavorite={(id) => handleToggleFavorite(id)}
          />
        ) : (
          /* Gaming Portal Home View */
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
            {/* Search & Category Filter Strip */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Football Bros, Poly Track, Drive Mad, Retro Bowl, GTA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-400 shadow-xl focus:outline-none transition-colors"
                />
              </div>

              {/* Category Segmented Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        sound.playClick();
                        setSelectedCategory(cat);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {cat === 'Favorites' && <Heart className="w-3.5 h-3.5 inline mr-1.5 fill-current text-rose-500" />}
                      {cat === 'My Added Games' && <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-amber-400" />}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Featured Hot Games Bento Carousel (Shown when no search query and on 'All') */}
            {!searchQuery && selectedCategory === 'All' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-rose-500 fill-current" />
                    <h2 className="text-lg sm:text-xl font-black font-display text-white">
                      Top Featured Hits
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">Play instantly in 1-click</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredGames.map((game) => (
                    <div
                      key={game.id}
                      onClick={() => {
                        sound.playClick();
                        setActiveGame(game);
                      }}
                      className="group relative h-60 rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-400 shadow-xl cursor-pointer transition-all transform hover:-translate-y-1"
                    >
                      <img
                        src={game.thumbnailUrl}
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-4">
                        <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                          {game.category}
                        </span>
                        <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                          {game.title}
                        </h3>
                        <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                          {game.tagline}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Main Games Grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg sm:text-xl font-black font-display text-white">
                    {selectedCategory === 'All' ? 'All Games' : selectedCategory} ({filteredGames.length})
                  </h2>
                </div>
                {selectedCategory === 'My Added Games' && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-xs text-cyan-400 hover:underline font-semibold cursor-pointer"
                  >
                    + Add Another Game
                  </button>
                )}
              </div>

              {filteredGames.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      isFavorite={favorites.includes(game.id)}
                      onSelectGame={(g) => setActiveGame(g)}
                      onToggleFavorite={(id, e) => handleToggleFavorite(id, e)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3">
                  <Compass className="w-12 h-12 text-slate-500 mx-auto" />
                  <h3 className="text-lg font-bold text-white">No games found</h3>
                  <p className="text-xs text-slate-400">
                    {selectedCategory === 'My Added Games'
                      ? 'You have not added any custom games yet. Click "Add Game" above to add your favorite titles!'
                      : 'Try searching for something else or reset your filter.'}
                  </p>
                  <button
                    onClick={() => {
                      if (selectedCategory === 'My Added Games') {
                        setIsAddModalOpen(true);
                      } else {
                        setSelectedCategory('All');
                        setSearchQuery('');
                      }
                    }}
                    className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg"
                  >
                    {selectedCategory === 'My Added Games' ? 'Add a Game Now' : 'Browse All Games'}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddGame={handleAddGame}
      />

      {/* Share Website Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Share Your Website</h3>
                  <p className="text-xs text-slate-400">
                    Anyone can open this link on phone, tablet, or PC to play!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Public Website Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={websitePublicUrl}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-cyan-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyWebsiteLink}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-95 whitespace-nowrap"
                >
                  {copiedWebsiteLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2.5 text-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="w-4 h-4" />
                How Others Can Access:
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                <li>Works on any device: iPhone, Android, Chromebook, Mac, and Windows PC.</li>
                <li>No sign-up or downloads required; all games launch directly in browser.</li>
                <li>Direct game links work: send <code className="text-cyan-300">?game=football-bros</code> or <code className="text-cyan-300">?game=drive-mad</code> to open straight into a game.</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/30 space-y-2 text-xs">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                How to Post & Search on Google:
              </div>
              <p className="text-slate-300">
                Your site is already configured with <code className="text-amber-300 font-mono">robots.txt</code>, <code className="text-amber-300 font-mono">sitemap.xml</code>, and Google Schema.org tags so Googlebot crawls it automatically.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={`https://search.google.com/search-console`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  Submit to Google Search Console ↗
                </a>
                <a
                  href={`https://www.google.com/search?q=site:${websitePublicUrl.replace('https://', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  Check Google Index ↗
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
