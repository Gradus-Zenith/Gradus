"use client"
import React, { useEffect, useState } from "react";
import { auth, db } from "./Firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import "../Styles/profile.css";
import TimeTracker from "./TimeTracker";
import Dashboard from "./DashBoard";
import Navbar from "./Navbar";

function Profile() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("Academia");
    const [userDetails, setUserDetails] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [availableOptions, setAvailableOptions] = useState({});
    const [selectedOptions, setSelectedOptions] = useState({});

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, "Users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserDetails(docSnap.data());
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error.message);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    async function fetchOptions() {
        if (!userDetails) return;

        try {
            if (activeTab === "Academia") {
                const course = userDetails.course;
                const subjectsRef = doc(db, "GlobalDB", "Academia", course, "Subjects");
                const examsRef = doc(db, "GlobalDB", "Academia", course, "Exams");

                const subjectsSnap = await getDoc(subjectsRef);
                const examsSnap = await getDoc(examsRef);

                const subjectOptions = subjectsSnap.exists() ? subjectsSnap.data().Options || [] : [];
                const examOptions = examsSnap.exists() ? examsSnap.data().Options || [] : [];

                setAvailableOptions({
                    subjects: subjectOptions,
                    exams: examOptions
                });

                // Initialize selectedOptions with current user selections
                setSelectedOptions({
                    subjects: userDetails.subjects || [],
                    exams: userDetails.exams || []
                });
            } else if (activeTab === "Beyond") {
                const beyondRef = doc(db, "GlobalDB", "Beyond");
                const beyondSnap = await getDoc(beyondRef);
                const interests = beyondSnap.exists() ? beyondSnap.data().Options || [] : [];
                setAvailableOptions(interests);
                setSelectedOptions(userDetails.interests || []);
            }

            setIsEditing(true);
        } catch (error) {
            console.error("Error fetching options:", error.message);
        }
    }

    async function handleLogout() {
        try {
            await auth.signOut();
            window.location.href = "/login";
            console.log("User logged out successfully!");
        } catch (error) {
            console.error("Error logging out:", error.message);
        }
    }

    function toggleSelection(item) {
        setSelectedOptions((prev) => {
            if (activeTab === "Academia") {
                // Check if the item exists in subjects or exams
                const isSubject = availableOptions.subjects.includes(item);
                const isExam = availableOptions.exams.includes(item);

                if (isSubject) {
                    return {
                        ...prev,
                        subjects: prev.subjects.includes(item)
                            ? prev.subjects.filter(i => i !== item)
                            : [...prev.subjects, item]
                    };
                } else if (isExam) {
                    return {
                        ...prev,
                        exams: prev.exams.includes(item)
                            ? prev.exams.filter(i => i !== item)
                            : [...prev.exams, item]
                    };
                }
                return prev;
            } else {
                return prev.includes(item)
                    ? prev.filter((i) => i !== item)
                    : [...prev, item];
            }
        });
    }

    async function saveUpdates() {
        if (!userDetails) return;

        try {
            const userRef = doc(db, "Users", auth.currentUser.uid);

            if (activeTab === "Academia") {
                const subjectsSelected = selectedOptions.subjects.filter((item) =>
                    availableOptions.subjects.includes(item)
                );
                const examsSelected = selectedOptions.exams.filter((item) =>
                    availableOptions.exams.includes(item)
                );

                await updateDoc(userRef, {
                    subjects: subjectsSelected,
                    exams: examsSelected,
                });

                setUserDetails((prev) => ({
                    ...prev,
                    subjects: subjectsSelected,
                    exams: examsSelected,
                }));
            } else if (activeTab === "Beyond") {
                await updateDoc(userRef, { interests: selectedOptions });

                setUserDetails((prev) => ({
                    ...prev,
                    interests: selectedOptions,
                }));
            }

            setIsEditing(false);
        } catch (error) {
            console.error("Error updating user data:", error.message);
        }
    }

    function handleTabSwitch(tab) {
        if (isEditing) {
            alert("Please save changes before switching tabs.");
            return;
        }
        setActiveTab(tab);
    }

    return (

        <div>
            <Navbar />
            {userDetails ? (
                <>
                    <TimeTracker />
                    <div className="bg-darkBlueGray h-[45rem] relative top-16">
                        <div className="grid grid-cols-7 grid-rows-5 gap-4">
                            <div className="col-span-2 row-span-5 bg-darkBlueGray border border-white h-[35rem] relative top-5 left-4 rounded-3xl text-center">
                                <div className="bg-gray-500 w-[10rem] h-[10rem] relative left-[8rem] top-20 border-4 border-green-400 rounded-full overflow-hidden flex items-center justify-center">
                                    <img className="w-full h-full object-cover bg-gray-900" src={userDetails.photo} alt="User Profile" />
                                </div>
                                <div className="h-[20rem] w-full relative top-24 text-white">
                                    <p className="text-3xl font-bold mb-2 text-green-300">{userDetails.name} <span className="text-xl text-gray-400">{userDetails.gender}</span></p>
                                    <p className="text-xl font-bold underline mb-2">{userDetails.email}</p>
                                    <p className="text-xl font-bold mb-2">Age: <span className="text-green-300">{userDetails.age}</span></p>
                                    <p className="text-xl font-bold mb-2">Course: <span className="text-green-300">{userDetails.course}</span></p>
                                </div>
                                <button className={`button absolute bottom-4 right-28`} onClick={() => router.push("/personal-details")}>
                                    Update Details
                                </button>
                            </div>

                            <div className="col-span-5 row-span-3 col-start-3 bg-darkBlueGray border border-white h-[22rem] relative top-5 left-5 w-[95%] rounded-3xl">

                                <div className="grid grid-cols-6 grid-rows-1 gap-4 relative top-4 left-[18.5rem] w-[70%] text-center text-xl">
                                    <div className="col-span-2 text-white h-[2.5rem] rounded-lg"><span className="font-bold text-green-400">20</span> Videos in last week</div>
                                    <div className="col-span-2 text-white col-start-3  rounded-lg">Max Streak : <span className="font-bold text-green-400">20</span> days</div>
                                    <div className="col-span-2 text-white col-start-5  rounded-lg">Current Streak : <span className="font-bold text-green-400">20</span> days</div>
                                </div>

                                <div className="grid grid-cols-7 grid-rows-4 gap-4 relative top-7">
                                    <div className="col-span-2 row-span-2  rounded-lg relative left-4 w-[90%] text-center">
                                        <p className="w-full relative top-4 text-white text-2xl">Videos Watched</p>
                                        <p className="w-full relative top-5 text-green-400 text-4xl">10</p>
                                    </div>
                                    <div className="col-span-2 row-span-2 col-start-1 row-start-3 rounded-lg relative left-4 w-[90%] text-center">
                                        <p className="w-full relative top-4 text-white text-2xl">Total Active Days</p>
                                        <p className="w-full relative top-5 text-4xl text-green-400">5</p>
                                    </div>


                                    <div className="col-span-5 row-span-4 col-start-3 row-start-1 border border-green-400 h-[16rem] rounded-lg relative right-3 overflow-x-auto whitespace-nowrap p-4">
                                        <Dashboard />
                                    </div>

                                </div>

                            </div>

                            <div className=" col-span-5 row-span-2 col-start-3 row-start-4 bg-darkBlueGray border border-white h-[15rem] relative top-5 left-5 w-[95%] rounded-3xl overflow-y-auto">
                                <div className="flex justify-center space-x-4 mb-4 w-[20%] relative top-1 left-16">
                                    <button onClick={() => handleTabSwitch("Academia")} className={`px-4 py-2 rounded-lg ${activeTab === "Academia" ? "bg-green-400 text-black" : "bg-darkBlueGray text-white"}`}>Academia</button>
                                    <button onClick={() => handleTabSwitch("Beyond")} className={`px-4 py-2 rounded-lg ${activeTab === "Beyond" ? "bg-green-400 text-black" : "bg-darkBlueGray   text-white"}`}>Beyond</button>
                                    <button className={`text-black rounded-3xl p-1 bg-green-300 cursor-pointer  h-12 font-bold px-4 py-2 relative left-[43rem] top-1`} onClick={fetchOptions}>
                                        Update
                                    </button>
                                </div>

                                <hr />

                                <div className="relative top-2">
                                    {!isEditing ? (
                                        <>
                                            <ul className="grid grid-cols-4 gap-4">
                                                {(activeTab === "Academia" ? userDetails.subjects.concat(userDetails.exams) : userDetails.interests)?.map((item, index) => (
                                                    <li key={index} className={`card bg-green-400 border border-green-400 p-3`}>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>

                                        </>
                                    ) : (
                                        <div>
                                            <div className="grid grid-cols-4 gap-4">
                                                {activeTab === "Academia" ? (
                                                    <>

                                                        <div className="col-span-4">
                                                            <h3 className="text-white mb-2 ml-5">Subjects</h3>
                                                            <div className="grid grid-cols-4 gap-4">
                                                                {availableOptions.subjects.map((item, index) => {
                                                                    const isSelected = selectedOptions.subjects.includes(item);
                                                                    const wasInitiallySelected = userDetails.subjects.includes(item);
                                                                    return (
                                                                        <div
                                                                            key={`subject-${index}`}
                                                                            className={`card cursor-pointer hover:opacity-80 
                                                                                ${isSelected
                                                                                    ? "bg-green-500 border border-green-400"
                                                                                    : wasInitiallySelected
                                                                                        ? "bg-gray-600 border border-gray-400"
                                                                                        : "bg-gray-700 border border-gray-500"
                                                                                }`}
                                                                            onClick={() => toggleSelection(item)}
                                                                        >
                                                                            {item}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>


                                                        <div className="col-span-4 mt-4">
                                                            <h3 className="text-white mb-2 ml-5">Exams</h3>
                                                            <div className="grid grid-cols-4 gap-4">
                                                                {availableOptions.exams.map((item, index) => {
                                                                    const isSelected = selectedOptions.exams.includes(item);
                                                                    return (
                                                                        <div
                                                                            key={`exam-${index}`}
                                                                            className={`card cursor-pointer hover:opacity-80 
                                                                                ${isSelected
                                                                                    ? "bg-green-500 border border-green-400"
                                                                                    : "bg-gray-700 border border-gray-500"
                                                                                }`}
                                                                            onClick={() => toggleSelection(item)}
                                                                        >
                                                                            {item}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (

                                                    availableOptions.map((item, index) => {
                                                        const isSelected = selectedOptions.includes(item);
                                                        return (
                                                            <div
                                                                key={index}
                                                                className={`card cursor-pointer hover:opacity-80 
                                                                    ${isSelected
                                                                        ? "bg-green-500 border border-green-400"
                                                                        : "bg-gray-700 border border-gray-500"
                                                                    }`}
                                                                onClick={() => toggleSelection(item)}
                                                            >
                                                                {item}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            <button className={`button cursor-pointer relative left-[51rem] bottom-5`} onClick={saveUpdates}>Save Changes</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className={`Btn relative left-[10rem] bottom-5`}>

                        <div className={`sign`}><svg viewBox="0 0 512 512"><path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path></svg></div>

                        <div className={`text`}>Logout</div>
                    </button>
                </>
            ) : (
                <p></p>
            )}
        </div>
    );
}

export default Profile;