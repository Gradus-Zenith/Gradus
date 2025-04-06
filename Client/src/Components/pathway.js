"use client"
import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState, useEffect, useRef } from 'react';
import styles from "../Styles/pathway.module.css";
import { auth, db } from "./Firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const ParticleBackground = React.memo(() => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const particles = [];

        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = document.documentElement.scrollHeight;
        };

        setCanvasSize();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.color = "#00ffa3";
                this.opacity = Math.random() * 0.5 + 0.1;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }

            draw() {
                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const createParticles = () => {
            for (let i = 0; i < 150; i++) {
                particles.push(new Particle());
            }
        };

        const connectParticles = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = "#00ffa3";
                        ctx.globalAlpha = 0.1;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }

            connectParticles();
            requestAnimationFrame(animate);
        };

        createParticles();
        animate();

        const handleResize = () => {
            setCanvasSize();
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none" />;
});


// Constants from original code
const INSTRUCTION_PROMPT = `<System>
You are an educational pathway specialist who generates structured 10-point learning pathways to help users learn a topic systematically.

<INPUT_FORMAT>
- TOPIC: {topic_name}
- DIFFICULTY: {beginner|intermediate|advanced}
- PREREQUISITES: {yes|no}
</INPUT_FORMAT>

<RULES>
1. Generate exactly 10 sequential learning steps
2. If PREREQUISITES=yes, include foundational concepts in steps 1-3
3. Adapt content depth based on DIFFICULTY level
4. Each step must build upon previous knowledge
5. Keep steps concise and actionable
</RULES>

<DIFFICULTY_GUIDELINES>
- BEGINNER: Focus on fundamental concepts and basic applications
- INTERMEDIATE: Include practical applications and moderate complexity
- ADVANCED: Cover complex concepts and advanced implementations
</DIFFICULTY_GUIDELINES>

<CONSTRAINTS>
- Each step must be self-contained
- Avoid redundant information
- Maintain logical progression
- Focus on practical learning outcomes
</CONSTRAINTS>

<OUTPUT_FORMAT>
Provide the output in **valid JSON format** as an array of 10 objects.  
Each object should have:
- "heading": A short title summarizing the step.
- "description": A **brief, precise** explanation (max 15 words).
</OUTPUT_FORMAT>
</System>`;

const INSTRUCTION_PROMPT_VIDEO = `<System>
You are an AI that converts structured learning pathways into effective **video search prompts** to help users find educational videos.

<INPUT_FORMAT>
A JSON array of learning steps, where each step contains:
- "heading": A short title summarizing the step.
- "description": A brief explanation of the learning objective.
</INPUT_FORMAT>

<OUTPUT_RULES>
1. Generate **one precise search prompt per step** unless multiple topics **must** be covered separately.
2. Only create **extra prompts** if a single query **cannot cover all essential subtopics**.
3. Keep prompts **concise but informative** (5-7 words).
4. Each prompt should be optimized for **finding high-quality educational videos**.
5. Each prompt should be structured for optimal search visibility on YouTube.
5. Use **natural language phrasing** to improve search results.
6. Include relevant **keywords and variations** to enhance search accuracy.
7. Ensure logical **progression** in search topics, avoiding redundancy.
</OUTPUT_RULES>

<OUTPUT_FORMAT>
Return a **valid JSON object**:
{
  "Heading 1": ["query1", "query2", "query3"](only multiple if necessary),
"Heading 2": ["query1"],
"Heading 3": ["query1"],...
}
</OUTPUT_FORMAT>
</System>`;

