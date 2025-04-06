"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/Components/Firebase";
import { doc, setDoc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Reply from "@/Components/Reply";

function Discuss() {
  const { videoId } = useParams();
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState({});
  const [userDetails, setUserDetails] = useState({});
  const [userExists, setUserExists] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        checkUserInKnightShips(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const checkUserInKnightShips = async (userId) => {
    if (!videoId) return;
    try {
      const videoDocRef = doc(db, "KnightShips", videoId);
      const videoSnap = await getDoc(videoDocRef);
      if (videoSnap.exists()) {
        const videoData = videoSnap.data();
        setUserExists(userId in videoData);
      }
    } catch (error) {
      console.error("Error checking user in KnightShips:", error);
    }
  };

  useEffect(() => {
    if (!videoId) return;
    const commentsRef = collection(db, "KnightShips", videoId, "Comments");

    const unsubscribe = onSnapshot(commentsRef, async (snapshot) => {
      let allComments = {};
      let userIds = new Set();

      snapshot.forEach((doc) => {
        allComments[doc.id] = doc.data();
        userIds.add(doc.id);
      });

      setComments(allComments);
      fetchUserDetails([...userIds]);
    });

    return () => unsubscribe();
  }, [videoId]);

  const fetchUserDetails = async (userIds) => {
    let details = {};
    for (const userId of userIds) {
      try {
        const userDocRef = doc(db, "Users", userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          details[userId] = userSnap.data();
        }
      } catch (error) {
        console.error(`Error fetching user details for ${userId}:`, error);
      }
    }
    setUserDetails(details);
  };

  const handlePostComment = async () => {
    if (!user) {
      toast.error("You must be logged in to post a comment!", { position: "bottom-center" });
      return;
    }
    if (!comment.trim()) {
      toast.error("Comment cannot be empty!", { position: "bottom-center" });
      return;
    }

    try {
      const userCommentsRef = doc(db, "KnightShips", videoId, "Comments", user.uid);
      const userCommentsSnap = await getDoc(userCommentsRef);
      const existingComments = userCommentsSnap.exists() ? userCommentsSnap.data() : {};
      const commentId = `comment_${Date.now()}`;

      await setDoc(
        userCommentsRef,
        { [commentId]: { text: { comment: comment.trim() } } },
        { merge: true }
      );

      toast.success("Comment posted successfully!", { position: "top-center" });
      setComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment!", { position: "bottom-center" });
    }
  };

  const handleReply = (commentOwnerId, commentId) => {
    setReplyingTo({ commentOwnerId, commentId });
  };

  const viewThread = (commentOwnerId, commentId) => {
    router.push(`/thread/${videoId}/${commentOwnerId}/${commentId}`);
  };

  return (
    <div className="bg-darkBlueGray p-5 min-h-screen">
      <div className="mt-5">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What's on your mind ?"
          className="w-full p-4 border rounded-xl bg-gray-600 text-white"
        />
        <button
          onClick={handlePostComment}
          className="mt-2 px-4 py-2 bg-green-300 text-black rounded-lg hover:bg-green-400 transition relative left-[95%]"
        >
          Post
        </button>
      </div>

      <div className="mt-5">
        {Object.entries(comments).length === 0 ? (
          <p className="text-gray-500">No comments yet.</p>
        ) : (
          Object.entries(comments).map(([userId, userComments]) => {
            const userInfo = userDetails[userId] || {};
            return (
              <div key={userId} className="mt-3 p-3 rounded-lg bg-gray-600">
                <div className="flex items-center gap-3">
                  <img
                    src={userInfo.photo || "/default-avatar.png"}
                    alt="User Avatar"
                    className="w-[3.5rem] h-[3.5rem] rounded-full"
                  />
                  <p className="text-xl font-semibold text-green-300">
                    {user && user.uid === userId ? "You" : userInfo.name || "Anonymous"}
                  </p>
                </div>
                {Object.entries(userComments).map(([commentId, commentData]) => (
                  <div key={commentId} className="mt-2 p-2 border rounded-lg w-[90%] relative left-[3.5rem] transition-transform duration-200 hover:scale-[1.03]">
                    <p className="text-white text-lg relative left-[1.1rem] mr-5">
                      {commentData.text?.comment.length > 500
                        ? commentData.text?.comment.slice(0, 500) + "...."
                        : commentData.text?.comment}
                    </p>


                    <div className="flex gap-2 mt-1 justify-between">
                      {/* View Thread button is always visible */}
                      <button
                        onClick={() => viewThread(userId, commentId)}
                        className="px-2 py-1 ml-3 mt-2 text-sm text-white underline rounded-lg hover:text-green-300 transition"
                      >
                        View Thread &rarr;
                      </button>

                      {/* Reply button is conditional on user existence */}
                      {userExists && user?.uid !== userId && (
                        <button
                          onClick={() => handleReply(userId, commentId)}
                          className="px-2 py-1 mr-3 text-sm font-bold bg-green-300 rounded-lg hover:bg-green-500 transition"
                        >
                          Answer
                        </button>
                      )}

                    </div>

                    {replyingTo &&
                      replyingTo.commentOwnerId === userId &&
                      replyingTo.commentId === commentId && (
                        <Reply
                          key={`reply-${commentId}`}
                          videoId={videoId}
                          commentOwnerId={userId}
                          commentId={commentId}
                          closeReply={() => setReplyingTo(null)}
                        />
                      )}
                  </div>
                ))}
              </div>

            );

          })
        )}
      </div>

      <ToastContainer />
    </div>
  );
}

export default Discuss;
