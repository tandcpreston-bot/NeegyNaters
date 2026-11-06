import React, { useState } from 'react';
import { GameItem } from '../types/game';
import {
  X,
  Plus,
  Link,
  Code2,
  Wand2,
  Check,
  Eye,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame: (newGame: GameItem) => void;
}

const PRESET_ARTWORKS = [
  { name: 'Neon Drift', url: '/src/assets/images/neon_drift_racer_1794005192149.jpg' },
  { name: 'Cosmic Nebula', url: '/src/assets/images/cosmic_defender_1794005193349.jpg' },
  { name: 'Gemstone Cascade', url: '/src/assets/images/gem_blitz_puzzle_1794005193740.jpg' },
  { name: 'Arcane Defenders', url: '/src/assets/images/crystal_bastion_defense_1794005193509.jpg' },
  { name: 'Football Bros', url: '/src/assets/images/football_bros_1794005382500.jpg' },
  { name: 'Poly Track', url: '/src/assets/images/poly_track_1794005381874.jpg' },
  { name: 'Drive Mad', url: '/src/assets/images/drive_mad_1794005382281.jpg' },
  { name: 'Retro Bowl', url: '/src/assets/images/retro_bowl_1794005384977.jpg' },
  { name: 'GTA San Andreas', url: '/src/assets/images/gta_san_andreas_1794005465025.jpg' },
];

