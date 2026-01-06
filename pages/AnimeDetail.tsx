import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnimeById, getAnimeEpisodes } from '../services/animeService';
import { Anime, Episode } from '../types';
import { Loader2, Play, Calendar, Star, Clock, Users, Tag } from 'lucide-react';

const AnimeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const animeData = await getAnimeById(parseInt(id));
        setAnime(animeData.data);
        
        // Slight delay to prevent rate limit
        setTimeout(async () => {
            const episodesData = await getAnimeEpisodes(parseInt(id));
            setEpisodes(episodesData.data);
            setLoading(false);
        }, 500);

      } catch (error) {
        console.error("Error fetching details", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center text-primary">
        <Loader2 className="w-10 h-10 animate-spin" />
    </div>
  );

  if (!anime) return <div className="text-center text-white pt-20">Anime not found</div>;

  return (
    <div className="min-h-screen pt-16 bg-dark">
      {/* Banner */}
      <div className="h-64 md:h-96 w-full relative">
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm"
            style={{ backgroundImage: `url(${anime.images.webp.large_image_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-20">
        <div className="flex flex-col md:flex-row gap-8">
            
            {/* Poster & Actions */}
            <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4">
                <img 
                    src={anime.images.webp.large_image_url} 
                    alt={anime.title} 
                    className="w-full rounded-xl shadow-2xl border-4 border-slate-800"
                />
                <button 
                    onClick={() => navigate(`/watch/${anime.mal_id}`)}
                    className="w-full py-4 bg-primary hover:bg-violet-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all"
                >
                    <Play className="w-6 h-6 fill-current" /> Watch Now
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 text-white">
                <h1 className="text-4xl md:text-5xl font-black mb-2">{anime.title_english || anime.title}</h1>
                <h2 className="text-xl text-slate-400 mb-6 italic">{anime.title_japanese}</h2>

                <div className="flex flex-wrap gap-4 mb-8 text-sm">
                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="font-bold">{anime.score}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{anime.year}</span>
                    </div>
                     <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{anime.duration}</span>
                    </div>
                     <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{anime.members.toLocaleString()} members</span>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-bold mb-2 text-slate-200">Synopsis</h3>
                    <p className="text-slate-300 leading-relaxed text-justify">{anime.synopsis}</p>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3 text-slate-200">Genres</h3>
                    <div className="flex flex-wrap gap-2">
                        {anime.genres.map(g => (
                            <span key={g.mal_id} className="flex items-center gap-1 text-sm bg-slate-800/50 border border-slate-700 hover:border-primary px-3 py-1 rounded-full transition-colors cursor-pointer">
                                <Tag className="w-3 h-3" /> {g.name}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Episodes List Preview */}
                <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Episodes</h3>
                        <span className="text-sm text-slate-400">{anime.episodes || '?'} Episodes</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {episodes.map((ep) => (
                             <div 
                                key={ep.mal_id}
                                onClick={() => navigate(`/watch/${anime.mal_id}`)}
                                className="flex items-center justify-between p-3 bg-slate-900/50 hover:bg-primary/20 rounded-lg cursor-pointer transition-colors group"
                             >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="text-slate-500 font-mono text-sm group-hover:text-primary">#{ep.mal_id}</span>
                                    <span className="truncate text-sm font-medium">{ep.title || `Episode ${ep.mal_id}`}</span>
                                </div>
                                <Play className="w-4 h-4 text-slate-600 group-hover:text-primary" />
                             </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetail;
