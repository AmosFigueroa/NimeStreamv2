import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnimeById, getAnimeEpisodes, getStreamUrl } from '../services/animeService';
import { Anime, Episode, StreamingServer } from '../types';
import { Loader2, Server, ExternalLink, Play, AlertTriangle, ChevronLeft, Tv, Maximize, Film } from 'lucide-react';

const Watch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Player State
  const [currentServer, setCurrentServer] = useState<StreamingServer>(StreamingServer.TRAILER);
  const [selectedEp, setSelectedEp] = useState<number>(1);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [loadingStream, setLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const animeData = await getAnimeById(parseInt(id));
        setAnime(animeData.data);
        
        // Fetch episodes
        setTimeout(async () => {
            try {
                const episodesData = await getAnimeEpisodes(parseInt(id));
                setEpisodes(episodesData.data);
            } catch (e) {
                console.warn("Failed to fetch episodes list", e);
            } finally {
                setLoading(false);
            }
        }, 500);

      } catch (error) {
        console.error("Error fetching watch data", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Fetch Stream when Server or Episode changes
  useEffect(() => {
    const fetchStream = async () => {
      if (!anime) return;

      // Handle Trailer Mode
      if (currentServer === StreamingServer.TRAILER) {
        setStreamUrl(anime.trailer?.embed_url ? `${anime.trailer.embed_url}?autoplay=1&mute=0` : '');
        setStreamError(anime.trailer?.embed_url ? null : 'No Official Trailer Available');
        return;
      }

      setLoadingStream(true);
      setStreamError(null);
      setStreamUrl('');

      try {
        // Use English title for better search results, fallback to standard title
        const searchTitle = anime.title_english || anime.title;
        const result = await getStreamUrl(currentServer, searchTitle, selectedEp);
        
        if (result.success && result.url) {
          setStreamUrl(result.url);
        } else {
          setStreamError(result.message || 'Stream not found');
        }
      } catch (e) {
        console.error(e);
        setStreamError('Connection Error');
      } finally {
        setLoadingStream(false);
      }
    };

    if (!loading && anime) {
      fetchStream();
    }
  }, [currentServer, selectedEp, anime, loading]);

  const handleServerChange = (server: StreamingServer) => {
    setCurrentServer(server);
  };

  const getFallbackUrl = () => {
      const encodedTitle = encodeURIComponent(anime?.title || '');
      if (currentServer.includes('Kurama')) return `https://v9.kuramanime.tel/anime?search=${encodedTitle}`;
      if (currentServer.includes('Samehadaku')) return `https://samehadaku.care/?s=${encodedTitle}`;
      if (currentServer.includes('MovieBox')) return `https://moviebox.ph/search?q=${encodedTitle}`;
      return `https://google.com/search?q=watch ${encodedTitle}`;
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-dark text-primary">
        <Loader2 className="w-10 h-10 animate-spin" />
    </div>
  );

  if (!anime) return null;

  return (
    <div className={`min-h-screen pt-16 bg-dark text-slate-200 transition-colors duration-500 ${theaterMode ? 'bg-black' : ''}`}>
      
      {/* Back Button */}
      <div className={`max-w-7xl mx-auto px-4 py-4 ${theaterMode ? 'opacity-0 hover:opacity-100 transition-opacity' : ''}`}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to Details
        </button>
      </div>

      {/* Player Container */}
      <div className={`w-full transition-all duration-500 ${theaterMode ? 'h-[85vh]' : 'bg-black shadow-2xl z-20'}`}>
        <div className={`${theaterMode ? 'h-full w-full' : 'max-w-6xl mx-auto'}`}>
            <div className={`relative w-full bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800/50 ${theaterMode ? 'h-full' : 'aspect-video rounded-xl'}`}>
                
                {/* Loading State */}
                {loadingStream && (
                  <div className="absolute inset-0 z-30 bg-slate-900 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="animate-pulse text-slate-300">Scraping data from {currentServer.split(' ')[0]}...</p>
                    <p className="text-xs text-slate-500 mt-2">This usually takes 2-5 seconds</p>
                  </div>
                )}

                {/* Video Player */}
                {!loadingStream && !streamError && streamUrl ? (
                    <iframe 
                        src={streamUrl}
                        title="Anime Player"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : null}

                {/* Error / Fallback */}
                {!loadingStream && (streamError || (!streamUrl && !loadingStream)) && (
                   <div className="text-center text-slate-400 max-w-lg p-6 flex flex-col items-center z-10">
                        <AlertTriangle className="w-16 h-16 mb-4 text-amber-500 opacity-80" />
                        <h3 className="text-xl font-bold text-white mb-2">Stream Unavailable</h3>
                        <p className="mb-6 text-sm">
                            {streamError || "Could not extract video source."}
                        </p>
                        
                        {currentServer !== StreamingServer.TRAILER && (
                             <div className="flex flex-col gap-3 w-full bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <p className="text-xs text-slate-400">
                                   Since this is a scraper, sometimes the automated search fails to find the exact video URL on the target site.
                                </p>
                                <a 
                                    href={getFallbackUrl()}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="bg-primary hover:bg-violet-600 text-white px-6 py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 w-full"
                                >
                                    Open {currentServer.split(' ')[0]} Directly <ExternalLink className="w-4 h-4" />
                                </a>
                             </div>
                        )}
                   </div>
                )}
            </div>
        </div>
      </div>

      {/* Theater Controls */}
      <div className="max-w-6xl mx-auto px-4 py-2 flex justify-end">
        <button 
            onClick={() => setTheaterMode(!theaterMode)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors"
        >
            {theaterMode ? <Maximize className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
            {theaterMode ? 'Exit Theater' : 'Theater Mode'}
        </button>
      </div>

      {/* Controls & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content Info */}
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {anime.title_english || anime.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="text-primary font-bold text-lg bg-primary/10 px-3 py-1 rounded">Episode {selectedEp}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">{anime.type}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">{anime.status}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">{anime.rating?.split(' ')[0]}</span>
                    </div>
                </div>

                {/* Server Selection */}
                <div className="bg-surface p-5 rounded-2xl border border-slate-800/60">
                    <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm uppercase font-bold tracking-wider">
                        <Server className="w-4 h-4" /> Select Source
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.values(StreamingServer).map((server) => {
                            const isSelected = currentServer === server;
                            const isTrailer = server === StreamingServer.TRAILER;
                            
                            return (
                                <button
                                    key={server}
                                    onClick={() => handleServerChange(server)}
                                    className={`relative px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border flex flex-col items-center justify-center gap-1 ${
                                        isSelected 
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105 z-10' 
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-500 hover:text-white'
                                    }`}
                                >
                                    {isTrailer ? <Film className="w-5 h-5 mb-1" /> : <Server className="w-5 h-5 mb-1" />}
                                    <span>{server.includes('Scrape') ? server.split(' ')[0] : 'Trailer'}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-3 text-xs text-slate-500 text-center">
                        *Sources are scraped from 3rd party sites. Availability may vary.
                    </p>
                </div>

                <div className="bg-surface p-6 rounded-2xl border border-slate-800/60">
                    <h3 className="font-bold text-white mb-3 text-lg">Synopsis</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">
                        {anime.synopsis}
                    </p>
                </div>
            </div>

            {/* Episode List */}
            <div className="lg:col-span-1">
                <div className="bg-surface rounded-2xl border border-slate-800/60 overflow-hidden sticky top-24 h-[600px] flex flex-col">
                    <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center backdrop-blur-sm">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Tv className="w-4 h-4 text-primary" /> Episodes
                        </h3>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">
                            {episodes.length > 0 ? episodes.length : '?'} Eps
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {episodes.map((ep) => (
                            <button
                                key={ep.mal_id}
                                onClick={() => setSelectedEp(ep.mal_id)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all group border text-left ${
                                    selectedEp === ep.mal_id 
                                    ? 'bg-primary/10 border-primary/50 text-primary' 
                                    : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className={`text-xs font-bold ${selectedEp === ep.mal_id ? 'text-primary' : 'text-slate-500'}`}>
                                        EPISODE {ep.mal_id}
                                    </span>
                                    <span className="text-sm font-medium truncate max-w-[180px]">
                                        {ep.title || `Episode ${ep.mal_id}`}
                                    </span>
                                </div>
                                <Play className={`w-3 h-3 ${selectedEp === ep.mal_id ? 'fill-current' : 'opacity-0 group-hover:opacity-100'}`} />
                            </button>
                        ))}
                        {episodes.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm">Loading episodes...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Watch;