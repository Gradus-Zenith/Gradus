"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "./Firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import '../Styles/navbar.css';



const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userDetails, setUserDetails] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const router = useRouter();
  const availableKeywords = [
    "Machine Learning", "Deep Learning", "Artificial Intelligence", "Neural Networks", "Computer Vision",
    "Natural Language Processing", "AI Ethics", "Reinforcement Learning", "Generative AI", "Chatbots",
    "Data Science", "Big Data", "Data Analytics", "Data Visualization", "Statistics", "Probability",
    "Python Programming", "Java Programming", "C++ Programming", "C Programming", "JavaScript", "TypeScript",
    "Swift Programming", "Kotlin Programming", "Rust Programming", "Go Programming", "Ruby on Rails",
    "Django", "Flask", "FastAPI", "REST API", "GraphQL", "Backend Development", "Frontend Development",
    "Web Development", "HTML", "CSS", "React.js", "Vue.js", "Angular", "Node.js", "Express.js",
    "Blockchain", "Cryptography", "Smart Contracts", "Ethereum", "Bitcoin", "Solidity", "Web3 Development",
    "Cybersecurity", "Ethical Hacking", "Penetration Testing", "Network Security", "Cloud Security",
    "AWS", "Google Cloud Platform", "Microsoft Azure", "DevOps", "Kubernetes", "Docker", "System Design",
    "Software Engineering", "Data Structures", "Algorithms", "Competitive Programming", "Dynamic Programming",
    "Operating Systems", "Computer Networks", "Databases", "SQL", "NoSQL", "PostgreSQL", "MongoDB",
    "Firebase", "Redis", "Apache Kafka", "BigQuery", "Spark", "Hadoop", "Internet of Things",
    "Embedded Systems", "Arduino", "Raspberry Pi", "Microcontrollers", "ESP8266", "Wireless Communication",
    "Networking Basics", "CCNA", "Digital Forensics",
  
    // Robotics, Engineering & CAD
    "Robotics", "Robot Operating System", "ROS2", "Control Systems", "Autonomous Vehicles",
    "Self-Driving Cars", "SLAM", "Path Planning", "Quadcopters", "Drone Programming", "AI in Robotics",
    "Fusion 360", "SolidWorks", "AutoCAD", "3D Printing", "Engineering Design", "Mechatronics",
  
    // Science & Mathematics
    "Physics", "Quantum Computing", "Quantum Mechanics", "Relativity", "Astrophysics", "Space Exploration",
    "Rocket Science", "Aerodynamics", "Fluid Mechanics", "Thermodynamics", "Renewable Energy", "Solar Power",
    "Electrical Engineering", "Circuit Design", "Analog Electronics", "Digital Electronics", "Signal Processing",
    "Power Systems", "Microprocessors", "VLSI", "FPGA", "Mathematics", "Linear Algebra", "Calculus",
    "Differential Equations", "Discrete Mathematics", "Number Theory", "Graph Theory", "Combinatorics",
    "Trigonometry", "Mathematical Logic",
  
    // Business, Economics & Finance
    "Economics", "Finance", "Investment Strategies", "Stock Market", "Cryptocurrency Trading", "Accounting",
    "Business Analysis", "Marketing", "SEO", "Social Media Marketing", "Content Marketing", "Entrepreneurship",
    "Startup Growth", "E-commerce", "Project Management", "Financial Modeling", "Risk Management",
  
    // Social Sciences & Humanities
    "Psychology", "Cognitive Science", "Behavioral Economics", "Sociology", "Political Science", "History",
    "Geography", "Philosophy", "Linguistics", "English Grammar", "Creative Writing", "Public Speaking",
    "Communication Skills", "Leadership", "Time Management", "Productivity Hacks",
  
    // Health, Medicine & Wellness
    "Biology", "Genetics", "Neuroscience", "Bioinformatics", "Biotechnology", "Biomedical Engineering",
    "Medicine", "Healthcare", "Anatomy", "Physiology", "Pharmacology", "Nutrition", "Sports Science",
    "Mental Health", "Meditation", "Yoga", "Fitness", "Wellness", "Public Health",
  
    // Arts, Entertainment & Media
    "Music Production", "Sound Design", "Animation", "VFX", "Video Editing", "3D Modeling", "Photography",
    "Graphic Design", "Digital Art", "Art History", "Film Studies", "Theater", "Creative Writing",
    "Storytelling", "Content Creation", "Podcasting", "Broadcasting",
  
    // Gaming & Virtual Worlds
    "Game Development", "Unity 3D", "Unreal Engine", "VR Development", "Augmented Reality", "eSports",
    "Game Design", "Game Art", "Level Design", "Indie Games", "Mobile Gaming", "PC Gaming", "Console Gaming",
  
    // Advanced AI Applications
    "AI with TensorFlow", "AI with PyTorch", "AI for Healthcare", "AI for Finance", "AI for Business",
    "AI for Cybersecurity", "AI for Game Development", "AI for Education", "AI for Law", "AI for Agriculture",
    "AI in Climate Change", "AI in Retail", "AI in Real Estate", "AI for Edge Computing", "AI for IoT",
    "AI for Smart Cities", "AI for Autonomous Systems", "AI for Finance Forecasting", "AI for Music",
    "AI for Art Generation", "AI for Robotics Vision", "AI for Language Translation", "AI for Chatbots",
    "AI for Speech Recognition", "AI for Video Analysis", "AI for Fraud Detection", "AI for Personalized Learning",
    "AI for Predictive Maintenance", "AI for Supply Chain Optimization", "AI for Marketing Automation",
    "AI for Personalized Healthcare", "AI for Scientific Research", "AI for Smart Homes", "AI for Industrial Automation",
  
    // Miscellaneous
    "Travel", "Tourism", "Adventure", "Cooking", "Food Recipes", "Gardening", "DIY Projects", "Home Improvement",
    "Real Estate", "Automotive", "Fashion", "Lifestyle", "Environment", "Sustainability", "Ethics", "Law",
    "Education", "Online Courses", "Self Improvement", "Motivation", "Career Development", "Job Hunting",
    "Remote Work", "Freelancing", "Startups", "Innovation", "Research", "Statistics", "Data Mining", "Cloud Storage",
    "Virtual Reality", "Mixed Reality", "Metaverse", "Smart Devices", "Wearable Technology", "Biometrics",
    "Urban Planning", "Smart Manufacturing", "Supply Chain", "Logistics", "Customer Relationship Management",
    "Sales Strategy", "Digital Marketing", "Brand Management", "User Experience", "UI Design", "UX Research",
  
    // Additional Niche Topics
    "Robotics Process Automation", "Computer Vision in Healthcare", "Digital Transformation", "Smart Contracts Development",
    "Edge AI", "Serverless Computing", "Data Lakes", "Predictive Analytics", "Quantum Cryptography", "Machine Vision",
    "Ethical Hacking Techniques", "Virtual Assistants", "Internet Security", "Network Administration", "Scalable Systems",
    "High-Performance Computing", "Parallel Computing", "Algorithm Optimization", "Data Warehousing", "Time Series Analysis",
    "Behavioral Analytics", "Customer Segmentation", "Mobile App Development", "Responsive Design", "Cross-Platform Development"
  ];
  useEffect(() => {
    const fetchUserDetails = async () => {
      const user = auth.currentUser;
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
      } else {
        setUserDetails(null);
      }
    };

    fetchUserDetails();
    const unsubscribe = auth.onAuthStateChanged(fetchUserDetails);
    return () => unsubscribe();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${searchQuery}`);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.length) {
      setSuggestions(availableKeywords.filter((keyword) => keyword.toLowerCase().includes(value.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  };

  const handelProfile = () =>{
    window.location.href = `https://gradus1-0-1.onrender.com//profile`;
  }

  const handelRevise = () =>{
    window.location.href = `https://gradus1-0-1.onrender.com//revise`;
  }

  const handelPlaylist = () =>{
    window.location.href = `https://gradus1-0-1.onrender.com//playlists`;
  }

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
  };

  return (
    <nav className="navbar border-b-2 pb-2 border-green-300">
      <div className="navbar-content">
        <div className="navbar-logo">
          <Link href="/welcome">
            <img src='https://res.cloudinary.com/dlsgdlo8u/image/upload/v1742127578/gradus_logo-rbg_wuzawn.png' alt="Logo" width={150} height={50} />
          </Link>
        </div>

        <div className="search-container">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleInputChange}
            />
            <button type="submit" className="search-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            {suggestions.length > 0 && (
              <ul className="fixed top-14 left-[34rem] bg-darkBlueGray rounded-lg w-[30%] text-white">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <li
                    className="cursor-pointer mt-2"
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}

          </form>
        </div>

        <div className="navbar-actions">
          <Link href="/welcome" className="switch-button">Switch</Link>
          <div className="profile-container">
            <div className="profile-image" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <img src={userDetails?.photo} alt="Profile" width={40} height={40} className="rounded-full" />
            </div>
            {isProfileOpen && userDetails && (
              <div className="profile-popup border border-green-300">
                <div className="profile-header">
                  <div className="profile-photo">
                    <img src={userDetails.photo} alt="Profile" width={40} height={40} className="rounded-full" />
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">{userDetails.name}</div>
                    <div className="view-profile text-white" onClick={handelProfile}>View Your Profile</div>
                  </div>
                </div>
                <div className="menu-items">
                  <div className="menu-item cursor-pointer" onClick={handelPlaylist}>Your Saved Playlists</div>
                  <div className="menu-item" onClick={handelRevise}>Revise</div>
                  <div className="menu-item" onClick={async () => { await auth.signOut(); window.location.href = "https://gradus1-0-1.onrender.com//login"}}>Log-out</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
