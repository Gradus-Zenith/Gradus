"use client";
import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./Firebase";
import styles from "../Styles/avatars.module.css";

const Avatars = () => {
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const currentUser = auth.currentUser;

  // Fetch avatar URLs from Firestore
  useEffect(() => {
    const fetchAvatars = async () => {
      const urlDocRef = doc(db, "avatars", "url");
      const urlDocSnap = await getDoc(urlDocRef);

      if (urlDocSnap.exists()) {
        const data = urlDocSnap.data();
        setAvatars(data.URLs || []);
      } else {
        console.log("No such document!");
      }
    };
    fetchAvatars();
  }, []);

  // Store selected avatar URL in user's "photo" field
  const selectAvatar = async (downloadURL) => {
    if (!currentUser) {
      alert("You need to be logged in to select an avatar.");
      return;
    }
    if (!downloadURL) {
      alert("Invalid avatar selected.");
      return;
    }

    setSelectedAvatar(downloadURL); // Set the selected avatar

    const userRef = doc(db, "Users", currentUser.uid);
    await updateDoc(userRef, {
      photo: downloadURL,
    });
  };

  return (
    <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide">
      {avatars.map((url, index) => (
        <img
          key={index}
          src={url}
          alt={`avatar-${index}`}
          className={`${styles.scale} cursor-pointer w-24 h-24 rounded-full border-2 transition-transform duration-300 ${selectedAvatar === url
              ? "border-green-500 shadow-md shadow-green-400" 
              : "hover:border-green-500"
            }`}
          onClick={() => selectAvatar(url)}
        />
      ))}
    </div>




  );
};

export default Avatars;
