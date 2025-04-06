'use client';

import { useParams } from 'next/navigation';
import PlaylistViewer from '@/Components/PlaylistViewer';
import Navbar from "@/Components/Navbar";

const PlaylistPage = () => {
    
    const { playlistId } = useParams(); // Extracting playlistId from URL
    console.log(playlistId)
    if (!playlistId) return <div>Loading...</div>; // Handle initial state

    return (
    <div>
    <Navbar/>
    <PlaylistViewer playlistId={playlistId} />;
    </div>
)
};

export default PlaylistPage;