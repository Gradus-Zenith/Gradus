import React, { useEffect, useState } from "react";
import { auth, db } from "./Firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import dayjs from "dayjs";

const TimeTracker = () => {
  const [timeSpent, setTimeSpent] = useState(0);
  const [user, setUser] = useState(null);
  const [isPageActive, setIsPageActive] = useState(true);
  let timer = null;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  
  useEffect(() => {
    if (!user) return;

    const today = dayjs().format("YYYY-MM-DD");
    const fetchTimeSpent = async () => {
      const docRef = doc(db, "Users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().activity && docSnap.data().activity[today]) {
        setTimeSpent(docSnap.data().activity[today]); // ✅ Load previous timeSpent correctly
      } else {
        setTimeSpent(0);
      }
    };

    fetchTimeSpent();
  }, [user]);

  useEffect(() => {
    if (!user || !isPageActive) return;

    timer = setInterval(() => {
      setTimeSpent((prev) => {
        const newTime = prev + 1;
        saveTimeToFirebase(newTime); 
        return newTime;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [isPageActive, user]);


  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageActive(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);


  const saveTimeToFirebase = async (time) => {
    if (!user) return;
    const today = dayjs().format("YYYY-MM-DD");

    await setDoc(
      doc(db, "Users", user.uid),
      {
        activity: { [today]: time },
      },
      { merge: true }
    );
  };

  return null; 
};

export default TimeTracker;
