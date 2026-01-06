import React from 'react';
import { Anime } from '../types';
import { Play, Info, Calendar, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroProps {
  anime: Anime;
}

const Hero: React.FC<HeroProps> = ({ anime }) => {
  const navigate = useNavigate();
  
  // High res image or fallback
  const bgImage = anime.images.webp.large_image_url || anime.images.jpg.large_image_url;

  return (
    <div className="relative w-full h-[65vh] md:h-[80vh] overflow-hidden group">
      {/* Background Image with animated scale effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10s] group-hover:scale-105"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/50 to-transparent" />
      </div>

      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 md:pb-24 z-10">
        <div className="max-w-3xl space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-primary/25">
                    #{anime.rank} Global Trending
                </span>
                <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                    {anime.type}
                </span>
            </div>
            
          <h1 className="text-4xl md:text-7xl font-black text-white leading-tight drop-shadow-2xl line-clamp-2 bg-clip-text">
            {anime.title_english || anime.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-200">
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-white">{anime.score}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                <Calendar className="w-4 h-4 text-accent" />
                <span>{anime.year || 'N/A'}</span>
            </div>
            <span className="text-slate-400">•</span>
            <span>{anime.episodes ? `${anime.episodes} Episodes` : 'Ongoing'}</span>
             <span className="text-slate-400">•</span>
            <span className="px-2 py-0.5 border border-slate-500 rounded text-xs text-slate-300">{anime.rating?.split(' ')[0] || 'PG-13'}</span>
          </div>

          <p className="text-slate-300 md:text-lg line-clamp-3 md:line-clamp-4 leading-relaxed max-w-2xl drop-shadow-md">
            {anime.synopsis}
          </p>

          <div className="flex items-center gap-4 pt-4">
            <button 
                onClick={() => navigate(`/watch/${anime.mal_id}`)}
                className="flex items-center gap-3 bg-primary hover:bg-violet-600 text-white px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/30"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Watch Now</span>
            </button>
            <button 
                onClick={() => navigate(`/anime/${anime.mal_id}`)}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold backdrop-blur-md border border-white/10 transition-all hover:border-white/30"
            >
              <Info className="w-5 h-5" />
              <span>More Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;