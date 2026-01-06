import { JikanResponse, Anime, Episode } from '../types';

const BASE_URL = 'https://api.jikan.moe/v4';
// Use local backend to handle scraping and avoid CORS issues
const BACKEND_URL = 'http://localhost:5000/api/stream';

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
    // Send request to backend proxy
    const params = new URLSearchParams({
        server: server,
        title: title,
        episode: episode.toString()
    });

    const response = await fetch(`${BACKEND_URL}?${params.toString()}`);

    if (!response.ok) {
        // Attempt to read error message
        try {
            const err = await response.json();
            return { success: false, url: '', message: err.message || 'Server error' };
        } catch {
            throw new Error(`Backend API Error: ${response.status}`);
        }
    }

    const hasil = await response.json();
    return hasil;

  } catch (error) {
    console.error("Stream fetch error:", error);
    return { 
        success: false, 
        url: '', 
        message: 'Connection failed. Please ensure the backend server is running on port 5000 (cd backend && npm start).' 
    };
  }
};