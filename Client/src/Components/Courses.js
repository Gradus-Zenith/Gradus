"use client";
import React, { useState, useEffect } from "react";
import { auth, db } from "./Firebase";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SubjectAndExams from './SubjectAndExams';
import ParticleBackground from "./ParticleBackground";
import { BookOpen, HelpCircle, ChevronRight, Layers } from "lucide-react";

function Courses() {
  const [user, setUser] = useState(null);
  const [course, setCourse] = useState("");
  const [options, setOptions] = useState([]);
  const [showSubjects, setShowSubjects] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchUserData(currentUser.uid);
        await fetchOptions();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid) => {
    try {
      const userRef = doc(db, "Users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setCourse(data.course || "");
      }
    } catch (error) {
      toast.error("Error fetching user data!", { position: "bottom-center" });
    }
  };

  const fetchOptions = async () => {
    try {
      const optionsRef = doc(db, "GlobalDB", "Academia");
      const optionsSnap = await getDoc(optionsRef);
      if (optionsSnap.exists()) {
        setOptions(optionsSnap.data().Options || []);
      }
    } catch (error) {
      toast.error("Error fetching options!", { position: "bottom-center" });
    }
  };

  const handleCourseSelection = (courses) => {
    setCourse(courses);
    setShowSubjects(false);
  };

  const handleCourseDetails = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("No authenticated user found!", { position: "bottom-center" });
      return;
    }

    // Check if a course is selected
    if (!course) {
      toast.error("Please select at least one course!", { position: "bottom-center" });
      return;
    }

    try {
      await setDoc(
        doc(db, "Users", user.uid),
        { course },
        { merge: true }
      );

      toast.success("Course Updated Successfully!", { position: "top-center" });
      setShowSubjects(false);
      setTimeout(() => setShowSubjects(true), 100);
      setShowHelp(false);
    } catch (error) {
      toast.error(error.message, { position: "bottom-center" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-gray-900 to-black px-4 py-10">
      {/* <ParticleBackground/> */}

      <div className="w-full max-w-4xl z-10">
        {/* Welcome / Help Box */}
        {showHelp && (
          <div className="bg-gray-800/90 rounded-xl p-5 mb-6 border-l-4 border-[#18cb96] shadow-lg">
            <div className="flex items-start">
              <div className="bg-[#18cb96]/20 rounded-full p-2 mr-4">
                <HelpCircle className="text-[#18cb96] w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white text-lg font-medium mb-1">Welcome to Course Selection</h3>
                <p className="text-gray-300 text-sm mb-3">
                  This is where you can select your academic courses to personalize your learning experience:
                </p>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li className="flex items-center">
                    <ChevronRight className="text-[#18cb96] w-4 h-4 mr-2" />
                    <span>Select your course from the options below</span>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="text-[#18cb96] w-4 h-4 mr-2" />
                    <span>Click "Continue" to see subjects and exams related to your course</span>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="text-[#18cb96] w-4 h-4 mr-2" />
                    <span>You can update your selection anytime</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Course Selection Card */}
        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
          {/* Header Section */}
          <div className="relative h-32 bg-gradient-to-r from-[#18cb96] to-[#109d76] flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')]"></div>
            <div className="flex flex-col items-center z-10">
              <BookOpen className="text-white w-8 h-8 mb-2" />
              <h1 className="text-3xl font-bold text-white">Select Your Course</h1>
            </div>
          </div>

          {/* Course Selection Form */}
          <div className="px-8 py-10">
            <form onSubmit={handleCourseDetails}>
              <div className="mb-8">
                <p className="text-gray-300 text-center mb-6">Choose the course that best matches your academic journey</p>
                
                {options.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {options.map((courses, index) => (
                      <div
                        key={index}
                        onClick={() => handleCourseSelection(courses)}
                        className={`
                          flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-300 
                          ${course === courses 
                            ? 'bg-[#18cb96]/20 border-2 border-[#18cb96] shadow-lg shadow-[#18cb96]/10' 
                            : 'bg-gray-700/50 border-2 border-gray-700 hover:border-gray-500'}
                        `}
                      >
                        <input
                          type="radio"
                          name="course"
                          value={courses}
                          checked={course === courses}
                          onChange={() => handleCourseSelection(courses)}
                          className="hidden"
                          required
                        />
                        <div className="w-10 h-10 rounded-full bg-gray-900/50 flex items-center justify-center mb-3">
                          <Layers className={`w-5 h-5 ${course === courses ? 'text-[#18cb96]' : 'text-gray-400'}`} />
                        </div>
                        <span className={`text-sm font-medium ${course === courses ? 'text-[#18cb96]' : 'text-white'}`}>
                          {courses}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-700 rounded-full mb-4"></div>
                      <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-gray-700 rounded w-24"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-6">
                <button 
                  type="submit" 
                  className="bg-[#18cb96] hover:bg-[#15b789] text-white font-medium py-3 px-8 rounded-lg shadow-lg hover:shadow-[#18cb9640] transition-all duration-300 flex items-center justify-center"
                >
                  <span className="mr-2">Continue</span>
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mt-2 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#18cb96]"></div>
            <div className="w-12 h-1 rounded-full bg-[#18cb96]"></div>
            <div className="w-3 h-3 rounded-full bg-[#18cb96]"></div>
            <div className="w-12 h-1 rounded-full bg-[#18cb96]"></div>
            <div className="w-3 h-3 rounded-full bg-[#18cb96]"></div>
          </div>
        </div>
        <p className="text-center text-gray-500 mb-8 text-sm">Step 3 of 3 - Course Selection</p>

        {/* Subject and Exams Section */}
        {showSubjects && (
          <div className="w-full mb-10 animate-fade-in">
            <SubjectAndExams course={course} />
          </div>
        )}

        <ToastContainer />
      </div>
    </div>
  );
}

export default Courses;