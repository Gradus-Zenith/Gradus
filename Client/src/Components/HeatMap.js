import React, { useEffect, useState } from "react";
import { db, auth } from "./Firebase";
import { doc, getDoc } from "firebase/firestore";
import dayjs from "dayjs";
import "dayjs/locale/en";
import localeData from "dayjs/plugin/localeData";
dayjs.extend(localeData);

const Heatmap = () => {
  const [activityData, setActivityData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(dayjs().month() + 1);
  const [currentYear, setCurrentYear] = useState(dayjs().year());

  
  useEffect(() => {
    const fetchActivityData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setActivityData(userSnap.data().activity || {});
        }
      }
    };

    fetchActivityData();
  }, []);

  // Get Color Based on Time Spent
  const getColor = (timeSpent) => {
    if (timeSpent > 120) return "bg-green-900";
    if (timeSpent > 60) return "bg-green-800";
    if (timeSpent > 30) return "bg-green-600";
    if (timeSpent > 15) return "bg-green-400";
    if (timeSpent > 0) return "bg-green-200";
    return "bg-gray-200";
  };

  // Render Heatmap for Three Months
  const renderHeatmap = () => {
    const monthGrids = [];
    for (let m = 2; m >= 0; m--) {
      const month = currentMonth - m <= 0 ? 12 + (currentMonth - m) : currentMonth - m;
      const year = currentMonth - m <= 0 ? currentYear - 1 : currentYear;
      const startOfMonth = dayjs().year(year).month(month - 1).startOf('month');
      const endOfMonth = dayjs().year(year).month(month - 1).endOf('month');
      const daysInMonth = endOfMonth.date();
      const firstDayOfWeek = startOfMonth.day();
      const days = [];

      // Add empty divs for alignment (if month doesn't start on Sunday)
      for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(<div key={`empty-${month}-${i}`} className="w-6 h-6" />);
      }

      // Add days with activity data
      for (let d = 1; d <= daysInMonth; d++) {
        const date = dayjs().year(year).month(month - 1).date(d).format("YYYY-MM-DD");
        const timeSpent = activityData[date] || 0;
        days.push(
          <div
            key={date}
            className={`w-6 h-6 rounded-md ${getColor(timeSpent)}`}
            title={`${date}: ${timeSpent} mins`}
          />
        );
      }

      // Push the month grid to the main array
      monthGrids.push(
        <div key={month} className="mx-2">
          <h3 className="text-md mb-1 text-white">{dayjs().year(year).month(month - 1).format("MMM YYYY")}</h3>
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>
        </div>
      );
    }
    return monthGrids;
  };

  // Navigation Handlers
  const handlePrevious = () => {
    const newMonth = currentMonth - 3;
    if (newMonth <= 0) {
      setCurrentMonth(12 + newMonth);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(newMonth);
    }
  };

  const handleNext = () => {
    const newMonth = currentMonth + 3;
    if (newMonth > 12) {
      setCurrentMonth(newMonth - 12);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(newMonth);
    }
  };

  // Check if Next Button should be Disabled
  const isNextDisabled = () => {
    const nextDate = dayjs().year(currentYear).month(currentMonth - 1).add(3, "month");
    return nextDate.isAfter(dayjs());
  };

  return (
    <div className="relative text-center  h-[13.5rem]">
      <div className="flex justify-center space-x-4">
        {renderHeatmap()}
      </div>
      <div className="absolute bottom-4 right-4">
        <button
          onClick={handlePrevious}
          className="bg-green-400 text-black rounded-md mr-3 relative top-6 w-20 text-sm font-semibold"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          className="bg-green-400 text-black rounded-md relative top-6 w-12 text-sm font-semibold"
          disabled={isNextDisabled()}
        >
          Next
        </button>
      </div>
    </div>
  );

};

export default Heatmap;
