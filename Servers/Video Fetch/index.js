import express, { json } from "express";
import axios from "axios";
import cors from "cors";
import { admin, db } from "./firebase.js";
import videosRouter from "./Routes/videos.js";
import searchRouter from "./Routes/search.js";
import playlistRouter from "./Routes/playlists.js";

const app = express();
app.use(json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const YT_KEY = process.env.YT_KEY
const YT_KEY_2 = process.env.YT_KEY_2
const YT_KEY_3 = process.env.YT_KEY_3
const API_KEY_4 = process.env.API_KEY_4
const YT_KEY_5 = process.env.YT_KEY_5

app.use('/', searchRouter)
app.use('/', videosRouter)
app.use('/', playlistRouter)


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });



