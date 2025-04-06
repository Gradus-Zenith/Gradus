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
const YT_KEY = "AIzaSyBhqisQwysrc32AgpT20fihpTgYLz-zi0Y"
const YT_KEY_2 = "AIzaSyBIHir9Hydj_VsvABVNLP83Lq4i-WUtY48"
const YT_KEY_3 = "IzaSyCQNypOZ9LuT1b882QCRlB_MMjxjd8qxQQ"
const API_KEY_4 = "AIzaSyCFKBklkmaFcSoyjRUXxMMwyZutg5egppM"
const YT_KEY_5 = "AIzaSyBlwGcgF4mmb1bq7phB3N0z3_3RR2VxRY4"

app.use('/', searchRouter)
app.use('/', videosRouter)
app.use('/', playlistRouter)


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });



