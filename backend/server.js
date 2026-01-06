const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytSearch = require('yt-search');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// New scraping API endpoint
const SCRAPER_API = 'https://524axw7qhil15iaiwmoxrfpt5i6jg5p0r6ugjbr0lonedtmt9u-h850428135.scf.usercontent.goog/api/scrape';

// Helper function to format search query
const formatQuery = (title) => encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim());

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
            'Netflix Indonesia'
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