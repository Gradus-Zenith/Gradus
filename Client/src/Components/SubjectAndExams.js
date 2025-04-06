"use client";

import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "./Firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, FileCheck } from "lucide-react";

function SubjectAndExams() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [course, setCourse] = useState("");
  const [subOptions, setSubOptions] = useState([]);
  const [examCategories, setExamCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [hasInterests, setHasInterest] = useState(false);

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

  const fetchUserData = useCallback(async (uid) => {
    try {
      const userRef = doc(db, "Users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setCourse(data.course || "");
        setSubjects(data.subjects || []);
        setExams(data.exams || []);
        setHasInterest(data.hasInterests || false);
      }
    } catch (error) {
      toast.error("Error fetching user data!", { position: "bottom-center" });
    }
  }, []);

  const fetchSubOptions = useCallback(async () => {
    if (!course) return;
    try {
      const subjectsRef = doc(db, "GlobalDB", "Academia", course, "Subjects");
      const subjectsSnap = await getDoc(subjectsRef);
      setSubOptions(subjectsSnap.exists() ? subjectsSnap.data().Options || [] : []);
    } catch (error) {
      toast.error("Error fetching subjects!", { position: "bottom-center" });
    }
  }, [course]);

  const fetchExamsOptions = useCallback(async () => {
    if (!course) return;

    try {
      const examsRef = doc(db, "GlobalDB", "Academia", course, "Exams");
      const examsSnap = await getDoc(examsRef);

      if (examsSnap.exists()) {
        const examsList = examsSnap.data().Options || [];
        setExamCategories(examsList);
      }
    } catch (error) {
      toast.error("Error fetching exams!", { position: "bottom-center" });
    }
  }, [course]);

  useEffect(() => {
    if (user && course) {
      setExams([]);
      setSubjects([]);
      fetchSubOptions();
      fetchExamsOptions();
    }
  }, [user, course, fetchSubOptions, fetchExamsOptions]);

  const handleExamSelection = (exam) => {
    setExams((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  const handleSubjectSelection = (subject) => {
    setSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("No authenticated user found!", { position: "bottom-center" });
      return;
    }

    // Check if at least one subject or exam is selected
    if (subjects.length === 0 && exams.length === 0) {
      toast.error("Please select at least one Subject or Exam!", { position: "bottom-center" });
      return;
    }

    try {
      await updateDoc(doc(db, "Users", user.uid), {
        subjects: subjects || [],
        exams: exams || []
      });
      
      toast.success("Subjects and Exams Updated Successfully!", { position: "top-center" });

      if (hasInterests) {
        router.push("/interests");
      } else {
        router.push("/profile");
      }
    } catch (error) {
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
              <GraduationCap className="text-white w-8 h-8 mb-2" />
              <h1 className="text-3xl font-bold text-white">Choose Your Academic Focus</h1>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Subjects Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="text-[#18cb96] w-5 h-5" />
                    <h2 className="text-xl font-medium text-white">Your Subjects</h2>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-3">Select the subjects you're currently studying or interested in:</p>
                    <div className="flex flex-wrap gap-2">
                      {subOptions.map((subject, index) => (
                        <div
                          key={index}
                          className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all duration-300
                            ${subjects.includes(subject) 
                              ? 'border-[#18cb96] bg-[#18cb96]/10 text-white shadow-md shadow-[#18cb96]/20' 
                              : 'border-gray-700 bg-gray-700/50 text-gray-300 hover:border-gray-500'}
                          `}
                          onClick={() => handleSubjectSelection(subject)}
                        >
                          {subject}
                        </div>
                      ))}
                      {subOptions.length === 0 && (
                        <p className="text-gray-500 italic w-full text-center py-2">No subjects available for your course.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exams Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileCheck className="text-[#18cb96] w-5 h-5" />
                    <h2 className="text-xl font-medium text-white">Your Exams</h2>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-3">Select the exams you're preparing for:</p>
                    <div className="flex flex-wrap gap-2">
                      {examCategories.map((exam, index) => (
                        <div
                          key={index}
                          className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all duration-300
                            ${exams.includes(exam) 
                              ? 'border-[#18cb96] bg-[#18cb96]/10 text-white shadow-md shadow-[#18cb96]/20' 
                              : 'border-gray-700 bg-gray-700/50 text-gray-300 hover:border-gray-500'}
                          `}
                          onClick={() => handleExamSelection(exam)}
                        >
                          {exam}
                        </div>
                      ))}
                      {examCategories.length === 0 && (
                        <p className="text-gray-500 italic w-full text-center py-2">No exams available for your course.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
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
            <div className="w-3 h-3 rounded-full bg-[#18cb96]"></div>
            <div className="w-12 h-1 rounded-full bg-gray-600"></div>
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
          </div>
        </div>
        <p className="text-center text-gray-500 mt-2 text-sm">Step 2 of 3 - Academic Preferences</p>
      </div>

      <ToastContainer />
    </div>
  );
}

export default SubjectAndExams;