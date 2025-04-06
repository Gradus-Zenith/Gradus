"use client";

import React, { useState } from "react";
import { auth, db } from "@/Components/Firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";

const Reply = ({ videoId, commentOwnerId, commentId, closeReply, showCancel = true, placeholder, onReplyAdded }) => {
  const [replyText, setReplyText] = useState("");
  const user = auth.currentUser; // Get logged-in user

  const handleReplySubmit = async () => {
    if (!user) {
      toast.error("You must be logged in to reply!", { position: "bottom-center" });
      return;
    }
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty!", { position: "bottom-center" });
      return;
    }

    try {
      const commentRef = doc(db, "KnightShips", videoId, "Comments", commentOwnerId);
      const commentSnap = await getDoc(commentRef);
      let commentData = commentSnap.exists() ? commentSnap.data() : {};

      if (!commentData[commentId]) {
        toast.error("Comment not found!", { position: "bottom-center" });
        return;
      }

      if (!commentData[commentId].text) {
        commentData[commentId].text = {};
      }
      if (!commentData[commentId].text[user.uid]) {
        commentData[commentId].text[user.uid] = { replies: [] };
      }

      const newReply = {
        reply: replyText.trim(),
        timestamp: Date.now(),
        karmaPoints: false,
        userId: user.uid,
        name: user.displayName || "You",
        photo: user.photoURL || "",
      };

      commentData[commentId].text[user.uid].replies.push(newReply);

      await setDoc(commentRef, commentData, { merge: true });

      toast.success("Reply added successfully!", { position: "top-center" });
      setReplyText("");
      closeReply();

      if (onReplyAdded) {
        onReplyAdded({
          name: newReply.name,
          photo: newReply.photo,
          reply: newReply.reply,
          timestamp: newReply.timestamp,
          karmaPoints: newReply.karmaPoints,
          userId: newReply.userId,
        });
      }
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to add reply!", { position: "bottom-center" });
    }
  };


  return (
    <div className="mt-2 p-2 border-green-500">
      <input
        type="text"
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder={placeholder || "Write your reply..."}
        className="w-full p-2 rounded-lg bg-gray-500 text-white"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleReplySubmit}
          className="px-3 py-1 bg-green-300 text-black rounded-lg hover:bg-green-500 transition"
        >
          Add Reply
        </button>

        {showCancel && (
          <button
            onClick={closeReply}
            className="px-3 py-1 bg-gray-300 text-black rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default Reply;
