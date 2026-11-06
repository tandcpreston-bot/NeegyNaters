export type GameCategory = 
  | 'All'
  | 'Sports'
  | 'Action' 
  | 'Arcade' 
  | 'Puzzle' 
  | 'Racing' 
  | 'Strategy' 
  | 'Shooter' 
  | 'My Added Games' 
  | 'Favorites';

export interface ControlGuide {
  key: string;
  action: string;
}

export interface GameItem {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  instructions: string;
  category: 'Sports' | 'Action' | 'Arcade' | 'Puzzle' | 'Racing' | 'Strategy' | 'Shooter';
  tags: string[];
  thumbnailUrl: string;
  fallbackGradient: string;
  rating: number; // e.g. 4.8
  ratingCount: number;
  playCount: number;
  featured?: boolean;
  author: string;
  createdAt: string;
  isCustom?: boolean;
  gameType: 'built-in' | 'embed-url' | 'custom-code';
  builtInKey?: 
    | 'neon-drift'
    | 'nebula-strike'
    | 'gemstone-cascade'
    | 'arcane-defenders'
    | 'cyber-snake'
    | 'laser-brick'
    | 'chrono-2048'
    | 'gravity-flap';
  embedUrl?: string;
  customHtml?: string;
  controls: ControlGuide[];
}

export interface UserReview {
  id: string;
  gameId: string;
  username: string;
  avatarSeed: string;
  rating: number;
  comment: string;
  createdAt: string;
}