const STARTER_HTML_TEMPLATES: Record<string, string> = {
  clicker: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin:0; background:#0b0f19; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; user-select:none; }
    #cookie { font-size:90px; cursor:pointer; transition:transform 0.1s; }
    #cookie:active { transform:scale(0.85); }
    h1 { font-size:42px; margin:10px 0; color:#38bdf8; }
    button { background:#38bdf8; border:none; padding:10px 20px; font-weight:bold; border-radius:10px; cursor:pointer; margin-top:15px; }
  </style>
</head>
<body>
  <div id="cookie">💎</div>
  <h1 id="score">0</h1>
  <p>Diamonds Mined</p>
  <button id="upgrade">Hire Miner (Cost: 20)</button>
  <script>
    let score = 0, miners = 0;
    const scoreEl = document.getElementById('score');
    document.getElementById('cookie').onclick = () => { score++; scoreEl.innerText = score; };
    document.getElementById('upgrade').onclick = () => {
      if (score >= 20) {
        score -= 20;
        miners++;
        scoreEl.innerText = score;
      }
    };
    setInterval(() => { if (miners > 0) { score += miners; scoreEl.innerText = score; } }, 1000);
  </script>
</body>
</html>`,
  pong: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin:0; background:#0f172a; display:flex; justify-content:center; align-items:center; height:100vh; overflow:hidden; }
    canvas { background:#020617; border:3px solid #38bdf8; border-radius:12px; }
  </style>
</head>
<body>
  <canvas id="c" width="600" height="400"></canvas>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    let pY = 160, bX = 300, bY = 200, bVx = 4, bVy = 3, score = 0;
    window.onmousemove = (e) => { const rect = c.getBoundingClientRect(); pY = e.clientY - rect.top - 40; };
    function loop() {
      bX += bVx; bY += bVy;
      if (bY <= 0 || bY >= 390) bVy = -bVy;
      if (bX >= 590) bVx = -Math.abs(bVx);
      if (bX <= 25 && bY >= pY && bY <= pY + 80) { bVx = Math.abs(bVx) * 1.05; score++; }
      if (bX < 0) { bX = 300; bY = 200; bVx = 4; score = 0; }
      ctx.fillStyle = '#020617'; ctx.fillRect(0,0,600,400);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(10, pY, 15, 80);
      ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(bX, bY, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 20px monospace'; ctx.fillText('SCORE: ' + score, 260, 40);
      requestAnimationFrame(loop);
    }
    loop();
  </script>
</body>
</html>`,
};

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  onClose,
  onAddGame,
}) => {
  const [tab, setTab] = useState<'url' | 'code' | 'template'>('url');

  // Form Fields
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<'Sports' | 'Action' | 'Arcade' | 'Puzzle' | 'Racing' | 'Strategy' | 'Shooter'>('Sports');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [customHtml, setCustomHtml] = useState(STARTER_HTML_TEMPLATES.clicker);
  const [thumbnailUrl, setThumbnailUrl] = useState(PRESET_ARTWORKS[0].url);
  const [controlsList, setControlsList] = useState<{ key: string; action: string }[]>([
    { key: 'Mouse / Touch', action: 'Interact & Play' },
  ]);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const handleAddControl = () => {
    setControlsList([...controlsList, { key: '', action: '' }]);
  };

  const handleUpdateControl = (idx: number, field: 'key' | 'action', val: string) => {
    const next = [...controlsList];
    next[idx][field] = val;
    setControlsList(next);
  };

  const handleRemoveControl = (idx: number) => {
    setControlsList(controlsList.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    sound.playCoin();

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newGame: GameItem = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      slug,
      tagline: tagline.trim() || 'Custom Added Web Game',
      description: description.trim() || 'A game added by the user to play right on NexusPlay.',
      instructions: 'Enjoy playing this game directly in the browser!',
      category,
      tags: ['Custom', category, 'Community'],
      thumbnailUrl,
      fallbackGradient: 'from-cyan-600 to-indigo-800',
      rating: 5.0,
      ratingCount: 1,
      playCount: 1,
      author: author.trim() || 'You',
      createdAt: new Date().toISOString().split('T')[0],
      isCustom: true,
      gameType: tab === 'code' || tab === 'template' ? 'custom-code' : 'embed-url',
      embedUrl: tab === 'url' ? embedUrl.trim() : undefined,
      customHtml: tab === 'code' || tab === 'template' ? customHtml : undefined,
      controls: controlsList.filter((c) => c.key.trim() && c.action.trim()),
    };

    onAddGame(newGame);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Your Game</h2>
              <p className="text-xs text-slate-400">
                Choose any game to play inside NexusPlay without leaving the website
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/60 border-b border-slate-800/80 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'url'
                ? 'bg-slate-800 text-cyan-400 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>Embed URL</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('code')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'code'
                ? 'bg-slate-800 text-cyan-400 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>HTML5 Game Code</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('template');
              setCustomHtml(STARTER_HTML_TEMPLATES.clicker);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'template'
                ? 'bg-slate-800 text-cyan-400 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Game Generator Template</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* URL Input */}
          {tab === 'url' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Web Game Embed URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/game/index.html (e.g. itch.io, GitHub Pages, Web game)"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  required={tab === 'url'}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {embedUrl && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Must support embedding in an iframe without redirecting outside.
              </p>
            </div>
          )}

          {/* Code Editor */}
          {tab === 'code' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Custom HTML5 / Canvas Game Code
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1 text-cyan-400 text-xs font-semibold cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showPreview ? 'Hide Preview' : 'Live Test Preview'}
                </button>
              </div>
              <textarea
                rows={6}
                value={customHtml}
                onChange={(e) => setCustomHtml(e.target.value)}
                required={tab === 'code'}
                placeholder="<!DOCTYPE html><html><body><canvas id='c'></canvas><script>...</script></body></html>"
                className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Template Selector */}
          {tab === 'template' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Choose Starter Arcade Template
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCustomHtml(STARTER_HTML_TEMPLATES.clicker);
                    setTitle('Diamond Tycoon Miner');
                    setCategory('Arcade');
                  }}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-cyan-500 rounded-xl text-left cursor-pointer transition-colors"
                >
                  <div className="text-xs font-bold text-white mb-0.5">💎 Diamond Clicker</div>
                  <div className="text-[11px] text-slate-400">Idle upgrade clicker game</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomHtml(STARTER_HTML_TEMPLATES.pong);
                    setTitle('Neon Cyber Pong');
                    setCategory('Arcade');
                  }}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-cyan-500 rounded-xl text-left cursor-pointer transition-colors"
                >
                  <div className="text-xs font-bold text-white mb-0.5">🏓 Cyber Paddle Pong</div>
                  <div className="text-[11px] text-slate-400">Physics mouse paddle game</div>
                </button>
              </div>
            </div>
          )}

          {/* Live Preview Box */}
          {showPreview && (
            <div className="space-y-1.5 border border-cyan-500/30 rounded-2xl p-3 bg-slate-950">
              <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Live In-Website Sandbox Test
              </div>
              <div className="w-full h-48 bg-black rounded-xl overflow-hidden border border-slate-800">
                {tab === 'url' ? (
                  <iframe
                    src={embedUrl}
                    title="Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <iframe
                    srcDoc={customHtml}
                    title="Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
              </div>
            </div>
          )}

          {/* Title & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Game Title</label>
              <input
                type="text"
                placeholder="e.g. Speed Runner 2D"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Sports">Sports</option>
                <option value="Action">Action</option>
                <option value="Arcade">Arcade</option>
                <option value="Puzzle">Puzzle</option>
                <option value="Racing">Racing</option>
                <option value="Strategy">Strategy</option>
                <option value="Shooter">Shooter</option>
              </select>
            </div>
          </div>

          {/* Tagline & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Short Catchphrase / Tagline</label>
              <input
                type="text"
                placeholder="e.g. Dodge spikes and leap to glory"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Creator / Author Name</label>
              <input
                type="text"
                placeholder="e.g. Player1 / Indie Studio"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Description</label>
            <textarea
              rows={2}
              placeholder="Tell players what this game is about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Thumbnail Artwork Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Pick Game Cover Thumbnail
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PRESET_ARTWORKS.map((art) => (
                <button
                  type="button"
                  key={art.name}
                  onClick={() => setThumbnailUrl(art.url)}
                  className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer ${
                    thumbnailUrl === art.url
                      ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-105'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <img src={art.url} alt={art.name} className="w-full h-full object-cover" />
                  {thumbnailUrl === art.url && (
                    <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Controls Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Controls Guide</label>
              <button
                type="button"
                onClick={handleAddControl}
                className="text-xs text-cyan-400 font-semibold hover:underline cursor-pointer"
              >
                + Add Key Hint
              </button>
            </div>
            <div className="space-y-2">
              {controlsList.map((ctrl, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Key (e.g. WASD / Space)"
                    value={ctrl.key}
                    onChange={(e) => handleUpdateControl(idx, 'key', e.target.value)}
                    className="w-1/3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Action (e.g. Move / Jump)"
                    value={ctrl.action}
                    onChange={(e) => handleUpdateControl(idx, 'action', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  {controlsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveControl(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Game to Portal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
