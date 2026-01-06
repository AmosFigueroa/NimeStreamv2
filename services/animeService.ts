import { JikanResponse, Anime, Episode, StreamingServer } from '../types';

const BASE_URL = 'https://api.jikan.moe/v4';
// Local backend still used for scraped sites (Kurama, etc) if running
const BACKEND_URL = 'http://localhost:5000/api/stream';

// List of public Invidious instances (Youtube Proxies) that support CORS
// We rotate or try them to find videos without an API Key
const INVIDIOUS_INSTANCES = [
  'https://invidious.projectsegfau.lt',
  'https://inv.tux.pizza',
  'https://vid.ufficio.eu.org',
  'https://invidious.jing.rocks'
];

const OFFICIAL_CHANNELS = [
    'Muse Indonesia', 
    'Ani-One Indonesia', 
    'Tropics Anime Asia', 
    'Ani-One Asia', 
    'Gundaminfo', 
    'Bilibili',
    'Netflix Indonesia'
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getTopAnime = async (page = 1): Promise<JikanResponse<Anime[]>> => {
  await delay(300);
  const response = await fetch(`${BASE_URL}/top/anime?page=${page}&filter=bypopularity`);
  if (!response.ok) throw new Error('Failed to fetch top anime');
  return response.json();
};

export const getSeasonNow = async (page = 1): Promise<JikanResponse<Anime[]>> => {
  await delay(300);
  const response = await fetch(`${BASE_URL}/seasons/now?page=${page}`);
  if (!response.ok) throw new Error('Failed to fetch seasonal anime');
  return response.json();
};

export const searchAnime = async (query: string, page = 1): Promise<JikanResponse<Anime[]>> => {
  await delay(300);
  const response = await fetch(`${BASE_URL}/anime?q=${query}&page=${page}&sfw`);
  if (!response.ok) throw new Error('Failed to search anime');
  return response.json();
};

export const getAnimeById = async (id: number): Promise<{ data: Anime }> => {
  await delay(300);
  const response = await fetch(`${BASE_URL}/anime/${id}`);
  if (!response.ok) throw new Error('Failed to fetch anime details');
  return response.json();
};

export const getAnimeEpisodes = async (id: number, page = 1): Promise<JikanResponse<Episode[]>> => {
  await delay(300);
  const response = await fetch(`${BASE_URL}/anime/${id}/episodes?page=${page}`);
  if (!response.ok) throw new Error('Failed to fetch episodes');
  return response.json();
};

// --- CLIENT-SIDE YOUTUBE SEARCH LOGIC (No Backend Required) ---

const searchYoutubeClientSide = async (
    titles: { default: string, en: string, jp: string }, 
    episode: number
): Promise<{ success: boolean; url: string; message?: string }> => {
    
    // 1. Construct Queries
    const queries = [];
    
    // Query Priority 1: English Title + Channel + Sub Indo
    if (titles.en) {
        queries.push(`${titles.en} Episode ${episode} Muse Indonesia Ani-One Sub Indo`);
    }
    // Query Priority 2: Japanese Title + Sub Indo
    if (titles.jp) {
        queries.push(`${titles.jp} Episode ${episode} Sub Indo`);
    }
    // Query Priority 3: Default Title
    queries.push(`${titles.default} Episode ${episode} Sub Indo`);

    // Try finding a working instance
    const instance = INVIDIOUS_INSTANCES[Math.floor(Math.random() * INVIDIOUS_INSTANCES.length)];

    for (const query of queries) {
        try {
            console.log(`[Client Search] Searching on ${instance}: ${query}`);
            const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
            
            if (res.ok) {
                const results = await res.json();
                
                // Filter: Look for Official Channels OR "Sub Indo" in title
                const match = results.find((video: any) => {
                    const authorName = video.author.toLowerCase();
                    const videoTitle = video.title.toLowerCase();
                    
                    const isOfficial = OFFICIAL_CHANNELS.some(c => authorName.includes(c.toLowerCase()));
                    const hasSubIndo = videoTitle.includes('sub indo') || videoTitle.includes('subtitle indonesia');
                    
                    return isOfficial || hasSubIndo;
                });

                if (match) {
                    return {
                        success: true,
                        url: `https://www.youtube.com/embed/${match.videoId}?autoplay=1`,
                        message: `Found: ${match.title} (${match.author})`
                    };
                }
            }
        } catch (e) {
            console.warn(`Failed to search on ${instance} for query: ${query}`, e);
        }
        await delay(500); // polite delay
    }

    return { success: false, url: '', message: 'Video not found on automatic search.' };
};


// --- MAIN STREAMING LOGIC ---

export const getStreamUrl = async (
    server: string, 
    titles: { default: string, en: string, jp: string }, 
    episode: number
): Promise<{ success: boolean; url: string; message?: string }> => {
  
  // IF SERVER IS YOUTUBE, USE CLIENT-SIDE LOGIC (No Backend)
  if (server === StreamingServer.YOUTUBE || server.includes('YouTube')) {
      return await searchYoutubeClientSide(titles, episode);
  }

  // FOR OTHER SERVERS (Scrapers), USE BACKEND
  try {
    const params = new URLSearchParams({
        server: server,
        title_default: titles.default,
        title_en: titles.en || '',
        title_jp: titles.jp || '',
        episode: episode.toString()
    });

    const response = await fetch(`${BACKEND_URL}?${params.toString()}&t=${Date.now()}`);

    if (!response.ok) {
        return { success: false, url: '', message: 'Backend unavailable for scraped servers.' };
    }

    const hasil = await response.json();
    return hasil;

  } catch (error) {
    console.error("Stream fetch error:", error);
    return { 
        success: false, 
        url: '', 
        message: 'Backend Offline. YouTube mode works without backend.' 
    };
  }
};