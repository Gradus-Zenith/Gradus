"use client";
import PlaylistPage from "@/Components/PlaylistPage";
import VideoPage from "@/Components/VideoPage";
import { useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/Components/Navbar";
import Loader from "@/Components/Loader";

const HomeComponent = ()=>{
  const [playlistsReady, setPlaylistsReady] = useState(false);
  const [videosReady, setVideosReady] = useState(false);
  const showContent = playlistsReady && videosReady;
  const searchParams = useSearchParams();
  const zone = searchParams.get("zone");

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Navbar/>
      <PlaylistPage zone={zone} onLoaded={() => setPlaylistsReady(true)} />
      <VideoPage zone={zone} onLoaded={() => setVideosReady(true)} />
    </div>
  );

  
}

const Home = ()=>{
    
  return ( <Suspense fallback={<Loader />}>
    <HomeComponent />
  </Suspense>)
    
}

export default Home;

