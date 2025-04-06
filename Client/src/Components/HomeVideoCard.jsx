"use client";

import { useEffect, useState, useCallback } from "react";
import { auth, db } from "./Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const HomeVideoCard = ({ video }) => {
  const router = useRouter();
  const [userID, setUserId] = useState("");
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    // console.log("Component Mounted");

    const fetchUserDetails = async (user) => {
      // console.log("Fetching user details...");
      if (!user) {
        setUserDetails(null);
        return;
      }

      setUserId(user.uid);
      console.log(user.uid)
      try {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error.message);
      }
    };

    fetchUserDetails(auth.currentUser);

    const unsubscribe = auth.onAuthStateChanged(fetchUserDetails);
    return () => unsubscribe();
  }, []);

  const handleVideoClick = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("No user logged in.");
          return;
        }

        console.log("User found in HomeVideoCard:", user.uid);
        
        const knightShipRef = doc(db, "KnightShips", video.videoId);
        await setDoc(knightShipRef, {}); // Adds videoId to the KnightShip collection
        
        // Use relative path for navigation
        window.location.href = `/watch.html?v=${video.videoId}&uid=${userID}`;
      } catch (error) {
        console.error("Error adding video to KnightShip collection:", error);
      }
    },
    [video.videoId, userID]
  );

  return (
    <div
      onClick={handleVideoClick}
      className="cursor-pointer min-w-[280px] w-[280px] flex flex-col rounded-lg border border-green-200 p-2 transition-transform hover:scale-105"
    >
      <div className="w-full aspect-video rounded-lg overflow-hidden">
        <img
          src={video?.thumbnail}
          width={280}
          height={157}
          className="w-full h-full object-cover"
          alt="Video Thumbnail"
        />
      </div>
      <div className="mt-2 p-1">
        <h1 className="text-white text-base font-medium line-clamp-2">
          {video?.title}
        </h1>
        <p className="text-green-200 font-bold text-sm mt-1">
          {video?.channelName || "Channel name"}
        </p>
      </div>
    </div>
  );
};

export default HomeVideoCard;
