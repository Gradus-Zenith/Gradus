"use client"; // Only this file will run in the client

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Loader from "./Loader"; 

const LayoutWrapper = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname(); // Detect route changes

  useEffect(() => {
    setLoading(true); // Start loading
    const timer = setTimeout(() => setLoading(false), 500); 

    return () => clearTimeout(timer); // Cleanup function
  }, [pathname]); // Runs when route changes

  return (
    <>
      {loading && <div className="min-h-screen flex items-center justify-center">
          <Loader text="" />
        </div>} {/* Show loader while loading */}
      {!loading && children} {/* Show content when loading is complete */}
    </>
  );
};

export default LayoutWrapper;
