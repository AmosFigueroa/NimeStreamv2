import { JikanResponse, Anime, Episode, StreamingServer } from '../types';

const BASE_URL = 'https://api.jikan.moe/v4';
// Local backend still used for scraped sites (Kurama, etc) if running
const BACKEND_URL = 'http://localhost:5000/api/stream';

// List of public Invidious instances. 
// We will try multiple if one fails.
const INVIDIOUS_INSTANCES = [
  'https://invidious.projectsegfau.lt',
  'https://inv.tux.pizza',
  'https://invidious.jing.rocks',
  'https://vid.ufficio.eu.org',
  'https://yt.artemislena.eu',
  'https://invidious.nerdvpn.de'
];

const OFFICIAL_CHANNELS = [
    'Muse Indonesia', 
    'Ani-One Indonesia', 
    'Tropics Anime Asia', 
    'Ani-One Asia', 
    'Gundaminfo', 
    'Bilibili',
    'Netflix Indonesia',
    'Wanha Story' // Added based on your screenshot
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

// Helper to fetch from Invidious with Failover
const fetchFromInvidious = async (query: string): Promise<any[]> => {
    // Shuffle instances to load balance
    const instances = [...INVIDIOUS_INSTANCES].sort(() => 0.5 - Math.random());
    
    for (const instance of instances) {
        try {
            console.log(`[Invidious] Trying ${instance} for: ${query}`);
            // Set a timeout signal
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

            const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn(`[Invidious] Failed on ${instance}, trying next...`);
        }
    }
    return [];
};

const searchYoutubeClientSide = async (
    titles: { default: string, en: string, jp: string }, 
    episode: number
): Promise<{ success: boolean; url: string; message?: string }> => {
    
    const mainTitle = titles.en || titles.default; // Prefer English title for YouTube

    // 1. Construct Specific Queries (Do not mix keywords to avoid confusion)
    const queries = [];
    
    // Priority 1: Muse Indonesia specifically
    queries.push(`${mainTitle} Episode ${episode} Muse Indonesia`);
    
    // Priority 2: Ani-One specifically
    queries.push(`${mainTitle} Episode ${episode} Ani-One Indonesia`);

    // Priority 3: English Title + Sub Indo (Generic)
    queries.push(`${titles.en || titles.default} Episode ${episode} Sub Indo`);

    // Priority 4: Japanese Title + Sub Indo (Fallback)
    if (titles.jp) {
        queries.push(`${titles.jp} Episode ${episode} Sub Indo`);
    }

    for (const query of queries) {
        const results = await fetchFromInvidious(query);
        
        if (results && results.length > 0) {
            // Filter Logic
            const match = results.find((video: any) => {
                const authorName = video.author.toLowerCase();
                const videoTitle = video.title.toLowerCase();
                
                // Check if channel is Official
                const isOfficial = OFFICIAL_CHANNELS.some(c => authorName.includes(c.toLowerCase()));
                
                // Check for subtitle indicators
                const hasSubIndo = videoTitle.includes('sub indo') || 
                                   videoTitle.includes('subtitle indonesia') || 
                                   videoTitle.includes('indonesia sub');

                // Valid if: 
                // 1. It is an OFFICIAL channel (Trust them even without "Sub Indo" in title)
                // 2. OR it clearly says "Sub Indo" in title
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
        // Small delay before trying next query type
        await delay(200); 
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