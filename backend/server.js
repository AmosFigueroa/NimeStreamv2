const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytSearch = require('yt-search');
const cheerio = require('cheerio');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Fallback Scraper API (for other sites)
const SCRAPER_API = 'https://524axw7qhil15iaiwmoxrfpt5i6jg5p0r6ugjbr0lonedtmt9u-h850428135.scf.usercontent.goog/api/scrape';
// Kuramanime Base URL (Can be updated if domain changes)
const KURAMA_BASE_URL = 'https://kuramanime.tel';

// Helper function to format search query
const formatQuery = (title) => encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim());

// User-Agent for scraping
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// --- SCRAPING FUNCTIONS ---

/**
 * Scrapes Kuramanime for a video stream
 */
async function scrapeKurama(title, episode) {
    try {
        console.log(`[Kurama] Searching for: ${title} Ep ${episode}`);
        
        // 1. Search for the anime
        const searchUrl = `${KURAMA_BASE_URL}/anime?search=${encodeURIComponent(title)}&order_by=latest`;
        const { data: searchHtml } = await axios.get(searchUrl, { headers: HEADERS });
        const $ = cheerio.load(searchHtml);
        
        // Find the first anime link in the results
        // Selectors might vary, usually .product__item__text h5 a or similar
        let animeUrl = $('.product__item__text h5 a').first().attr('href');
        
        if (!animeUrl) {
            console.log('[Kurama] Anime not found in search');
            return null;
        }

        console.log(`[Kurama] Found Anime URL: ${animeUrl}`);

        // 2. Construct Episode URL
        // Typically: https://kuramanime.tel/anime/{slug}/episode/{ep}
        // animeUrl usually comes as full URL or relative
        if (!animeUrl.startsWith('http')) {
            animeUrl = `${KURAMA_BASE_URL}${animeUrl.startsWith('/') ? '' : '/'}${animeUrl}`;
        }
        
        // Remove query params if any
        animeUrl = animeUrl.split('?')[0];
        const episodeUrl = `${animeUrl}/episode/${episode}`;

        console.log(`[Kurama] Fetching Episode URL: ${episodeUrl}`);

        // 3. Fetch Episode Page
        const { data: epHtml } = await axios.get(episodeUrl, { headers: HEADERS });
        const $ep = cheerio.load(epHtml);

        // 4. Extract Stream Source
        // Look for common video players (iframe, video tag)
        let streamUrl = '';

        // Strategy A: Check for <select> options with streams (common in Kurama)
        // Sometimes stream links are in value of options or encoded strings
        
        // Strategy B: Check for Iframe
        const iframeSrc = $ep('iframe').attr('src');
        if (iframeSrc) streamUrl = iframeSrc;

        // Strategy C: Check for Video tag
        if (!streamUrl) {
             const videoSrc = $ep('video source').attr('src');
             if (videoSrc) streamUrl = videoSrc;
        }
        
        // Strategy D: Check for specific "data-video" attributes or scripts
        if (!streamUrl) {
            // Regex to find generic mp4 or m3u8 in the html
            const match = epHtml.match(/(https?:\/\/[^"']+\.(?:mp4|m3u8))/);
            if (match) streamUrl = match[1];
        }

        if (streamUrl) {
             console.log(`[Kurama] Found Stream: ${streamUrl}`);
             return streamUrl;
        }

        console.log('[Kurama] Stream URL extraction failed');
        return null;

    } catch (e) {
        console.error(`[Kurama Error] ${e.message}`);
        return null;
    }
}


// Health check endpoint
app.get('/', (req, res) => {
    res.send('NimeStream Backend is running. Access stream API at /api/stream');
});

/**
 * Endpoint to get stream URL via external proxy or YouTube
 */
app.get('/api/stream', async (req, res) => {
  // Receive multiple title variations
  const { server, episode, title_en, title_jp, title_default } = req.query;
  
  // Fallback for old frontend calls that might only send 'title'
  const mainTitle = title_default || req.query.title;

  console.log(`[Stream Request] Server: ${server} | Ep: ${episode}`);

  if (!server || !mainTitle) {
    return res.status(400).json({ success: false, message: 'Missing server or title' });
  }

  try {
    // --- YOUTUBE LOGIC ---
    if (server.includes('YouTube') || server.includes('Muse') || server.includes('AniOne')) {
        
        // Define prioritized search queries
        const queriesToTry = [];

        // Priority 1: English Title (Most official channels use English)
        if (title_en && title_en !== 'null') {
            queriesToTry.push(`${title_en} Episode ${episode} (Muse Indonesia | Ani-One Indonesia | Tropics Anime Asia) Sub Indo`);
        }

        // Priority 2: Japanese Title (Official Romaji)
        if (title_jp && title_jp !== 'null') {
             queriesToTry.push(`${title_jp} Episode ${episode} Sub Indo`);
        }

        // Priority 3: Default Title (Fallback)
        queriesToTry.push(`${mainTitle} Episode ${episode} Sub Indo`);

        console.log(`[YouTube] Trying queries:`, queriesToTry);

        const officialChannels = [
            'Muse Indonesia', 
            'Ani-One Indonesia', 
            'Tropics Anime Asia', 
            'Ani-One Asia',
            'Gundaminfo',
            'Bilibili',
            'Netflix Indonesia',
            'Wanha Story'
        ];

        // Loop through queries until a match is found
        for (const query of queriesToTry) {
            console.log(`[YouTube] Searching: ${query}`);
            try {
                const r = await ytSearch(query);
                
                if (r && r.videos.length > 0) {
                    // 1. Try to find exact official channel match
                    let bestMatch = r.videos.find(v => 
                        officialChannels.some(channel => v.author.name.includes(channel))
                    );

                    // 2. If no official channel, looking for explicit "Sub Indo" in title
                    if (!bestMatch) {
                        bestMatch = r.videos.find(v => v.title.toLowerCase().includes('sub indo'));
                    }

                    if (bestMatch) {
                        console.log(`[YouTube] Match Found: ${bestMatch.title} (${bestMatch.author.name})`);
                        return res.json({
                            success: true,
                            url: `https://www.youtube.com/embed/${bestMatch.videoId}?autoplay=1`,
                            message: `Found: ${bestMatch.title} (${bestMatch.author.name})`
                        });
                    }
                }
            } catch (err) {
                console.warn(`[YouTube] Failed query "${query}": ${err.message}`);
            }
            // Add small delay between retries
            await new Promise(r => setTimeout(r, 200)); 
        }
        
        return res.status(404).json({ success: false, message: 'No official YouTube stream found with any title variation.' });
    }

    // --- SCRAPER LOGIC ---
    
    // 1. Kuramanime (Internal Scraper)
    if (server.includes('Kurama')) {
        const stream = await scrapeKurama(mainTitle, episode);
        if (stream) {
            return res.json({ success: true, url: stream });
        }
        // If internal scraping fails, fallback to the external proxy below
        console.log('[Proxy] Falling back to external scraper for Kurama...');
    }

    // 2. External Scraper Logic (Samehadaku, MovieBox, or Kurama Fallback)
    let targetUrl = '';
    
    // For scraper, we usually use the Romaji/Default title
    if (server.includes('Kurama')) {
       targetUrl = `https://v9.kuramanime.tel/anime?search=${formatQuery(mainTitle)}`;
    } else if (server.includes('Samehadaku')) {
       targetUrl = `https://samehadaku.care/?s=${formatQuery(mainTitle)}`;
    } else if (server.includes('MovieBox')) {
       targetUrl = `https://moviebox.ph/search?q=${formatQuery(mainTitle)}`;
    } else {
       return res.status(400).json({ success: false, message: 'Unsupported server type' });
    }

    console.log(`[Proxy] Fetching from scraper for: ${targetUrl}`);

    const response = await axios.post(SCRAPER_API, {
      siteUrl: targetUrl
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const json = response.data;

    if (json && json.success && Array.isArray(json.data)) {
      const rawData = json.data;
      const videos = rawData.filter(item => item.type === 'video');

      console.log(`[Proxy] Scraper returned ${rawData.length} items. Found ${videos.length} playable videos.`);

      const match = videos.find(item => item.videoUrl || item.embedUrl);
      
      if (match) {
        return res.json({ 
            success: true, 
            url: match.videoUrl || match.embedUrl 
        });
      }
    }
    
    return res.status(404).json({ success: false, message: 'No stream found in search results' });

  } catch (error) {
    console.error('[Proxy Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to connect to scraping service' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});