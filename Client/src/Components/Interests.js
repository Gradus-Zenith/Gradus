"use client";

import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "./Firebase";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import { Heart, Lightbulb, ChevronRight, InfoIcon } from "lucide-react";

function Interests() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [interestsOptions, setInterestsOptions] = useState([]);
  const [interests, setInterests] = useState([]);
  const [infoOpen, setInfoOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchUserData(currentUser.uid);
      } else {
        setUser(null);
        toast.error("User not logged in!", { position: "bottom-center" });
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserData = async (uid) => {
    try {
      const userRef = doc(db, "Users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setInterests(data.interests || []);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchInterestsOptions = useCallback(async () => {
    try {
      const interestsRef = doc(db, "GlobalDB", "Beyond");
      const interestsSnap = await getDoc(interestsRef);

      if (interestsSnap.exists()) {
        const data = interestsSnap.data();
        if (data && data.Options) {
          setInterestsOptions(data.Options);
        } else {
          console.error("No 'Options' field found in document!");
          toast.error("Error: No interests options found!", { position: "bottom-center" });
        }
      } else {
        console.error("Document does not exist!");
        toast.error("Error: Interests document does not exist!", { position: "bottom-center" });
      }
    } catch (error) {
      console.error("Error fetching Interests:", error);
      toast.error("Error fetching interests options!", { position: "bottom-center" });
    }
  }, []);

  useEffect(() => {
    fetchInterestsOptions();
  }, [fetchInterestsOptions]);

  const handleInterestSelection = (interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((e) => e !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (interests.length === 0) {
      toast.error("Please select at least one interest!", { position: "bottom-center" });
      return;
    }
    
    if (!user) {
      toast.error("No authenticated user found!", { position: "bottom-center" });
      return;
    }
    
    try {
      // Save interests to Firestore
      await setDoc(doc(db, "Users", user.uid), { interests, hasInterests: true }, { merge: true });

      // Send user ID to the API route
      const response = await fetch("/api/saveUserId", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error("Failed to save user ID to API");
      }

      toast.success("Interests updated successfully!", { position: "top-center" });
      router.push("/welcome");
    } catch (error) {
      console.error("Error updating interests:", error);
      toast.error("Error updating data!", { position: "bottom-center" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black px-4 py-10">
      <div className="w-full max-w-3xl">
        {/* Main Card */}
        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="relative h-32 bg-gradient-to-r from-[#18cb96] to-[#109d76] flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')]"></div>
            <div className="flex flex-col items-center z-10">
              <Heart className="text-white w-8 h-8 mb-2" />
              <h1 className="text-3xl font-bold text-white">What Do You Love?</h1>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-6">
            {/* Info Box */}
            {infoOpen && (
              <div className="mb-6 bg-gray-900/70 border border-[#18cb96]/30 rounded-lg p-4 text-gray-200">
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <Lightbulb className="w-5 h-5 text-[#18cb96]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-[#18cb96] mb-1">Why We Ask About Your Interests</h3>
                    <p className="text-sm">
                      Selecting your interests helps us personalize your experience on Gradus
                    </p>
                  </div>
                  <button 
                    onClick={() => setInfoOpen(false)} 
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Interests Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="text-[#18cb96] w-5 h-5" />
                    <h2 className="text-xl font-medium text-white">Select Your Interests</h2>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-4">Choose activities and topics that interest you outside of academics:</p>
                    
                    {interestsOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {interestsOptions.map((interest, index) => (
                          <div
                            key={index}
                            className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all duration-300
                              ${interests.includes(interest) 
                                ? 'border-[#18cb96] bg-[#18cb96]/10 text-white shadow-md shadow-[#18cb96]/20' 
                                : 'border-gray-700 bg-gray-700/50 text-gray-300 hover:border-gray-500'}
                            `}
                            onClick={() => handleInterestSelection(interest)}
                          >
                            {interest}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20">
                        <div className="animate-pulse flex space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                          <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                          <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 text-gray-400 text-sm flex items-center">
                      <InfoIcon className="w-4 h-4 mr-2 text-[#18cb96]" />
                      <span>Selected: {interests.length} {interests.length === 1 ? 'interest' : 'interests'}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full bg-[#18cb96] hover:bg-[#15b789] text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-[#18cb9640] transition-all duration-300 flex items-center justify-center"
                  >
                    <span className="mr-2">Complete Profile</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#18cb96]"></div>
            <div className="w-12 h-1 rounded-full bg-[#18cb96]"></div>
            <div className="w-3 h-3 rounded-full bg-[#18cb96]"></div>
            <div className="w-12 h-1 rounded-full bg-[#18cb96]"></div>
            <div className="w-3 h-3 rounded-full bg-[#18cb96]"></div>
          </div>
        </div>
        <p className="text-center text-gray-500 mt-2 text-sm">Step 3 of 3 - Personal Interests</p>
      </div>

      <ToastContainer />
    </div>
  );
}

export default Interests;