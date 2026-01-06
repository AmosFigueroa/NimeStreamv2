import { JikanResponse, Anime, Episode, StreamingServer } from '../types';

const BASE_URL = 'https://api.jikan.moe/v4';

// External Scraper API
// Attempting to access via /api prefix as standard Vercel deployment
const EXTERNAL_API_BASE = 'https://web-anime-api.vercel.app/api';

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
    'Wanha Story'
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

// --- CLIENT-SIDE YOUTUBE SEARCH LOGIC ---

// Helper to fetch from Invidious with Failover
const fetchFromInvidious = async (query: string): Promise<any[]> => {
    // Shuffle instances to load balance
    const instances = [...INVIDIOUS_INSTANCES].sort(() => 0.5 - Math.random());
    
    for (const instance of instances) {
        try {
            console.log(`[Invidious] Trying ${instance} for: ${query}`);
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

    const queries = [];
    queries.push(`${mainTitle} Episode ${episode} Muse Indonesia`);
    queries.push(`${mainTitle} Episode ${episode} Ani-One Indonesia`);
    queries.push(`${titles.en || titles.default} Episode ${episode} Sub Indo`);

    if (titles.jp) {
        queries.push(`${titles.jp} Episode ${episode} Sub Indo`);
    }

    for (const query of queries) {
        const results = await fetchFromInvidious(query);
        
        if (results && results.length > 0) {
            const match = results.find((video: any) => {
                const authorName = video.author.toLowerCase();
                const videoTitle = video.title.toLowerCase();
                
                const isOfficial = OFFICIAL_CHANNELS.some(c => authorName.includes(c.toLowerCase()));
                const hasSubIndo = videoTitle.includes('sub indo') || 
                                   videoTitle.includes('subtitle indonesia') || 
                                   videoTitle.includes('indonesia sub');

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
        await delay(200); 
    }

    return { success: false, url: '', message: 'Video not found on automatic search.' };
};

// --- OTAKUDESU API LOGIC ---

const fetchFromOtakudesu = async (title: string, episode: number): Promise<{ success: boolean; url: string; message?: string }> => {
    try {
        console.log(`[Otakudesu] Searching: ${title}`);
        
        // 1. Search Anime
        const searchUrl = `${EXTERNAL_API_BASE}/otakudesu/search/${encodeURIComponent(title)}`;
        const searchRes = await fetch(searchUrl);
        
        // Safe Check for JSON
        const contentType = searchRes.headers.get("content-type");
        if (!searchRes.ok || (contentType && contentType.indexOf("application/json") === -1)) {
             console.warn(`[Otakudesu] Invalid response from ${searchUrl}`);
             return { success: false, url: '', message: 'Anime API error (Not JSON)' };
        }

        const searchData = await searchRes.json();
        
        if (searchData.statusCode !== 200 || !searchData.data?.animeList?.length) {
            return { success: false, url: '', message: 'Anime not found on Otakudesu' };
        }

        // Take first result
        const anime = searchData.data.animeList[0];
        const animeId = anime.animeId;
        console.log(`[Otakudesu] Found: ${anime.title} (${animeId})`);

        // 2. Get Details to find Episode List
        const detailUrl = `${EXTERNAL_API_BASE}/otakudesu/anime/${animeId}`;
        const detailRes = await fetch(detailUrl);
        const detailData = await detailRes.json();
        
        if (!detailData.data?.episodeList?.length) {
            return { success: false, url: '', message: 'No episodes found' };
        }

        // 3. Find specific episode
        // Otakudesu episode list usually contains "Episode X" in title
        const targetEp = detailData.data.episodeList.find((ep: any) => {
             const epNumMatch = ep.title.match(/Episode\s+(\d+)/i);
             return epNumMatch && parseInt(epNumMatch[1]) === episode;
        });

        if (!targetEp) {
             return { success: false, url: '', message: `Episode ${episode} not found` };
        }

        console.log(`[Otakudesu] Found Episode ID: ${targetEp.episodeId}`);

        // 4. Get Stream URL
        const streamUrlRes = await fetch(`${EXTERNAL_API_BASE}/otakudesu/episode/${targetEp.episodeId}`);
        const streamData = await streamUrlRes.json();
        
        if (streamData.statusCode !== 200 || !streamData.data) {
             return { success: false, url: '', message: 'Failed to fetch stream data' };
        }

        const data = streamData.data;
        // Prioritize streamLink (iframe) or mirrorUrl
        let streamUrl = data.streamLink || data.url;
        
        // If no direct streamLink, check mirrorList
        if (!streamUrl && data.mirrorList) {
             // Prefer 'desustream' or similar reliable mirrors if available
             const preferred = data.mirrorList.find((m: any) => 
                m.mirrorProvider.toLowerCase().includes('desu') || 
                m.mirrorProvider.toLowerCase().includes('pdrain')
             );
             streamUrl = preferred ? preferred.mirrorUrl : data.mirrorList[0]?.mirrorUrl;
        }

        if (streamUrl) {
            return { success: true, url: streamUrl, message: 'Source: Otakudesu' };
        }

        return { success: false, url: '', message: 'No playable stream found' };

    } catch (e: any) {
        console.error("Otakudesu API Error:", e);
        return { success: false, url: '', message: `Connection failed: ${e.message}` };
    }
}

// --- MAIN STREAMING LOGIC ---

export const getStreamUrl = async (
    server: string, 
    titles: { default: string, en: string, jp: string }, 
    episode: number
): Promise<{ success: boolean; url: string; message?: string }> => {
  
  // 1. YouTube (Client-Side)
  if (server === StreamingServer.YOUTUBE || server.includes('YouTube')) {
      return await searchYoutubeClientSide(titles, episode);
  }

  // 2. Otakudesu (Direct API)
  if (server === StreamingServer.OTAKUDESU) {
      // Search using English or Default title
      return await fetchFromOtakudesu(titles.default, episode);
  }

  // 3. Kuramanime / Fallbacks
  // Note: The external API might support Kuramanime too, but we haven't defined endpoints.
  // We can use Otakudesu as a fallback for others if desired, or fail.
  
  if (server === StreamingServer.KURAMA || server === StreamingServer.SAMEHADAKU) {
      // Fallback to Otakudesu for now as it's the most reliable "Sub Indo" source we have access to via API
      const result = await fetchFromOtakudesu(titles.default, episode);
      if (result.success) {
          return { ...result, message: 'Source: Otakudesu (Fallback)' };
      }
  }

  return { success: false, url: '', message: 'Server not supported or unavailable.' };
};