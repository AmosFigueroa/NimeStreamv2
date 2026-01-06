import React from 'react';
import { Anime } from '../types';
import { PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AnimeCardProps {
  anime: Anime;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="group relative cursor-pointer"
      onClick={() => navigate(`/anime/${anime.mal_id}`)}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-800">
        <img 
          src={anime.images.webp.large_image_url} 
          alt={anime.title} 
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <PlayCircle className="w-12 h-12 text-white opacity-90 scale-75 group-hover:scale-100 transition-transform duration-300" />
        </div>
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-white flex items-center gap-1">
            <span className="text-yellow-400">★</span> {anime.score || 'N/A'}
        </div>
        <div className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-white uppercase">
            {anime.type || 'TV'}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors">
          {anime.title_english || anime.title}
        </h3>
        <div className="flex items-center text-xs text-slate-400 space-x-2">
            <span>{anime.year || 'N/A'}</span>
            <span>•</span>
            <span className="truncate max-w-[100px]">{anime.genres?.[0]?.name || 'Anime'}</span>
        </div>
      </div>
    </div>
  );
};

export default AnimeCard;
