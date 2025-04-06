'use client';

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PlaylistCard from "./PlaylistCard";

const CategoryPlaylists = ({ playlistData }) => {
    const [playlists, setPlaylists] = useState({});
    const scrollRef = useRef(null);
    
    useEffect(() => {
        if (playlistData) {
            setPlaylists(playlistData);
        }
    }, [playlistData]);

    const [scrollVisibility, setScrollVisibility] = useState({
        left: false,
        right: true,
    });

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8;

            scrollRef.current.scrollTo({
                left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: "smooth",
            });
        }
    };

    const updateScrollButtonVisibility = () => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
            setScrollVisibility({
                left: scrollLeft > 0,
                right: scrollLeft + clientWidth < scrollWidth - 10, // Small threshold to avoid flickering
            });
        }
    };

    useEffect(() => {
        const currentScrollRef = scrollRef.current;

        if (currentScrollRef) {
            currentScrollRef.addEventListener("scroll", updateScrollButtonVisibility);
        }

        return () => {
            if (currentScrollRef) {
                currentScrollRef.removeEventListener("scroll", updateScrollButtonVisibility);
            }
        };
    }, []);

    return (
        <div className="p-6 space-y-12 border-b-2 mb-5 border-green-300">
            <h2 className="text-2xl font-semibold mb-4 text-white">{`Curated playlists for you >`}</h2>

            <div className="relative group">
                {/* Left Scroll Button */}
                {scrollVisibility.left && (
                    <button
                        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => scroll("left")}
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {/* Scrollable Playlist Row */}
                <div
                    ref={scrollRef}
                    className="flex overflow-hidden hide-scrollbar gap-4 pb-6"
                    onScroll={updateScrollButtonVisibility}
                >
                    {Object.keys(playlists).map((playlistId) => (
                        <PlaylistCard key={playlistId} playlist={playlists[playlistId]} playlistId={playlistId} />
                    ))}
                </div>

                {/* Right Scroll Button */}
                {scrollVisibility.right && (
                    <button
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => scroll("right")}
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default CategoryPlaylists;