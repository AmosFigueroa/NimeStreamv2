import React, { useEffect, useState } from 'react';
import { getSeasonNow, getTopAnime } from '../services/animeService';
import { Anime } from '../types';
import Hero from '../components/Hero';
import AnimeCard from '../components/AnimeCard';
import { Loader2 } from 'lucide-react';

const Home: React.FC = () => {
  const [topAnime, setTopAnime] = useState<Anime[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topRes, seasonRes] = await Promise.all([
          getTopAnime(1),
          getSeasonNow(1)
        ]);
        setTopAnime(topRes.data);
        setSeasonalAnime(seasonRes.data);
      } catch (error) {
        console.error("Error fetching home data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-dark">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const featuredAnime = topAnime[0];

  return (
    <div className="min-h-screen pb-20">
      {featuredAnime && <Hero anime={featuredAnime} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        
        {/* Trending Section */}
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white border-l-4 border-primary pl-4">Trending Now</h2>
                <button className="text-sm text-primary hover:text-white transition-colors">View All</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {topAnime.slice(0, 10).map((anime) => (
                    <AnimeCard key={anime.mal_id} anime={anime} />
                ))}
            </div>
        </div>

        {/* Seasonal Section */}
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white border-l-4 border-accent pl-4">This Season</h2>
                <button className="text-sm text-accent hover:text-white transition-colors">View All</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {seasonalAnime.slice(0, 10).map((anime) => (
                    <AnimeCard key={anime.mal_id} anime={anime} />
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Home;
