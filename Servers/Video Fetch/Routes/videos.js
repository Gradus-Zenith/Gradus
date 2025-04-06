import express, { json } from "express";
import axios from "axios";
import cors from "cors";
import { admin, db } from "./firebase.js";

const videosRouter = express.Router();
const YT_KEY = "AIzaSyBhqisQwysrc32AgpT20fihpTgYLz-zi0Y"
const YT_KEY_2 = "AIzaSyBIHir9Hydj_VsvABVNLP83Lq4i-WUtY48"
const YT_KEY_3 = "IzaSyCQNypOZ9LuT1b882QCRlB_MMjxjd8qxQQ"
const API_KEY_4 = "AIzaSyCFKBklkmaFcSoyjRUXxMMwyZutg5egppM"
const YT_KEY_5 = "AIzaSyBlwGcgF4mmb1bq7phB3N0z3_3RR2VxRY4"

videosRouter.get('/fetchVideos/:category', async(req,res)=>{
    const {email} = req.query;
    const {zone} = req.query;
    const srcQuery = decodeURIComponent(req.params.category);
    const playlists = {}
    console.log(email, zone)
    const user = await admin.auth().getUserByEmail(email);
      const userDoc = await db.collection("Users").doc(user.uid).get();
      const userData = userDoc.data();
  
      // Extract user academic details
      const grade = userData.course;
    
    try {
      
      console.log(srcQuery);
      const longVideosResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          maxResults: 16,
          type: "video",
          key: YT_KEY,
          q: srcQuery,
          videoEmbeddable: "true",
          videoDuration: "long"
        }
      });
      
      // Then fetch medium videos (4-20 minutes)
      const mediumVideosResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          maxResults: 16,
          type: "video",
          key: YT_KEY_2,
          q: srcQuery,
          videoEmbeddable: "true",
          videoDuration: "medium"
        }
      });
  
  if(zone === "beyond"){   
     const playlistDoc = await db
          .collection("GlobalDB")
          .doc("Beyond")
          .collection(srcQuery)
          .doc("Playlists")
          .get();
      const playlistIds =  playlistDoc.data()?.Options.slice(1);
      
      for(const playId of playlistIds){
        const playlistRes = await axios.get("https://www.googleapis.com/youtube/v3/playlists", {
          params: {
            part: "snippet",
            id: playId,
            key: YT_KEY,
          }})
  
          const playData = playlistRes.data.items[0].snippet;
          const channelName = playData.channelTitle;
          const playName = playData.title;
          const playThumbnail = playData.thumbnails.high.url;
  
          playlists[playId] = {
            channelName,
            playThumbnail,
            playName
          };
      }}
    else if(zone === "academia"){
      const playlistRes = await axios.get('https://www.googleapis.com/youtube/v3/search',{
        params:{
          part: "snippet",
          type : "playlist",
          key: YT_KEY_2,
          q : `${grade} ${srcQuery}`
        }
      })
      playlistRes.data.items.map((playData)=> {
      const channelName = playData.snippet.channelTitle;
      const playName = playData.snippet.title;
      const playThumbnail = playData.snippet.thumbnails.high.url;
      const playId = playData.id.playlistId
  
      playlists[playId] = {
        channelName,
        playThumbnail,
        playName
      };
    })     
    }
      const allVideos = [
        ...longVideosResponse.data.items, 
        ...mediumVideosResponse.data.items
      ];
  
      const videos = allVideos.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high.url
      }));
      
      res.status(200).json({messgae : "Videos & Playlists fetched successfully", playlists, videos})
    } catch (error) {
      console.log(error)
      res.status(400).json({error})
    }
  })
  
videosRouter.get('/fetchCategorizedVideos', async (req, res) => {
    const { email } = req.query;
  
    try {
      const user = await admin.auth().getUserByEmail(email);
      const userData = await db.collection("Users").doc(user.uid).get();
      const interests = userData.data().interests;
  
      if (!interests || interests.length === 0) {
        return res.status(400).json({ error: "User has no interests set" });
      }
  
      let categorizedVideos = {};
      const API_KEY = "AIzaSyAMZBDBbRut3BErSVA-Jbp9UReBzS-R1jk";
  
      for (const interest of interests) {
        try {
          categorizedVideos[interest] = [];
          
          // First fetch long videos (>20 minutes)
          const longVideosResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
            params: {
              part: "snippet",
              maxResults: 8,
              type: "video",
              key: YT_KEY_2,
              q: interest,
              videoEmbeddable: "true",
              videoDuration: "long"
            }
          });
          
          // Then fetch medium videos (4-20 minutes)
          const mediumVideosResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
            params: {
              part: "snippet",
              maxResults: 7,
              type: "video",
              key: YT_KEY,
              q: interest,
              videoEmbeddable: "true",
              videoDuration: "medium"
            }
          });
          
          // Combine the results
          const allVideos = [
            ...longVideosResponse.data.items, 
            ...mediumVideosResponse.data.items
          ];
          
          categorizedVideos[interest] = allVideos.map((item) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelName: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.high.url
          }));
  
        } catch (error) {
          console.error(`Error fetching videos for ${interest}:`, error.message);
          categorizedVideos[interest] = [];
        }
      }
  
      res.status(200).json({ message: "Videos categorized successfully", categorizedVideos });
  
    } catch (error) {
      res.status(400).json({ error: "Something went wrong" });
    }
  });
  
videosRouter.get('/fetchAcademicCategorizedVideos', async (req, res) => {
    const { email } = req.query;
  
    try {
      
      const user = await admin.auth().getUserByEmail(email);
      const userData = await db.collection("Users").doc(user.uid).get();
  
      let subjects = userData.data().subjects;
      const grade = userData.data().course;
      subjects = subjects.map(i=> i = `${i} for ${grade} standard`)
      const exams = userData.data().exams;
      const categories = subjects.concat(exams)
      
      let categorizedVideos = {};
  
      
      for (const category of categories) {
        categorizedVideos[category] = [];
        try {
          const longVideosResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
            params: {
              part: "snippet",
              maxResults: 8,
              type: "video",
              key: YT_KEY_2,
              q: `${grade} ${category}`,
              videoEmbeddable: "true",
              videoDuration: "long"
            }
          });
  
          const mediumVideosResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
            params: {
              part: "snippet",
              maxResults: 7,
              type: "video",
              key: YT_KEY_2,
              q: `${grade} ${category}`,
              videoEmbeddable: "true",
              videoDuration: "medium"
            }
          });
  
          const allVideos = [
            ...longVideosResponse.data.items, 
            ...mediumVideosResponse.data.items
          ];
  
          categorizedVideos[category] = allVideos.map((item) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelName: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.high.url
          }));
  
        } catch (error) {
          console.error(`Error fetching videos for ${category}:`, error.message);
          categorizedVideos[category] = [];
        }
      }
  
      res.status(200).json({ message: "Videos categorized successfully", categorizedVideos });
  
    } catch (error) {
      console.log(error)
      res.status(400).json({ error: error });
    }
  });

export default videosRouter