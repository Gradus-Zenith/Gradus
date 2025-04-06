'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from './Firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

function RecentVideos() {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userData, setUserData] = useState({ name: 'User', photo: null });
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        setUserId(user.uid); // Set the logged-in user's ID

        try {
          const userDoc = await getDoc(doc(db, 'Users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              name: data.name || 'User',
              photo: data.photo || null,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserId(null);
        setUserData({ name: 'Guest', photo: null });
      }
    };

    fetchUser();

    // Listen for authentication changes
    const unsubscribe = auth.onAuthStateChanged(fetchUser);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return; // Only fetch videos if user is logged in

    const loadVideosWithNotes = async () => {
      try {
        const docRef = doc(db, 'Users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const notesData = data.notes || {};

          const videosArray = Object.entries(notesData)
            .filter(([_, noteData]) => noteData.content && noteData.content.trim() !== '')
            .map(([key, noteData]) => ({
              videoId: key,
              content: noteData.content,
              timestamp: noteData.timestamp?.toDate?.() || new Date(),
            }));

          setVideos(videosArray);
        } else {
          setError('User document not found');
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        setError(error.message);
      }
    };

    loadVideosWithNotes();
  }, [userId]);

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? videos.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === videos.length - 1 ? 0 : prevIndex + 1));
  };

  const handleInteractiveMode = () => {
    // router.push(`/watch?v=${videos[currentIndex].videoId}`);
    window.location.href = `http://127.0.0.1:5501/watch.html?v=${videos[currentIndex].videoId}`;

  };

  if (!userId) {
    return <p className="text-gray-500 p-4 text-center">Please log in to view your recent videos.</p>;
  }

  if (error) {
    return <div className="text-red-500 p-4 text-center">Error loading videos: {error}</div>;
  }

  if (videos.length === 0) {
    return <p className="text-gray-500 p-4 text-center">No videos with notes found.</p>;
  }

  const currentVideo = videos[currentIndex];

  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-8 text-center text-green-300">Recent Videos</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mx-5 my-5">
        <div className="lg:col-span-2 relative">
          <div className="bg-black bg-opacity-40 backdrop-blur-sm rounded-xl overflow-hidden shadow-2xl">
            <div className="relative pb-[50.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${currentVideo.videoId}`}
                title={`YouTube video ${currentIndex + 1}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="flex justify-between items-center p-4">
              <button
                className="w-12 h-12 border border-green-300 rounded-full bg-black hover:bg-gray-700 flex items-center justify-center text-white text-2xl"
                onClick={handlePrevious}
              >
                ←
              </button>
              <button
                className="px-6 py-2 bg-white text-black font-semibold hover:bg-gray-300 rounded-lg shadow-lg"
                onClick={handleInteractiveMode}
              >
                Interactive Mode
              </button>
              <button
                className="w-12 h-12 rounded-full border border-green-300 bg-black hover:bg-opacity-50 flex items-center justify-center text-white text-2xl"
                onClick={handleNext}
              >
                →
              </button>
            </div>
          </div>
          <div className="flex justify-center mt-4 space-x-2">
            {videos.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === currentIndex ? 'bg-green-300' : 'bg-gray-500'
                }`}
                onClick={() => setCurrentIndex(idx)}
              ></div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="bg-black bg-opacity-40 backdrop-blur-sm rounded-xl p-6 shadow-2xl h-full">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-300">Notes</h2>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-100 whitespace-pre-line">{currentVideo.content}</p>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Last updated: {currentVideo.timestamp.toLocaleString()}</span>
              <button className="text-green-300 hover:text-green-100 transition-colors">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecentVideos;