function App() {
    const [user, setUser] = useState(null);
    const [model, setModel] = useState(null);
    const [modelVideo, setModelVideo] = useState(null);
    const [learningSteps, setLearningSteps] = useState([]);
    const [activeTab, setActiveTab] = useState('learning-path');
    const [showVideoSuggestions, setShowVideoSuggestions] = useState(false);
    const [videoSuggestions, setVideoSuggestions] = useState(null);
    const [showPathwayModal, setShowPathwayModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [pathwayDetails, setPathwayDetails] = useState(null);
    const [videoAlternatives, setVideoAlternatives] = useState(new Map());
    const [suggestedVideoIds, setSuggestedVideoIds] = useState(new Set());
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState("")
    const [prerequisites, setPrerequisites] = useState("no");
    const [usedVideoIds, setUsedVideoIds] = useState(new Set());

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            }
        });

        return () => unsubscribe();
    }, []);

    // Initialize models on component mount
    useEffect(() => {
        const initializeModels = async () => {
            const genAI = new GoogleGenerativeAI("AIzaSyAUfL_KrYf9rY599fGi2v63IR2Z_PmMMcw");
            const modelConfig = {
                model: "gemini-2.0-flash-thinking-exp-01-21",
                temperature: 0.3
            };

            setModel(await genAI.getGenerativeModel(modelConfig));
            setModelVideo(await genAI.getGenerativeModel({ ...modelConfig, temperature: 0.6 }));
        };

        initializeModels();
    }, []);

    const generateLearningPath = async () => {
        if (!model) return;

        // Reset all video-related states when generating new path
        setSuggestedVideoIds(new Set());
        setVideoAlternatives(new Map());
        setVideoSuggestions(null);
        setShowVideoSuggestions(false);
        // Note: We don't reset usedVideoIds as we want to maintain global uniqueness

        const difficultyMap = { easy: 'beginner', medium: 'intermediate', hard: 'advanced' };

        try {
            const result = await model.generateContent({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `${INSTRUCTION_PROMPT}\n\nTOPIC: ${topic}\nDIFFICULTY: ${difficultyMap[difficulty]}\nPREREQUISITES: ${prerequisites}\n`
                    }]
                }]
            });

            const response = await result.response;
            let text = response.text().replace(/```json\n/g, '').replace(/```/g, '').trim();
            setLearningSteps(JSON.parse(text));
        } catch (error) {
            console.error("Error generating content:", error);
        }
    };

    const searchYouTubeVideo = async (query, maxAttempts = 5) => {
        try {
            // Try up to 3 times to get unique videos
            let attempts = 0;
            let uniqueVideos = [];

            while (uniqueVideos.length < maxAttempts && attempts < 3) {
                const response = await fetch('https://gradus1-0.onrender.com/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query,
                        maxResults: maxAttempts * 2 // Request more videos to account for filtering
                    })
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();

                if (data.items?.length > 0) {
                    const newVideos = data.items
                        .filter(item =>
                            !usedVideoIds.has(item.id) && // Filter out globally used videos
                            !suggestedVideoIds.has(item.id) // Filter out videos used in current session
                        )
                        .map(item => ({
                            videoId: item.id,
                            title: item.snippet.title,
                            thumbnail: item.snippet.thumbnail,
                            channelTitle: item.snippet.channelTitle
                        }));

                    uniqueVideos = [...uniqueVideos, ...newVideos].slice(0, maxAttempts);
                }

                attempts++;
            }

            // Update the sets of used videos
            uniqueVideos.forEach(video => {
                setUsedVideoIds(prev => new Set([...prev, video.videoId]));
                setSuggestedVideoIds(prev => new Set([...prev, video.videoId]));
            });

            return uniqueVideos;
        } catch (error) {
            console.error('Error searching YouTube:', error);
            return [];
        }
    };

    const handleSuggestVideos = async () => {
        if (!modelVideo) return;

        // Reset video tracking for new suggestions
        setSuggestedVideoIds(new Set());
        setVideoAlternatives(new Map());

        const selectedTopics = Array.from(document.querySelectorAll('.topic-checkbox'))
            .reduce((acc, checkbox, index) => {
                if (checkbox.checked) {
                    const heading = checkbox.parentElement.querySelector('h3').textContent;
                    acc.push({
                        index,
                        heading: heading.substring(heading.indexOf('. ') + 2)
                    });
                }
                return acc;
            }, []);

        try {
            const result = await modelVideo.generateContent({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `${INSTRUCTION_PROMPT_VIDEO}\n\nSelected Topics: ${JSON.stringify(selectedTopics, null, 2)}`
                    }]
                }]
            });

            const response = await result.response;
            let text = response.text().replace(/```json\n/g, '').replace(/```/g, '').trim();
            const suggestions = JSON.parse(text);

            // Track videos used in current pathway
            const currentPathwayVideos = new Set();

            const allQueries = Object.entries(suggestions).map(([heading, queries]) => ({
                heading,
                queries: Array.isArray(queries) ? queries : [queries]
            }));

            const batchSize = 3;
            const processedSuggestions = [];

            for (let i = 0; i < allQueries.length; i += batchSize) {
                const batch = allQueries.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(async ({ heading, queries }) => {
                        const primaryQuery = queries[0];
                        const response = await fetch('https://gradus1-0.onrender.com/search', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                query: primaryQuery,
                                maxResults: 10 // Increased to have more options for filtering
                            })
                        });

                        if (!response.ok) return { heading, videos: [] };

                        const data = await response.json();

                        if (!data.items?.length) return { heading, videos: [] };

                        // Strict filtering for duplicates
                        const uniqueVideos = data.items
                            .filter(item => {
                                // Check against both global and current pathway videos
                                const isUnique = !usedVideoIds.has(item.id) && !currentPathwayVideos.has(item.id);
                                if (isUnique) {
                                    currentPathwayVideos.add(item.id); // Add to current pathway tracking
                                    setUsedVideoIds(prev => new Set([...prev, item.id])); // Add to global tracking
                                }
                                return isUnique;
                            })
                            .map(item => ({
                                videoId: item.id,
                                title: item.snippet.title,
                                thumbnail: item.snippet.thumbnail,
                                channelTitle: item.snippet.channelTitle,
                                query: primaryQuery
                            }));

                        if (uniqueVideos.length > 0) {
                            // Store alternatives with only unique videos
                            setVideoAlternatives(prev =>
                                prev.set(`${heading}-${primaryQuery}`, {
                                    currentIndex: 0,
                                    videos: uniqueVideos,
                                    query: primaryQuery
                                })
                            );

                            return {
                                heading,
                                videos: [uniqueVideos[0]]
                            };
                        }

                        return { heading, videos: [] };
                    })
                );

                processedSuggestions.push(...batchResults.filter(result => result.videos.length > 0));
            }

            setVideoSuggestions(processedSuggestions);
            setShowVideoSuggestions(true);
            setActiveTab('video-suggestions');

            // Background loading of alternatives with duplicate checking
            setTimeout(() => {
                allQueries.forEach(({ heading, queries }) => {
                    queries.slice(1).forEach(query => {
                        fetch('https://gradus1-0.onrender.com/search', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                query,
                                maxResults: 10
                            })
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data.items?.length) {
                                    const alternativeVideos = data.items
                                        .filter(item => {
                                            const isUnique = !usedVideoIds.has(item.id) && !currentPathwayVideos.has(item.id);
                                            if (isUnique) {
                                                currentPathwayVideos.add(item.id);
                                                setUsedVideoIds(prev => new Set([...prev, item.id]));
                                            }
                                            return isUnique;
                                        })
                                        .map(item => ({
                                            videoId: item.id,
                                            title: item.snippet.title,
                                            thumbnail: item.snippet.thumbnail,
                                            channelTitle: item.snippet.channelTitle,
                                            query
                                        }));

                                    if (alternativeVideos.length > 0) {
                                        setVideoAlternatives(prev => {
                                            const existing = prev.get(`${heading}-${query}`) || { currentIndex: 0, videos: [], query };
                                            return prev.set(`${heading}-${query}`, {
                                                ...existing,
                                                videos: [...existing.videos, ...alternativeVideos]
                                            });
                                        });
                                    }
                                }
                            })
                            .catch(console.error);
                    });
                });
            }, 100);

        } catch (error) {
            console.error("Error generating video suggestions:", error);
        }
    };

    const createPathway = async (userId, name, selectedVideos) => {
        try {
            const userDocRef = doc(db, "Users", userId);
            const userDocSnap = await getDoc(userDocRef);

            // Get existing savedPlaylists or initialize an empty object
            const existingData = userDocSnap.exists() ? userDocSnap.data().savedPlaylists || {} : {};

            // Generate a unique ID for the new playlist
            const playlistId = uuidv4();

            // Get the first video's thumbnail
            const firstVideoThumbnail = Object.values(selectedVideos)[0]?.thumbnail || '';

            // Define the new playlist structure
            const newPlaylist = {
                channelName: "Gradus",
                playName: name,
                playThumbnail: firstVideoThumbnail,
                savedAt: new Date().toISOString(),
                videos: selectedVideos,
            };

            // Update the Firestore document
            await setDoc(userDocRef, {
                savedPlaylists: {
                    ...existingData,
                    [playlistId]: newPlaylist,
                }
            }, { merge: true });

            setPathwayDetails({ name, videoCount: Object.keys(selectedVideos).length });
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Error storing pathway:", error);
        }
    };

    const handleNextVideo = (heading, query) => {
        const key = `${heading}-${query}`;
        const alternatives = videoAlternatives.get(key);

        if (alternatives) {
            const nextIndex = (alternatives.currentIndex + 1) % alternatives.videos.length;
            const nextVideo = alternatives.videos[nextIndex];

            // Add the newly displayed video ID to the set
            setSuggestedVideoIds(prev => new Set([...prev, nextVideo.videoId]));

            setVideoAlternatives(prev => prev.set(key, {
                ...alternatives,
                currentIndex: nextIndex
            }));

            setVideoSuggestions(prev => prev.map(suggestion => {
                if (suggestion.heading === heading) {
                    return {
                        ...suggestion,
                        videos: suggestion.videos.map(video => {
                            if (video.query === query) {
                                return {
                                    ...nextVideo,
                                    query
                                };
                            }
                            return video;
                        })
                    };
                }
                return suggestion;
            }));
        }
    };

    const handlePreviousVideo = (heading, query) => {
        const key = `${heading}-${query}`;
        const alternatives = videoAlternatives.get(key);

        if (alternatives) {
            const prevIndex = (alternatives.currentIndex - 1 + alternatives.videos.length) % alternatives.videos.length;
            const prevVideo = alternatives.videos[prevIndex];

            // Add the newly displayed video ID to the set
            setSuggestedVideoIds(prev => new Set([...prev, prevVideo.videoId]));

            setVideoAlternatives(prev => prev.set(key, {
                ...alternatives,
                currentIndex: prevIndex
            }));

            setVideoSuggestions(prev => prev.map(suggestion => {
                if (suggestion.heading === heading) {
                    return {
                        ...suggestion,
                        videos: suggestion.videos.map(video => {
                            if (video.query === query) {
                                return {
                                    ...prevVideo,
                                    query
                                };
                            }
                            return video;
                        })
                    };
                }
                return suggestion;
            }));
        }
    };


    // const ParticleBackground = () => {
    //     const canvasRef = useRef(null);

    //     useEffect(() => {
    //         const canvas = canvasRef.current;
    //         const ctx = canvas.getContext("2d");
    //         const particles = [];

    //         canvas.width = window.innerWidth;
    //         canvas.height = document.documentElement.scrollHeight;

    //         class Particle {
    //             constructor() {
    //                 this.x = Math.random() * canvas.width;
    //                 this.y = Math.random() * canvas.height;
    //                 this.size = Math.random() * 2 + 1;
    //                 this.speedX = Math.random() * 0.5 - 0.25;
    //                 this.speedY = Math.random() * 0.5 - 0.25;
    //                 this.color = "#00ffa3";
    //                 this.opacity = Math.random() * 0.5 + 0.1;
    //             }

    //             update() {
    //                 this.x += this.speedX;
    //                 this.y += this.speedY;

    //                 if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    //                 if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    //             }

    //             draw() {
    //                 ctx.fillStyle = this.color;
    //                 ctx.globalAlpha = this.opacity;
    //                 ctx.beginPath();
    //                 ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    //                 ctx.fill();
    //             }
    //         }

    //         const createParticles = () => {
    //             for (let i = 0; i < 100; i++) {
    //                 particles.push(new Particle());
    //             }
    //         };

    //         const connectParticles = () => {
    //             for (let i = 0; i < particles.length; i++) {
    //                 for (let j = i; j < particles.length; j++) {
    //                     const dx = particles[i].x - particles[j].x;
    //                     const dy = particles[i].y - particles[j].y;
    //                     const distance = Math.sqrt(dx * dx + dy * dy);

    //                     if (distance < 100) {
    //                         ctx.beginPath();
    //                         ctx.strokeStyle = "#00ffa3";
    //                         ctx.globalAlpha = 0.1;
    //                         ctx.lineWidth = 1;
    //                         ctx.moveTo(particles[i].x, particles[i].y);
    //                         ctx.lineTo(particles[j].x, particles[j].y);
    //                         ctx.stroke();
    //                     }
    //                 }
    //             }
    //         };

    //         const animate = () => {
    //             ctx.clearRect(0, 0, canvas.width, canvas.height);

    //             for (let i = 0; i < particles.length; i++) {
    //                 particles[i].update();
    //                 particles[i].draw();
    //             }

    //             connectParticles();
    //             requestAnimationFrame(animate);
    //         };

    //         createParticles();
    //         animate();

    //         const handleResize = () => {
    //             canvas.width = window.innerWidth;
    //             canvas.height = window.innerHeight;
    //         };

    //         window.addEventListener("resize", handleResize);

    //         return () => {
    //             window.removeEventListener("resize", handleResize);
    //         };
    //     }, []);

    //     return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />;
    // };

    return (
        <div>
            <ParticleBackground />
            <div className="bg-darkBlueGray min-h-screen">
                <div className={`${styles.container}  border border-white  rounded-lg`}>
                    <h1 className="text-white text-3xl text-center">Orion Study Blueprints</h1>


                    <div className={`${styles.inputGroup}`}>
                        <label className="text-green-300" htmlFor="topic">
                            What would you like to learn?
                        </label>
                        <input
                            className="bg-gray-500 text-white placeholder-white"
                            type="text"
                            id="topic"
                            placeholder="Enter a topic (e.g., Python, Machine Learning, Web Development)"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                    </div>


                    <div className={`${styles.inputGroup} `}>
                        <label className="text-green-300" htmlFor="difficulty">Select Difficulty Level:</label>
                        <select className="bg-gray-500 text-white" id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                            <option className="text-black" value="easy">Easy</option>
                            <option className="text-black" value="medium">Medium</option>
                            <option className="text-black" value="hard">Hard</option>
                        </select>
                    </div>

                    <div className={`${styles.inputGroup}`}>
                        <label className="text-green-300" >Do you want to include prerequisites?</label>
                        <div className={`${styles.radioGroup}`}>
                            <div className={`${styles.radioOption}`}>
                                <input
                                    className="w-4 h-4 relative bottom-1"
                                    type="radio"
                                    id="prereq-yes"
                                    name="prerequisites"
                                    value="yes"
                                    checked={prerequisites === "yes"}
                                    onChange={(e) => setPrerequisites(e.target.value)}
                                />
                                <label className="text-green-300" htmlFor="prereq-yes">Yes</label>
                            </div>
                            <div className={`${styles.radioOption}`}>
                                <input
                                    className="w-4 h-4 relative bottom-1"
                                    type="radio"
                                    id="prereq-no"
                                    name="prerequisites"
                                    value="no"
                                    checked={prerequisites === "no"}
                                    onChange={(e) => setPrerequisites(e.target.value)}
                                />
                                <label className="text-green-300" htmlFor="prereq-no">No</label>
                            </div>
                        </div>
                    </div>

                    <button className="text-green-300 relative left-[17rem] border border-white rounded-none p-3" onClick={generateLearningPath}>Generate Learning Path</button>

                    {/* Results Section */}
                    {learningSteps.length > 0 && (
                        <div className={`${styles.results}`} id="results">
                            <div className={`${styles.tabs}`}>
                                <button
                                    className={`${styles.tabButton} text-white ${activeTab === 'learning-path' ? styles.active : ''}`}
                                    onClick={() => setActiveTab('learning-path')}
                                >
                                    Learning Path
                                </button>
                                <button
                                    className={`${styles.tabButton} text-white ${activeTab === 'video-suggestions' ? styles.active : ''}`}
                                    onClick={() => setActiveTab('video-suggestions')}
                                    disabled={!showVideoSuggestions}
                                >
                                    Video Suggestions
                                </button>
                            </div>

                            {/* Learning Path Tab */}

                            <div className={`${styles.tabContent} ${activeTab === 'learning-path' ? styles.active : ''}`}>
                                <h2 className={`${styles.h2} text-white`}>Learning Path</h2>
                                {learningSteps.map((step, index) => (
                                    <div key={index} className={`${styles.learningStep} bg-darkBlueGray`}>
                                        <div className={`${styles.stepHeader} `}>
                                            <input type="checkbox" id={`step-${index}`} className={`topic-checkbox ${styles.topicCheckbox}`} defaultChecked />
                                            <h3 className={`${styles.h3} text-green-300`}>{index + 1}. {step.heading}</h3>
                                        </div>
                                        <p className={`${styles.p} text-white`}>{step.description}</p>
                                    </div>
                                ))}
                                <button className={`${styles.suggestVideosBtn}`} onClick={handleSuggestVideos}>
                                    Suggest Videos for Selected Topics
                                </button>
                            </div>


                            {/* Video Suggestions Tab */}
                            <div className={`${styles.tabContent} ${activeTab === 'video-suggestions' ? styles.active : ''}`}>
                                {showVideoSuggestions && (
                                    <>
                                        <h2 className="text-white text-center text-2xl mb-4">Recommended Videos</h2>
                                        {videoSuggestions?.map((suggestion, index) => (
                                            <div key={index} className={`${styles.videoSuggestion}`}>
                                                <h4 className="text-green-300">{suggestion.heading}</h4>
                                                <div className={`${styles.videoContainer}`}>
                                                    {suggestion.videos.map((video, vIndex) => (
                                                        <div key={vIndex} className={`video-item ${styles.videoItems}`} data-video-id={video.videoId}>
                                                            <div className={`${styles.videoCheckboxContainer}`}>
                                                                <input type="checkbox" className={`video-checkbox ${styles.videoCheckbox}`} id={`video-${video.videoId}`} defaultChecked />
                                                                <label htmlFor={`video-${video.videoId}`} className={`${styles.checkboxLabel}`}></label>
                                                            </div>
                                                            <div className={`${styles.videoContent}`}>
                                                                <div className={`${styles.videoThumbnail} video-thumbnail`}>
                                                                    <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">
                                                                        <img src={video.thumbnail} alt={video.title} />
                                                                        <div className={`${styles.playButton}`}>
                                                                            <svg viewBox="0 0 24 24">
                                                                                <path fill="#fff" d="M8 5v14l11-7z" />
                                                                            </svg>
                                                                        </div>
                                                                    </a>
                                                                </div>
                                                                <div className={`${styles.videoInfo}`}>
                                                                    <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" className={`${styles.videoTitle} video-title text-green-300`}>
                                                                        {video.title}
                                                                    </a>
                                                                    <div className={`${styles.channelName} channel-name text-green-300`}>
                                                                        <span className={`${styles.educatorLabel}`}>Educator:</span> {video.channelTitle}
                                                                    </div>
                                                                    <div className={`${styles.videoControls}`}>
                                                                        <button
                                                                            className={`${styles.videoControlBtn}`}
                                                                            onClick={() => handlePreviousVideo(suggestion.heading, video.query)}
                                                                        >
                                                                            <ArrowLeft size={20} />
                                                                        </button>
                                                                        <button
                                                                            className={`${styles.videoControlBtn} w-[5rem] h-7`}
                                                                            onClick={() => handleNextVideo(suggestion.heading, video.query)}
                                                                        >
                                                                            <span className="relative right-5 ml-2">Switch</span><span className="relative bottom-5 left-8"><ArrowRight size={20} /></span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <div className={`${styles.pathwayFooter} text-center`}>
                                            <button className={`${styles.createPathwayBtn} text-black bg-green-300 border border-white p-1 font-semibold `} onClick={() => setShowPathwayModal(true)}>
                                                Create Pathway
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Modals */}
                    {showPathwayModal && (
                        <div className={`${styles.pathwayModalOverlay}`}>
                            <div className={`${styles.pathwayModal} `}>
                                <div className={`${styles.modalHeader} text-green-300 text-xl`}>
                                    <h3>Create new pathway</h3>
                                    <button className={`${styles.closeModal}`} onClick={() => setShowPathwayModal(false)}>&times;</button>
                                </div>
                                <div className={`${styles.modalContent}`}>
                                    <input
                                        type="text"
                                        id="pathway-name"
                                        placeholder="Enter pathway name"
                                        className={`${styles.pathwayNameInput} bg-black text-white placeholder-white`}
                                        maxLength={150}
                                    />
                                    <div className={`${styles.modalButtons}`}>
                                        <button className={`${styles.modalCancel} text-green-300`} onClick={() => setShowPathwayModal(false)}>Cancel</button>
                                        <button
                                            className={`${styles.modalCreate} bg-green-300 text-black font-semibold`}
                                            onClick={async () => {
                                                if (!user) {
                                                    alert("User is not logged in!");
                                                    return;
                                                }

                                                const name = document.getElementById('pathway-name').value.trim();
                                                if (!name) {
                                                    alert('Please enter a pathway name');
                                                    return;
                                                }

                                                // Check if playlist name already exists
                                                const userDocRef = doc(db, "Users", user.uid);
                                                const userDocSnap = await getDoc(userDocRef);
                                                const existingPlaylists = userDocSnap.exists() ? userDocSnap.data().savedPlaylists || {} : {};

                                                // Check if any existing playlist has the same name
                                                const playlistExists = Object.values(existingPlaylists).some(
                                                    playlist => playlist.playName.toLowerCase() === name.toLowerCase()
                                                );

                                                if (playlistExists) {
                                                    alert('A playlist with this name already exists');
                                                    return;
                                                }

                                                const selectedVideos = Array.from(document.querySelectorAll('.video-item'))
                                                    .filter(item => item.querySelector('.video-checkbox').checked)
                                                    .reduce((acc, item) => {
                                                        const videoId = item.dataset.videoId;
                                                        // Convert thumbnail URL to HD version
                                                        const thumbnailUrl = item.querySelector('.video-thumbnail img').src;
                                                        const baseUrl = thumbnailUrl.split('/')[0] + '//' + thumbnailUrl.split('/')[2] + '/vi/' + videoId;

                                                        // Store details in the specified sequence: channelName, seen, thumbnail, title
                                                        acc[videoId] = {
                                                            channelName: item.querySelector('.channel-name').textContent.replace('Educator: ', ''),
                                                            seen: false,
                                                            thumbnail: baseUrl + '/hqdefault.jpg',
                                                            title: item.querySelector('.video-title').textContent
                                                        };
                                                        return acc;
                                                    }, {});

                                                if (Object.keys(selectedVideos).length === 0) {
                                                    alert('Please select at least one video');
                                                    return;
                                                }

                                                setShowPathwayModal(false);
                                                createPathway(user.uid, name, selectedVideos);
                                            }}
                                        >
                                            Create
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showSuccessModal && pathwayDetails && (
                        <div className={`${styles.pathwayModalOverlay} ${styles.successModalOverlay}`}>
                            <div className={`${styles.pathwayModal} ${styles.successModal}`}>
                                <div className={`${styles.modalHeader}`}>
                                    <h3>Success!</h3>
                                    <button className={`${styles.closeModal}`} onClick={() => setShowSuccessModal(false)}>&times;</button>
                                </div>
                                <div className={`${styles.modalContent}`}>
                                    <div className={`${styles.successIcon}`}>✓</div>
                                    <div className={`${styles.successMessage}`}>
                                        <p className="text-green-300">Pathway "{pathwayDetails.name}" has been created successfully!</p>
                                        <p className={`${styles.videoCounts}`}>{pathwayDetails.videoCount} videos added to pathway</p>
                                    </div>
                                    <div className={`${styles.modalButtons}`}>
                                        <button className={`${styles.modalDone}`} onClick={() => setShowSuccessModal(false)}>Done</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>


    );

}

export default App;