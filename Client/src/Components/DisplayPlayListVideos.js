"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/Components/Firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import Navbar from "./Navbar";

function DisplayPlayListVideos() {
  const [userId, setUserId] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playlistName } = useParams();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid); // Store user ID in state
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log(" Playlist Name from URL:", playlistName);

    const fetchPlaylist = async (user) => {
      if (!user) {
        console.warn(" User not authenticated.");
        setLoading(false);
        return;
      }

      if (!playlistName) {
        console.warn("No playlistName found in URL.");
        setLoading(false);
        return;
      }

      console.log(" Fetching playlist for user:", user.uid);

      try {
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log(" Full User Data:", userData);

          const savedPlaylists = userData.savedPlaylists || {};

          if (!savedPlaylists[playlistName]) {
            console.warn(" Playlist not found in savedPlaylists.");
            setPlaylist(null);
            return;
          }

          console.log(" Playlist found:", savedPlaylists[playlistName]);
          setPlaylist(savedPlaylists[playlistName]);
        } else {
          console.warn(" No user data found in Firestore.");
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchPlaylist(user);
      } else {
        setLoading(false);
        setPlaylist(null);
      }
    });

    return () => unsubscribe();
  }, [playlistName]);

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
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const savedPlaylists = userData.savedPlaylists || {};

        if (savedPlaylists[playlistName]) {
          savedPlaylists[playlistName].videos[videoID].seen = newSeenStatus;

          await updateDoc(userRef, { savedPlaylists });

          console.log(`Updated 'seen' status for video ${videoID}:`, newSeenStatus);
        }
      }
    } catch (error) {
      console.error(" Error updating 'seen' status:", error);
    }
  };

  const calculateProgress = () => {
    if (!playlist || !playlist.videos) return 0;
    const totalVideos = Object.keys(playlist.videos).length;
    const seenVideos = Object.values(playlist.videos).filter((video) => video.seen).length;
    return totalVideos > 0 ? Math.round((seenVideos / totalVideos) * 100) : 0;
  };

  if (loading) return <p>Loading...</p>;
  if (!playlist) return <p>Playlist not found.</p>;

  return (
    <div>
      <Navbar />
      <div className="bg-darkBlueGray min-h-screen text-white p-5 flex relative top-16">
        {/* left */}
        <div className="w-1/3 pr-5">
          <div className="justify-between items-center grid grid-cols-1">
            <div>

              <img
                src={playlist.playThumbnail}
                alt={playlist.playName}
                className="w-[470px] h-[340px] mt-4 rounded-lg"
              />
              <h1 className="text-2xl text-white">Pathway Name : <span className="text-green-300">{playlist.playName}</span></h1>
              <h2 className="text-xl text-white">Channel Name : <span className="text-green-300">{playlist.channelName}</span> </h2>
            </div>
            <div className="w-[12rem] h-[10rem] relative left-[9rem] top-16">
              <CircularProgressbar
                value={calculateProgress()}
                text={`${calculateProgress()}%`}
                styles={buildStyles({
                  textSize: "18px",
                  pathColor: "#10B981",
                  textColor: "#fff",
                  trailColor: "#374151",
                  textAlign: "center",
                  textAnchor: "middle",
                })}
              />
              <div className=" w-[9rem] absolute top-[80%] left-[55%] transform -translate-x-1/2 -translate-y-1/2 text-green-300  font-semibold">
                Learning Progress
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Line */}
        <div className="w-[1px] bg-white min-h-screen fixed left-[36%] top-0 mt-[7rem]"></div>

        {/* right */}
        <div className="w-2/3 grid grid-cols-1 gap-4 mt-3 max-h-[720px] overflow-y-auto relative left-28">
          {playlist.videos &&
            Object.entries(playlist.videos).map(([videoID, videoData]) => (
              <div
                key={videoID}
                className={` w-[50rem] h-[15rem] border p-3 rounded-lg flex transition-opacity ${videoData.seen ? 'opacity-70' : 'opacity-100'}`}
              >
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={videoData.seen || false}
                    onChange={() => toggleSeenStatus(videoID, videoData.seen)}
                    className="mr-2 w-5 h-5 appearance-none border-2 border-gray-500 rounded checked:border-green-500 checked:bg-green-500"
                  />
                </div>

                <img
                  src={videoData.thumbnail}
                  alt={videoData.title}
                  className="w-[40%] rounded-md cursor-pointer"
                  onClick={() => {
                    if (userId) {
                      router.push(`/videoplayer/${userId}/${videoID}`);
                    } else {
                      console.warn("User not authenticated!");
                    }
                  }}
                  onError={(e) => {
                    if (e.target.src.includes("hqdefault.jpg")) {
                      e.target.src = e.target.src.replace("hqdefault.jpg", "mqdefault.jpg");
                    } else if (e.target.src.includes("mqdefault.jpg")) {
                      e.target.src = e.target.src.replace("mqdefault.jpg", "default.jpg");
                    } else {
                      e.target.src = "/default-thumbnail.jpg";
                    }
                  }}
                />

                <p className={`text-lg relative top-24 left-4 h-auto ${videoData.seen ? 'line-through text-gray-500' : ''}`}>
                  {videoData.title}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>

  );
}

export default DisplayPlayListVideos;