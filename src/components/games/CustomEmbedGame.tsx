import React, { useState } from 'react';
import { Play, AlertCircle, RefreshCw } from 'lucide-react';

interface CustomEmbedGameProps {
  embedUrl?: string;
  customHtml?: string;
  title: string;
}

export const CustomEmbedGame: React.FC<CustomEmbedGameProps> = ({
  embedUrl,
  customHtml,
  title,
}) => {
  const [loadError, setLoadError] = useState(false);
  const [key, setKey] = useState(0);

  const handleReload = () => {
    setLoadError(false);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 font-display select-none">
      {customHtml ? (
        <iframe
          key={key}
          srcDoc={customHtml}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          className="w-full h-full border-0 rounded-lg shadow-2xl bg-black"
        />
      ) : embedUrl ? (
        <iframe
          key={key}
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; gamepad"
          allowFullScreen
          onError={() => setLoadError(true)}
          className="w-full h-full border-0 rounded-lg shadow-2xl bg-black"
        />
      ) : (
        <div className="text-center p-8 text-slate-400">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Game Source Provided</h3>
          <p className="text-xs">Please provide an embed URL or HTML5 game code.</p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Embed Loading Blocked</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            The external host prevented embedding directly in an iframe. You can try refreshing or running the built-in game engine!
          </p>
          <button
            onClick={handleReload}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            RELOAD EMBED
          </button>
        </div>
      )}
    </div>
  );
};
