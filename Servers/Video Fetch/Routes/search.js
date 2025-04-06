import express, { json } from "express";
import axios from "axios";
import cors from "cors";
import { admin, db } from "./firebase.js";

const searchRouter = express.Router();

const YT_KEY = "AIzaSyBhqisQwysrc32AgpT20fihpTgYLz-zi0Y"
const YT_KEY_2 = "AIzaSyBIHir9Hydj_VsvABVNLP83Lq4i-WUtY48"
const YT_KEY_3 = "IzaSyCQNypOZ9LuT1b882QCRlB_MMjxjd8qxQQ"
const API_KEY_4 = "AIzaSyCFKBklkmaFcSoyjRUXxMMwyZutg5egppM"
const YT_KEY_5 = "AIzaSyBlwGcgF4mmb1bq7phB3N0z3_3RR2VxRY4"

searchRouter.get('/search-videos', async(req,res)=>{
    try{
      const {query} = req.query;

      const longVideosResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          maxResults: 8,
          type: "video",
          key: YT_KEY_3,
          q: query,
          videoEmbeddable: "true",
          videoDuration: "long"
        }
      });

      const mediumVideosResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          maxResults: 7,
          type: "video",
          key: YT_KEY_3,
          q: query,
          videoEmbeddable: "true",
          videoDuration: "medium"
        }
      });

      const srcResults = [
        ...longVideosResponse.data.items, 
        ...mediumVideosResponse.data.items
      ];


      let videos = srcResults
      .map((item)=> ({
        videoId : item.id.videoId,
        title : item.snippet.title,
        thumbnail : item.snippet.thumbnails.high.url,
        channelName : item.snippet.channelTitle
      }));

      res.json({videos})
    }catch(error){
      console.log(error)
    }
})

searchRouter.post('/search', async (req, res) => {
    const { query, maxResults } = req.body;
  
    if (!query || !maxResults) {
      return res.status(400).json({ error: 'Query and maxResults are required' });
    }
  
    try {
      const cacheKey = `${query}_${maxResults}`;
      const cachedResult = cache.get(cacheKey);
      
      if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_DURATION)) {
        return res.json(cachedResult.data);
      }
  
      const results = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          maxResults: maxResults,
          type: "video",
          key: API_KEY_4,
          q: interest,
          videoEmbeddable: "true",
          videoDuration: "long"
        }
      });
  
      const videoDetails = [];
      const videoIds = new Set();
  
      for (const video of results) {
        if (videoDetails.length >= maxResults) break;
        
        if (!videoIds.has(video.id)) {
          videoDetails.push({
            kind: "youtube#video",
            id: video.id.videoId,
            snippet: {
              title: video.snippet.title,
              description: video.description || "",
              channelTitle: video.snippet.channelTitle,
              thumbnail: video.snippet.thumbnails.high.url
            }
          });
          videoIds.add(video.id);
        }
      }
  
      const response = {
        kind: "youtube#searchListResponse",
        items: videoDetails
      };
  
      // Store in cache
      cache.set(cacheKey, {
        timestamp: Date.now(),
        data: response
      });
  
      res.json(response);
    } catch (error) {
      console.error('Error searching YouTube:', error);
      res.status(500).json({ error: 'Failed to search YouTube' });
    }
});

  export default searchRouter;