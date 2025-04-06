
'use client';

import RecentVideos from "@/Components/RecentVideos";
import PreviousVideos from "@/Components/PreviousVideos";
import Navbar from "@/Components/Navbar";

const RevsiePage = ()=>{
    return(
        <div className="mt-20">
            <Navbar/>
            <RecentVideos />
            <PreviousVideos />
        </div>
    )
}

export default RevsiePage