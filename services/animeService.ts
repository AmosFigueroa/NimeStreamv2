import { JikanResponse, Anime, Episode } from '../types';

const BASE_URL = 'https://api.jikan.moe/v4';
const SCRAPER_API = 'https://apidatav2-ck1u.vercel.app/api/scrape';

// Helper for delay to avoid Jikan rate limiting (3 requests per second)
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

// --- STREAMING LOGIC ---

export const getStreamUrl = async (server: string, title: string, episode: number): Promise<{ success: boolean; url: string; message?: string }> => {
  try {
    // 1. Clean and Format Title for Search
    // Removing special characters usually helps with search accuracy on pirate sites
    const cleanTitle = title.replace(/[^\w\s]/gi, '').trim(); 
    const formatQuery = (t: string) => encodeURIComponent(t.toLowerCase());
    const formattedTitle = formatQuery(cleanTitle);
    
    let targetUrl = '';
    
    // 2. Construct Search URL based on Server
    // Note: These URLs are search pages. The scraper API will visit them and look for video players.
    if (server.includes('Kurama')) {
       targetUrl = `https://v9.kuramanime.tel/anime?search=${formattedTitle}`;
    } else if (server.includes('Samehadaku')) {
       targetUrl = `https://samehadaku.care/?s=${formattedTitle}`;
    } else if (server.includes('MovieBox')) {
       targetUrl = `https://moviebox.ph/search?q=${formattedTitle}`;
    } else {
       return { success: false, url: '', message: 'Server not supported' };
    }

    // 3. Call External Scraper API
    // This API acts as a proxy/scraper that renders the targetURL and extracts video sources.
    const response = await fetch(SCRAPER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        siteUrl: targetUrl 
      }),
    });

    if (!response.ok) throw new Error(`Scraper API Error: ${response.status}`);

    const hasil = await response.json();

    // 4. Process Results
    if (hasil.success && Array.isArray(hasil.data) && hasil.data.length > 0) {
       // Naive logic: Pick the first result that looks like a video or embed
       // In a real scenario, we might need to filter by Episode Number, but scraping search results is inexact.
       const match = hasil.data.find((item: any) => item.videoUrl || item.embedUrl);
       
       if (match) {
         return { success: true, url: match.videoUrl || match.embedUrl };
       }
    }
    
    return { success: false, url: '', message: 'No stream found in search results.' };

  } catch (error) {
    console.error("Stream fetch error:", error);
    return { success: false, url: '', message: 'Failed to connect to scraper.' };
  }
};