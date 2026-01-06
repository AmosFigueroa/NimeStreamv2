const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// The external scraping API endpoint
const SCRAPER_API = 'https://apidatav2-ck1u.vercel.app/api/scrape';

// Helper function to format search query
const formatQuery = (title) => encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim());

/**
 * Endpoint to get stream URL via external proxy
 */
app.get('/api/stream', async (req, res) => {
  const { server, title, episode } = req.query;

  console.log(`[Stream Request] Server: ${server} | Title: ${title} | Episode: ${episode || 'N/A'}`);

  if (!server || !title) {
    return res.status(400).json({ success: false, message: 'Missing server or title' });
  }

  try {
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

    // Call the external scraper API
    const response = await axios.post(SCRAPER_API, {
      siteUrl: targetUrl
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;

    // Check if the external API returned success and data
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      // Find the first result that has a videoUrl or embedUrl
      const match = data.data.find(item => item.videoUrl || item.embedUrl);
      
      if (match) {
        console.log(`[Proxy] Found stream: ${match.videoUrl || match.embedUrl}`);
        return res.json({ 
            success: true, 
            url: match.videoUrl || match.embedUrl 
        });
      }
    }
    
    console.log(`[Proxy] No stream found in results.`);
    return res.status(404).json({ success: false, message: 'No stream found in search results' });

  } catch (error) {
    console.error('[Proxy Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to connect to scraper service' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});