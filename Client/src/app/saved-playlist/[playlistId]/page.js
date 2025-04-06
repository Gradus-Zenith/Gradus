"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from '../../../Components/Firebase'
import { useParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import Loader from "@/Components/Loader"

function PlaylistProgressViewer() {
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userID, setUserId] = useState("");
  const router = useRouter();
  const { playlistId } = useParams();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {

      const fetchPlaylist = async () => {
        // setLoading(true);
        console.log(user.uid)
        // setUserId(uid);
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        console.log(userSnap.data())
        if (userSnap.exists()) {
          const savedPlaylists = userSnap.data().savedPlaylists || {};
          console.log(savedPlaylists[playlistId])
          setPlaylist(savedPlaylists[playlistId] || null);
        } else {
          setPlaylist(null);
        }
  
        setLoading(false);
        
        // auth.onAuthStateChanged(async (user) => {
        //   if (!user) {
        //     setLoading(false);
        //     return;
        //   }
  
         
        // });
      };
  
      fetchPlaylist();
    });

    return () => unsubscribe();
  }, [playlistId]);
  
 // Runs when playlistId changes or when component mounts
  const toggleSeenStatus = async (videoID, currentSeenStatus) => {
    if (!playlist) return;

    const newSeenStatus = !currentSeenStatus;
    const updatedVideos = {
      ...playlist.videos,
      [videoID]: { ...playlist.videos[videoID], seen: newSeenStatus },
    };
    setPlaylist((prev) => ({ ...prev, videos: updatedVideos }));

    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, {
        [`savedPlaylists.${playlistId}.videos.${videoID}.seen`]: newSeenStatus,
      });
    } catch (error) {
      console.error("❌ Error updating seen status:", error);
    }
  };

  const calculateProgress = () => {
    if (!playlist?.videos) return 0;
    const total = Object.keys(playlist.videos).length;
    const seen = Object.values(playlist.videos).filter((v) => v.seen).length;
    return total > 0 ? Math.round((seen / total) * 100) : 0;
  };

  if (loading) return <Loader/>;
  if (!playlist) return <p>Playlist not found.</p>;


  const handleVideoClick = async (videoID) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const knightShipRef = doc(db, "KnightShip", videoID);
      await setDoc(knightShipRef, {});

      window.location.href = `http://127.0.0.1:5501/watch.html?v=${videoID}`;
    } catch (error) {
      console.error("❌ Error adding video to KnightShip collection:", error);
    }
  };



  return (
    <div className="min-h-screen text-white p-5 flex mt-20">
      <Navbar />
      {/* Left Section */}
      <div className="w-1/3 p-6 flex flex-col items-center border-r border-green-200 sticky">
        <div className="border border-green-300 rounded-lg p-5">
          <img src={playlist.playThumbnail} alt="Thumbnail" className="w-full rounded-md" />
          <h2 className="text-gray-200 text-3xl font-semibold">{playlist.playName}</h2>
          <p className="text-gray-200 mt-3 text-2xl">
            <span className="font-semibold text-green-300">Channel: </span>
            {playlist.channelName}
          </p>
        </div>
        <div className="w-[12rem] h-[10rem] relative top-10">
          <CircularProgressbar
            value={calculateProgress()}
            text={`${calculateProgress()}%`}
            styles={buildStyles({
              textSize: "18px",
              pathColor: "#10B981",
              textColor: "#fff",
              trailColor: "#374151",
            })}
          />
          <p className="absolute top-[80%] left-[55%] transform -translate-x-1/2 -translate-y-1/2 text-green-300 font-semibold">
            Learning Progress
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-2/3 grid grid-cols-1 gap-4 mt-3 max-h-[720px] overflow-y-auto">
        {playlist.videos &&
          Object.entries(playlist.videos).map(([videoID, videoData]) => (
            <div key={videoID} className={`w-full ${videoData.seen ? "opacity-70" : "opacity-100"}`}>
              <div className="flex items-start ml-5">
                <input
                  type="checkbox"
                  checked={videoData.seen || false}
                  onChange={() => toggleSeenStatus(videoID, videoData.seen)}
                  className="w-5 h-5 border-2 border-gray-500 rounded checked:border-green-500 checked:bg-green-500 mr-2"
                />
                <div className="flex border border-green-200 rounded p-2 w-full h-24">
                  <img
                    src={videoData.thumbnail}
                    alt="Thumbnail"
                    className="w-36 h-20 object-cover rounded-md cursor-pointer"
                    onClick={() => handleVideoClick(videoID)}
                    onError={(e) => {
                      e.target.src = "/default-thumbnail.jpg";
                    }}
                  />

                  <div className="ml-4 overflow-hidden">
                    <h3 className={`text-lg font-semibold truncate ${videoData.seen ? "line-through text-gray-500" : ""}`}>
                      {videoData.title}
                    </h3>
                    <p className="text-gray-400 truncate">{videoData.channelName}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default PlaylistProgressViewer;
