"use client";
import React, { useState, useEffect } from "react";
import { auth, db } from "./Firebase";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import { BookOpen, User, Calendar, UserCheck } from "lucide-react";
import Avatars from "./Avatars";

function PersonalDetails() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [gender, setGender] = useState("");
    const [age, setAge] = useState("");
    const [user, setUser] = useState(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // Set isClient to true when component mounts on the client
        setIsClient(true);
        
        // Only run auth code on the client side
        if (typeof window !== 'undefined') {
            const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    fetchUserData(currentUser.uid);
                }
            });

            return () => unsubscribe();
        }
    }, []);

    const fetchUserData = async (uid) => {
        if (!uid) return;
        
        try {
            const userRef = doc(db, "Users", uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                setName(data.name || "");
                setGender(data.gender || "");
                setAge(data.age || "");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();

        if (!user) {
            toast.error("No authenticated user found!", { position: "bottom-center" });
            return;
        }

        try {
            await setDoc(doc(db, "Users", user.uid), {
                name: name,
                gender: gender,
                age: age,
                email: user.email
            }, { merge: true });

            toast.success("Details Updated Successfully!", { position: "top-center" });
        } catch (error) {
            toast.error(error.message, { position: "bottom-center" });
        }

        router.push("/course-interest");
    };

    // If not on client yet, show a minimal loading state
    if (!isClient) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black px-4 py-10">
            <div className="w-full max-w-3xl">
                {/* Personal Details Card */}
                <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    {/* Header Section */}
                    <div className="relative h-32 bg-gradient-to-r from-[#18cb96] to-[#109d76] flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')]"></div>
                        <div className="flex flex-col items-center z-10">
                            <BookOpen className="text-white w-8 h-8 mb-2" />
                            <h1 className="text-3xl font-bold text-white">Complete Your Profile</h1>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="px-8 py-6">
                        <form onSubmit={handleUpdateDetails}>
                            <div className="grid grid-cols-1 gap-6">
                                {/* Name Input */}
                                <div className="relative">
                                    <label className="block text-gray-400 text-sm font-medium mb-2">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#18cb96] transition-all duration-300"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Age Input */}
                                <div className="relative">
                                    <label className="block text-gray-400 text-sm font-medium mb-2">Age</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="number"
                                            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#18cb96] transition-all duration-300"
                                            placeholder="Enter your age"
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Gender Selection */}
                                <div>
                                    <label className="block text-gray-400 text-sm font-medium mb-3">Gender</label>
                                    <div className="flex gap-4 justify-center">
                                        {/* Male Option */}
                                        <div className="flex-1">
                                            <input
                                                className="peer sr-only"
                                                value="male"
                                                name="gender"
                                                id="male"
                                                type="radio"
                                                checked={gender === "male"}
                                                onChange={(e) => setGender(e.target.value)}
                                                required
                                            />
                                            <div className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-gray-700 bg-gray-700/50 text-white p-2 transition-all duration-300 hover:border-[#18cb96] peer-checked:border-[#18cb96] peer-checked:bg-[#18cb96]/10 peer-checked:shadow-md peer-checked:shadow-[#18cb96]/20">
                                                <label className="flex flex-col cursor-pointer items-center justify-center" htmlFor="male">
                                                    <svg
                                                        viewBox="0 0 100000 100000"
                                                        className="h-8 w-8 mb-1 fill-current"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path d="M35927 32903c412,2646 927,5119 1312,6767 -1320,-1159 -6849,-6682 -6569,-1799 342,5954 5284,6851 5297,6853l826 176 0 841c0,18 -115,6164 5054,8983 2585,1411 5371,2117 8155,2117 2783,0 5567,-706 8152,-2117 5169,-2819 5054,-8965 5054,-8983l0 -841 826 -176c13,-2 4955,-899 5297,-6853 273,-4760 -5035,428 -6400,1585 466,-2425 1265,-6640 1627,-10534 -707,-1139 -1761,-2058 -3310,-2445 -5841,-1459 -12802,2359 -14487,-898 -1685,-3256 -4043,-5728 -4043,-5728 0,0 -1461,5389 -4266,7749 -1302,1095 -2073,3278 -2525,5303zm7891 26143c0,0 -2213,3386 -2734,5600 -521,2213 -16015,783 -16407,9375 -392,8593 -391,16666 -391,16666l51429 0c0,0 1,-8073 -391,-16666 -392,-8592 -15886,-7162 -16407,-9375 -520,-2214 -2734,-5600 -2734,-5600 89,59 -103,-469 -339,-1065 1123,-370 2228,-847 3303,-1433 5035,-2746 5946,-8013 6109,-10011 1747,-593 5810,-2604 6152,-8552 329,-5738 -2626,-5167 -4942,-3884 588,-3342 1229,-9312 59,-16047 -1797,-10330 -8310,-7860 -13363,-8645 -5054,-786 -11791,3480 -11791,3480 0,0 -6064,-785 -8872,4717 -1830,3589 -79,10904 1361,15557l178 1232c-2363,-1457 -5799,-2573 -5444,3590 341,5948 4404,7959 6151,8552 163,1998 1075,7265 6110,10011 1074,586 2179,1063 3302,1433 -236,596 -428,1124 -339,1065zm11413 -875c37,1566 129,3813 367,5042 391,2019 -326,4297 -326,4297l-5271 5389 -5272 -5389c0,0 -717,-2278 -326,-4297 238,-1229 330,-3475 367,-5042 1719,502 3476,753 5232,753 1755,0 3511,-251 5229,-753z"></path>
                                                    </svg>
                                                    <span className="text-sm font-medium uppercase">Male</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Female Option */}
                                        <div className="flex-1">
                                            <input
                                                className="peer sr-only"
                                                value="female"
                                                name="gender"
                                                id="female"
                                                type="radio"
                                                checked={gender === "female"}
                                                onChange={(e) => setGender(e.target.value)}
                                                required
                                            />
                                            <div className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-gray-700 bg-gray-700/50 text-white p-2 transition-all duration-300 hover:border-[#18cb96] peer-checked:border-[#18cb96] peer-checked:bg-[#18cb96]/10 peer-checked:shadow-md peer-checked:shadow-[#18cb96]/20">
                                                <label className="flex flex-col cursor-pointer items-center justify-center" htmlFor="female">
                                                    <svg
                                                        viewBox="0 0 128 128"
                                                        className="h-8 w-8 mb-1 fill-current"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path d="M64,72.7c0,0,0-0.1,0-0.1c0,0,0,0,0,0V72.7z" fill="#000"></path>
                                                        <path d="M54.6 49.2c.7 0 1.4-.3 1.9-.8.5-.5.8-1.2.8-1.9s-.3-1.4-.8-1.9c-.5-.5-1.2-.8-1.9-.8-.7 0-1.4.3-1.9.8-.5.5-.8 1.2-.8 1.9 0 .7.3 1.4.8 1.9C53.2 48.9 53.9 49.2 54.6 49.2zM73.8 49.2c.7 0 1.4-.3 1.9-.8.5-.5.8-1.2.8-1.9s-.3-1.4-.8-1.9c-.5-.5-1.2-.8-1.9-.8s-1.4.3-1.9.8c-.5.5-.8 1.2-.8 1.9s.3 1.4.8 1.9C72.5 48.9 73.1 49.2 73.8 49.2z" fill="#000"></path>
                                                        <path d="M40.6 78.1h10.7V67.1c3.7 2.4 8.1 3.7 12.5 3.7v0c0 0 .1 0 .1 0 0 0 .1 0 .1 0v0c4.4 0 8.8-1.3 12.5-3.7v11.1h10.7c.2 0 .4 0 .6 0h8.3V34.4c0-17.8-14.4-32.2-32.1-32.3v0c0 0-.1 0-.1 0 0 0-.1 0-.1 0v0C46.2 2.2 31.8 16.7 31.8 34.4v43.7H40C40.2 78.1 40.4 78.1 40.6 78.1zM44 38.1c0-3.2 2.6-5.8 5.8-5.8h14.1.2 14.1c3.2 0 5.8 2.6 5.8 5.8v9.1c0 4.5-1.5 8.6-4 12-1 1.3-2.2 2.6-3.4 3.6-3.4 2.8-7.8 4.5-12.6 4.5-4.8 0-9.2-1.7-12.6-4.5-1.3-1.1-2.5-2.3-3.4-3.6-2.5-3.4-4-7.5-4-12V38.1zM116.8 123.3c-.9-5.2-3-16.3-3.5-17.8-2.3-7-8.2-10.4-14.5-13-.8-.3-1.6-.7-2.4-1-5.5-2.1-11-4.3-16.5-6.4-2.6 6.2-8.8 10.5-15.9 10.5s-13.3-4.3-15.9-10.5c-5.5 2.1-11 4.3-16.5 6.4-.8.3-1.6.6-2.4 1-6.3 2.6-12.1 6-14.5 13-.5 1.4-2.5 12.6-3.5 17.8-.2 1 .3 1.9 1.1 2.3.3.2.7.3 1.1.3h101.1c.4 0 .8-.1 1.1-.3C116.5 125.1 116.9 124.2 116.8 123.3z" className="fill-current"></path>
                                                    </svg>
                                                    <span className="text-sm font-medium uppercase">Female</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Other Option */}
                                        <div className="flex-1">
                                            <input
                                                className="peer sr-only"
                                                value="other"
                                                name="gender"
                                                id="other"
                                                type="radio"
                                                checked={gender === "other"}
                                                onChange={(e) => setGender(e.target.value)}
                                                required
                                            />
                                            <div className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-gray-700 bg-gray-700/50 text-white p-2 transition-all duration-300 hover:border-[#18cb96] peer-checked:border-[#18cb96] peer-checked:bg-[#18cb96]/10 peer-checked:shadow-md peer-checked:shadow-[#18cb96]/20">
                                                <label className="flex flex-col cursor-pointer items-center justify-center" htmlFor="other">
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        className="h-8 w-8 mb-1 fill-current"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path d="M9 12C9 12.5523 8.55228 13 8 13 7.44772 13 7 12.5523 7 12 7 11.4477 7.44772 11 8 11 8.55228 11 9 11.4477 9 12zM13 12C13 12.5523 12.5523 13 12 13 11.4477 13 11 12.5523 11 12 11 11.4477 11.4477 11 12 11 12.5523 11 13 11.4477 13 12zM17 12C17 12.5523 16.5523 13 16 13 15.4477 13 15 12.5523 15 12 15 11.4477 15.4477 11 16 11 16.5523 11 17 11.4477 17 12z" className="fill-current"></path>
                                                        <path clipRule="evenodd" d="M12 2.75C10.3139 2.75 8.73533 3.20043 7.37554 3.98703C7.017 4.19443 6.5582 4.07191 6.3508 3.71337C6.14339 3.35482 6.26591 2.89602 6.62446 2.68862C8.2064 1.77351 10.0432 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 10.0432 1.77351 8.2064 2.68862 6.62446C2.89602 6.26591 3.35482 6.14339 3.71337 6.3508C4.07191 6.5582 4.19443 7.017 3.98703 7.37554C3.20043 8.73533 2.75 10.3139 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z" fillRule="evenodd" className="fill-current"></path>
                                                    </svg>
                                                    <span className="text-sm font-medium uppercase">Other</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Avatar Selection */}
                                <div className="mt-4">
                                    <label className="block text-gray-400 text-sm font-medium mb-2">Choose Your Avatar</label>
                                    <div className="bg-gray-900/50 rounded-lg p-4">
                                        <Avatars />
                                    </div>
                                </div>

                                {/* Continue Button */}
                                <div className="mt-6">
                                    <button 
                                        type="submit" 
                                        className="w-full bg-[#18cb96] hover:bg-[#15b789] text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-[#18cb9640] transition-all duration-300 flex items-center justify-center"
                                    >
                                        <span className="mr-2">Continue</span>
                                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
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
                        <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                        <div className="w-12 h-1 rounded-full bg-gray-600"></div>
                        <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    </div>
                </div>
                <p className="text-center text-gray-500 mt-2 text-sm">Step 1 of 3 - Personal Details</p>
            </div>

            {/* Toast Container for notifications */}
            <ToastContainer />
        </div>
    );
}

export default PersonalDetails;