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

/**
 * Endpoint to get stream URL via external proxy or YouTube
 */
app.get('/api/stream', async (req, res) => {
  const { server, title, episode } = req.query;

  console.log(`[Stream Request] Server: ${server} | Title: ${title} | Episode: ${episode || 'N/A'}`);

  if (!server || !title) {
    return res.status(400).json({ success: false, message: 'Missing server or title' });
  }

  try {
    // --- YOUTUBE LOGIC ---
    if (server.includes('YouTube') || server.includes('Muse') || server.includes('AniOne')) {
        console.log(`[Proxy] Searching YouTube for: ${title} Episode ${episode}`);
        
        // Construct a query that targets the specific channels and language
        // We look for "Sub Indo" or the specific channel names
        const searchQuery = `${title} Episode ${episode} (Muse Indonesia | Ani-One Indonesia | Tropics Anime Asia) Sub Indo`;
        
        const r = await ytSearch(searchQuery);
        
        if (r && r.videos.length > 0) {
            // Filter results to prioritize the official channels
            const officialChannels = [
                'Muse Indonesia', 
                'Ani-One Indonesia', 
                'Tropics Anime Asia', 
                'Ani-One Asia',
                'Gundaminfo',
                'Bilibili' // Sometimes official legal uploads appear here too
            ];

            // Try to find a video from an official channel first
            const bestMatch = r.videos.find(v => 
                officialChannels.some(channel => v.author.name.includes(channel)) ||
                v.title.toLowerCase().includes('sub indo')
            );

            const video = bestMatch || r.videos[0];

            console.log(`[Proxy] YouTube Match: ${video.title} by ${video.author.name}`);
            
            return res.json({
                success: true,
                url: `https://www.youtube.com/embed/${video.videoId}?autoplay=1`,
                message: `Found on ${video.author.name}`
            });
        }
        
        return res.status(404).json({ success: false, message: 'No official YouTube stream found.' });
    }

    // --- NEW SCRAPER LOGIC ---
    let targetUrl = '';
    
    // Construct the search URL for the requested server
    if (server.includes('Kurama')) {
       targetUrl = `https://v9.kuramanime.tel/anime?search=${formatQuery(title)}`;
    } else if (server.includes('Samehadaku')) {
       targetUrl = `https://samehadaku.care/?s=${formatQuery(title)}`;
    } else if (server.includes('MovieBox')) {
       targetUrl = `https://moviebox.ph/search?q=${formatQuery(title)}`;
    } else {
       return res.status(400).json({ success: false, message: 'Unsupported server type' });
    }

    console.log(`[Proxy] Fetching from scraper for: ${targetUrl}`);

    // Call the new external scraper API
    const response = await axios.post(SCRAPER_API, {
      siteUrl: targetUrl
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const json = response.data;

    // Check if the external API returned valid data
    if (json && Array.isArray(json.data) && json.data.length > 0) {
      const rawData = json.data;

      // Filter: Get only Playable Videos (type === 'video')
      const videos = rawData.filter(item => item.type === 'video');

      console.log(`[Proxy] Scraper returned ${rawData.length} items. Found ${videos.length} videos.`);

      // Find the first result that has a videoUrl or embedUrl
      const match = videos.find(item => item.videoUrl || item.embedUrl);
      
      if (match) {
        console.log(`[Proxy] Found stream: ${match.videoUrl || match.embedUrl}`);
        return res.json({ 
            success: true, 
            url: match.videoUrl || match.embedUrl 
        });
      }
    }
    
    console.log(`[Proxy] No video stream found in results.`);
    return res.status(404).json({ success: false, message: 'No stream found in search results' });

  } catch (error) {
    console.error('[Proxy Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to connect to service' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});