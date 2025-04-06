import express, { json } from "express";
import axios from "axios";
import cors from "cors";
import { admin, db } from "./firebase.js";

const playlistRouter = express.Router();

const YT_KEY_5 = process.env.YT_KEY_5

playlistRouter.get('/playlist/:playlistId', async (req, res) => {
    try {
      const YOUR_API_KEY = process.env.YT_KEY_5;
      const {playlistId} = req.params;
      console.log(playlistId)
      const {pageToken} = req.query || null;
      const pageSize = parseInt(req.query.pageSize) || 25;
      
      const data = await fetchPlaylistPage(playlistId, YOUR_API_KEY, pageToken, pageSize);
      const transformedData = transformPlaylistPage(data);
      
      res.json(transformedData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  playlistRouter.get('/getPlaylists/beyond', async (req, res) => {
    const { email } = req.query;
    console.log(email);
  
    try {
      const user = await admin.auth().getUserByEmail(email);
      const userDoc = await db.collection("Users").doc(user.uid).get();
  
      const interests = userDoc.data().interests || [];
      console.log("Interests are : ",interests)
      let playlistIds = [];
  
      for (const interest of interests) {
        const playlistDoc = await db
          .collection("GlobalDB")
          .doc("Beyond")
          .collection(interest)
          .doc("Playlists")
          .get();
  
        const playlistArr = playlistDoc.data()?.Options.slice(1);
        console.log(interest , " playlistArr : ", playlistArr)
        if(playlistArr) playlistIds.push(...playlistArr);
      }
  
      let playlists = {}; 
  
      for (const playId of playlistIds) {
        const playlistRes = await axios.get("https://www.googleapis.com/youtube/v3/playlists", {
          params: {
            part: "snippet",
            id: playId,
            key: YT_KEY_5,
          },
        });
  
        if (!playlistRes.data.items.length) continue; 
  
        const playData = playlistRes.data.items[0].snippet;
        const channelName = playData.channelTitle;
        const playName = playData.title;
        const playThumbnail = playData.thumbnails.high.url;
        
        playlists[playId] = {
          channelName,
          playThumbnail,
          playName
        };
      }
  
      res.json({playlists});
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Something went wrong" });
    }
  });
  
  playlistRouter.get('/getPlaylists/academia', async (req, res) => {
    const { email } = req.query;
    console.log(email);
  
    try {
      // Get user info
      const user = await admin.auth().getUserByEmail(email);
      const userDoc = await db.collection("Users").doc(user.uid).get();
      const userData = userDoc.data();
  
      // Extract user academic details
      const grade = userData.course; // Example: "12th"
      const examCategories = userData.exams || []; // Example: ["JEE Maths", "NEET Bio"]
      const subjects = userData.subjects || []; // Example: ["Physics", "Chemistry", "Maths"]
  
      if (!grade) {
        return res.status(400).json({ error: "User grade information is missing" });
      }
  
      console.log("User academic details: ", grade, examCategories, subjects);
  
      let playlistData = [];
  
      // Fetch Exam Playlists for each category
      for (const exam of examCategories) {
        const examPlaylistDoc = await db
          .collection("GlobalDB")
          .doc("Academia")
          .collection(grade)
          .doc("Exams")
          .collection(exam)
          .doc("Playlists")
          .get();
  
        const examPlaylists = examPlaylistDoc.data()?.Options?.slice(1) || [];
        console.log(`${exam} Playlists: `, examPlaylists);
        
        for (const playId of examPlaylists) {
          playlistData.push(playId);
        }
      }
  
      // Fetch Subject Playlists
      for (const subject of subjects) {
        const subjectPlaylistDoc = await db
          .collection("GlobalDB")
          .doc("Academia")
          .collection(grade)
          .doc("Subjects")
          .collection(subject)
          .doc("Playlists")
          .get();
  
        const subjectPlaylists = subjectPlaylistDoc.data()?.Options?.slice(1) || [];
        console.log(`${subject} Playlists: `, subjectPlaylists);
  
        for (const playId of subjectPlaylists) {
          playlistData.push(playId);
        }
      }
  
      let playlists = {};
  
      // Fetch playlist details from YouTube API
      for (const playId of playlistData) {
        const playlistRes = await axios.get("https://www.googleapis.com/youtube/v3/playlists", {
          params: {
            part: "snippet",
            id: playId,
            key: YT_KEY_5,
          },
        });
  
        if (!playlistRes.data.items.length) continue;
  
        const playData = playlistRes.data.items[0].snippet;
        playlists[playId]={
          channelName: playData.channelTitle,
          playThumbnail: playData.thumbnails.high.url,
          playName: playData.title,
          
        };
      }
  
      res.json({ playlists });
  
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Something went wrong" });
    }
  });
  
  playlistRouter.post("/savePlaylist", async (req, res) => {
      try {
          const { userId, playlistData } = req.body;
  
          if (!userId || !playlistData) {
              return res.status(400).json({ message: "User ID and Playlist ID are required." });
          }
  
          const formattedVideos = {};
          for (const [videoId, video] of Object.entries(playlistData.videos)) {
              formattedVideos[videoId] = {
                  ...video,
                  seen: false
              };
          }
  
          const savedPlaylist = {
              channelName: playlistData.channelName,
              playThumbnail: playlistData.playThumbnail,
              playName: playlistData.playName,
              videos: formattedVideos,
              savedAt: admin.firestore.FieldValue.serverTimestamp()
          };
  
          const userPlaylistRef = db.collection("Users").doc(userId);
          const playlistId = db.collection("Users").doc().id;
         
          await userPlaylistRef.set({
              savedPlaylists: {
                  [playlistId]: savedPlaylist
              }
          }, { merge: true });
  
          res.status(200).json({ message: "Playlist saved successfully.", playlistId });
  
      } catch (error) {
          console.error("Error saving playlist:", error);
          res.status(500).json({ message: "Internal server error." });
      }
  });

  export default playlistRouter;