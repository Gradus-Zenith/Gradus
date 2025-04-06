"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/Components/Firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Reply from "@/Components/Reply";

function Thread() {
  const { videoId, commentOwnerId, commentId } = useParams();
  const [replies, setReplies] = useState([]);
  const [userExists, setUserExists] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [commentData, setCommentData] = useState(null);
  const [commentOwner, setCommentOwner] = useState({ name: "", photo: "" });

  useEffect(() => {
    const fetchCurrentUser = () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        setCurrentUserId(user.uid);
      }
    };

    fetchCurrentUser();
  }, []); 

  useEffect(() => {
    if (!videoId || !commentOwnerId || !commentId || !currentUserId) return;

    const fetchCommentAndReplies = async () => {
      try {
        const commentRef = doc(db, "KnightShips", videoId, "Comments", commentOwnerId);
        const commentSnap = await getDoc(commentRef);

        if (commentSnap.exists()) {
          const commentDoc = commentSnap.data();
          const commentText = commentDoc[commentId]?.text?.comment || "Comment not found";
          setCommentData(commentText);

          const userRef = doc(db, "Users", commentOwnerId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCommentOwner({
              name: commentOwnerId === currentUserId ? "You" : userData.name,
              photo: userData.photo,
            });
          }



          const textData = commentDoc[commentId]?.text || {};
          let formattedReplies = [];

          await Promise.all(
            Object.entries(textData).map(async ([userId, replyObj]) => {
              if (Array.isArray(replyObj.replies)) {
                for (const reply of replyObj.replies) {
                  const userRef = doc(db, "Users", userId);
                  const userSnap = await getDoc(userRef);
                  const userData = userSnap.exists() ? userSnap.data() : { name: "Unknown", photo: "" };

                  formattedReplies.push({
                    name: userId === currentUserId ? "You" : userData.name,
                    photo: userData.photo,
                    replyText: reply.reply,
                    timestamp: reply.timestamp,
                    karmaPoints: reply.karmaPoints,
                    userId,
                  });
                }
              }
            })
          );

          formattedReplies.sort((a, b) => a.timestamp - b.timestamp);
          setReplies(formattedReplies);
        }
      } catch (error) {
        console.error("Error fetching replies:", error);
      }
    };

    fetchCommentAndReplies();
  }, [videoId, commentOwnerId, commentId, currentUserId]); 

  useEffect(() => {
    const checkUserInVideo = async () => {
      if (!videoId || !currentUserId) return;
      try {
        const videoRef = doc(db, "KnightShips", videoId);
        const videoSnap = await getDoc(videoRef);

        if (videoSnap.exists()) {
          const videoData = videoSnap.data();
          setUserExists(currentUserId in videoData);
        }
      } catch (error) {
        console.error("Error checking user in video document:", error);
      }
    };

    checkUserInVideo();
  }, [videoId, currentUserId]);


  return (
    <div className="p-5">

      {/* Display the main comment */}
      {commentData && (
        <div className="p-3 border rounded-lg bg-gray-500 shadow-md mb-3 flex items-start">
          {commentOwner.photo ? (
            <img
              src={commentOwner.photo}
              alt="Comment Owner Avatar"
              className="w-[3.5rem] h-[3.5rem] rounded-full mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
              {commentOwner.name.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="font-bold text-green-300">{commentOwner.name}</h2>
            <p className="text-white text-lg">{commentData}</p>
          </div>
        </div>

      )}

      {/* Show Reply input only if the user exists in the video document AND is not the comment owner */}
      {userExists && currentUserId !== commentOwnerId && (
        <Reply
          videoId={videoId}
          commentOwnerId={commentOwnerId}
          commentId={commentId}
          closeReply={() => { }}
          showCancel={false}
          placeholder={replies.length === 0 ? "Be the first one to reply" : "Write your reply..."}
          onReplyAdded={(newReply) => {
            setReplies((prev) => [
              ...prev,
              {
                name: newReply.name || "Unknown",
                photo: newReply.photo || "",
                replyText: newReply.reply || "",
                timestamp: newReply.timestamp || Date.now(),
                karmaPoints: newReply.karmaPoints || false,
                userId: newReply.userId,
              },
            ]);
          }}
        />
      )}






      {/* Replies Section */}
      <div className="mt-3 p-3  rounded-lg ">
        <h2 className="text-lg text-white font-semibold italic">Thread Replies</h2>
        {replies.length === 0 ? (
          <p className="text-gray-500">No Answers Here Yet</p>
        ) : (
          replies.map((reply, index) => (
            <div key={index} className="mt-2 p-2  rounded-lg bg-gray-600 flex items-center">
              {reply.photo ? (
                <img src={reply.photo} alt="User Avatar" className="w-[3rem] h-[3rerm] rounded-full mr-3" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold mr-3">
                  {reply.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-green-300">{reply.name}</p>
                <p className="text-white text-lg">{reply.replyText}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Thread;
