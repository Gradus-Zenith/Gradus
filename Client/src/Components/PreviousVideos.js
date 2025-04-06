"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import axios from "axios";
import { auth, db } from "./Firebase";

const PreviousVideos = () => {
  const [previousVideos, setPreviousVideos] = useState([]);
  const [userId, setUserId] = useState(null);
  const router = useRouter();
  const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    };

    fetchUser();
    const unsubscribe = auth.onAuthStateChanged(fetchUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchVideoDetails = async (videoId) => {
      try {
        const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
          params: {
            part: "snippet",
            id: videoId,
            key: YOUTUBE_API_KEY,
          },
        });
        return response.data.items[0]?.snippet?.title || "Untitled Video";
      } catch (error) {
        console.error("Error fetching video title:", error);
        return "Untitled Video";
      }
    };

    const fetchPreviousVideos = async () => {
      try {
        const userDocRef = doc(db, "Users", userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          const notes = userData.notes || {};

          let videosArray = Object.entries(notes)
            .map(([videoId, data]) => ({
              videoId,
              ...data,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              timestamp: data.timestamp?.toDate() || new Date(),
            }))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);

          const videosWithTitles = await Promise.all(
            videosArray.map(async (video) => ({
              ...video,
              title: await fetchVideoDetails(video.videoId),
            }))
          );

          setPreviousVideos(videosWithTitles);
        }
      } catch (error) {
        console.error("Error fetching previous videos:", error);
      }
    };

    fetchPreviousVideos();
  }, [userId]);

  const handleVideoClick = (videoId) => {
    // router.push(`/watch?v=${videoId}`);
    window.location.href = `http://127.0.0.1:5501/watch.html?v=${videoId}`;
  };

  const formatDate = (date) => {
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    return `${days} days ago`;
  };

  if (!userId) {
    return <p className="text-gray-500 p-4 text-center">Please log in to view your previous videos.</p>;
  }

  return (
    <div className="p-4 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">Previous Videos</h2>

      <div className="grid grid-cols-1 gap-4">
        {previousVideos.map((video) => (
          <div
            key={video.videoId}
            className="flex items-center space-x-4 border border-green-200 rounded p-2 cursor-pointer"
            onClick={() => handleVideoClick(video.videoId)}
          >
            <div className="flex-shrink-0">
              <img
                src={video.thumbnail}
                alt={`Thumbnail for ${video.title}`}
                width={144}
                height={90}
                className="w-36 h-auto rounded-md"
              />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">{video.title}</h3>
              <p className="text-sm text-green-300 mt-1">Viewed {formatDate(video.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>

      {previousVideos.length === 0 && (
        <p className="text-center text-gray-400 mt-8">No previous videos found</p>
      )}
    </div>
  );
};

export default PreviousVideos;
