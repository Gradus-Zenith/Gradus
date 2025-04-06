import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { db, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from './firebase.js';


function getUserId (){
    const urlParams = new URLSearchParams(window.location.search);
    let userId = urlParams.get('uid');
    
    
    if (!userId) {
        const pathMatch = window.location.pathname.match(/watch\.html\?v=([^&]+)/);
        if (pathMatch) {
            userId = pathMatch[1];
        }
    }
    
    
    if (!userId) {
        console.error('No video ID found in URL');
        return null;
    }
    
    return userId;
}

// Get video ID from URL - handle both YouTube and local URLs
function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    let videoId = urlParams.get('v');
    
    // If no v parameter, try to extract from path
    if (!videoId) {
        const pathMatch = window.location.pathname.match(/watch\.html\?v=([^&]+)/);
        if (pathMatch) {
            videoId = pathMatch[1];
        }
    }
    
    // If still no video ID, use a default or show error
    if (!videoId) {
        console.error('No video ID found in URL');
        return null;
    }
    
    return videoId;
}

const videoId = getVideoId();

// Save video immediately when loaded
async function saveVideoToNotes() {
    if (!videoId) return;
    
    try {
        const userId = await getUserId();
        if (!userId) {
            console.log('No user ID found, skipping note save');
            return;
        }

        const userDocRef = doc(db, 'Users', userId);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const notes = data.notes || {};
            
            // Add to notes if not already present
            if (!notes[videoId]) {
                notes[videoId] = {
                    content: "",  // Initialize with empty content
                    timestamp: serverTimestamp(),
                    videoId: videoId
                };
                
                // Update the document with new note
                await updateDoc(userDocRef, { notes });
                console.log('Video ID saved to notes:', videoId);
            }
        } else {
            // Create new document with initial notes
            await setDoc(userDocRef, {
                notes: {
                    [videoId]: {
                        content: "",
                        timestamp: serverTimestamp(),
                        videoId: videoId
                    }
                }
            });
            console.log('Created new document with video ID:', videoId);
        }
    } catch (error) {
        console.error('Error saving video to notes:', error);
    }
}

// Set iframe source and save video immediately
const player = document.getElementById('player');
if (videoId) {
    player.src = `https://www.youtube.com/embed/${videoId}`;
    saveVideoToNotes(); // Save video ID immediately when loaded
}

// Create a Set to store used video IDs
let usedVideoIds = new Set([videoId]);

// Complete system instruction
const system_instruction = `<System>
You are an educational video analysis expert and specialized with creating structured learning paths.

<INPUT_CONTEXT>
[TITLE]: {video_title}
[DESCRIPTION]: {video_description}
</INPUT_CONTEXT>

<TASK>
1. Filter educational content.
2. Extract keywords.
3. Identify primary topic & concepts.
4. Determine prerequisites.
5. Predict next topics.
6. Generate search prompts.
7. Identify target audience (e.g., 11th, college, JEE).
</TASK>

<GUIDELINES>
1. **Content:** Retain only educational content.
2. **Topics:** Extract primary topic & key concepts. Infer from title if description is vague. Verify difficulty (beginner/intermediate/advanced).
3. **Audience:** Determine target (grades, tests, level). Infer if needed.
4. **Prerequisites:** Infer prerequisites, rank by importance, adjust difficulty.
5. **Next Topics:** Identify follow-up topics, structure by complexity.
6. **Search Prompts (5 words max):**
   - Include topic & target audience.
   - 3 prerequisite queries.
   - 3 similar topic queries.
   - 4 next topic queries.
   - Avoid surface-level results.
7. **Formatting:** Use natural language, optimize for depth, differentiate query types.
8. **Diversity:** Vary recommendations (theory, application, formats).
</GUIDELINES>

<OUTPUT_FORMAT>
JSON object:
{
  "Primary Topic": "topic",
  "Subject Category": "category",
  "Difficulty Level": "level",
  "Target Audience": "audience",
  "Similar Topic Video Searches": ["query1", "query2", "query3"],
  "Prerequisite Video Searches": ["query1", "query2", "query3"],
  "Next Topic Video Searches": ["query1", "query2", "query3", "query4"]
}
</OUTPUT_FORMAT>
</System>`;

// Add error handling for recommendations container
function showError(message) {
    const containers = ['primaryTopicTag', 'subjectCategoryTag', 'difficultyLevelTag'];
    containers.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = 'Error';
            element.style.backgroundColor = '#ffebee';
        }
    });

    const videoContainers = ['similarTopicVideos', 'prerequisiteVideos', 'nextTopicVideos'];
    videoContainers.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = `<div class="error">${message}</div>`;
        }
    });
}

// Function to fetch and update video title
async function updateVideoTitle() {
    try {
        // Use our Video Fetch server instead
        const response = await fetch('https://gradus1-0.onrender.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: videoId, // Search using video ID
                maxResults: 1
            })
        });
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const title = data.items[0].snippet.title;
            videoTitle.textContent = title;
            document.title = title;
        } else {
            videoTitle.textContent = 'Video Title Not Available';
        }
    } catch (error) {
        console.error('Error fetching video title:', error);
        videoTitle.textContent = 'Error Loading Title';
    }
}

// Replace the YouTube search function
async function searchYouTube(searchQuery, maxResults = 5) {
    try {
        const response = await fetch('https://gradus1-0.onrender.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: searchQuery,
                maxResults: maxResults
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`API error: ${data.error}`);
        }
        
        if (data.items && data.items.length > 0) {
            // Find first non-duplicate video
            for (const item of data.items) {
                const videoId = item.id;
                if (!usedVideoIds.has(videoId)) {
                    usedVideoIds.add(videoId);
                    return {
                        title: item.snippet.title,
                        videoId: videoId,
                        thumbnail: item.snippet.thumbnail
                    };
                }
            }
            console.log(`All videos for "${searchQuery}" were duplicates`);
            return null;
        }
        return null;
    } catch (error) {
        console.error('Search Error:', error);
        throw error;
    }
}

// Create video item
function createVideoItem(videoData) {
    const itemElement = document.createElement('div');
    itemElement.className = 'search-item';
    
    const content = `
        <div class="video-container">
            <img src="${videoData.thumbnail}" alt="${videoData.title}" class="video-thumbnail">
            <div class="video-info">
                <h4>${videoData.title}</h4>
                <a href="http://127.0.0.1:5500//watch.html?v=${videoData.videoId}" target="_blank" class="watch-btn">Watch Video</a>
            </div>
        </div>
    `;
    
    itemElement.innerHTML = content;
    return itemElement;
}

// Create search items with parallel fetching
async function createSearchItems(items, videosContainerId) {
    const videosContainer = document.getElementById(videosContainerId);
    videosContainer.innerHTML = '';
    
    try {
        // Create array of promises for all video searches
        const videoPromises = items.map(item => searchYouTube(item));
        
        // Wait for all promises to resolve in parallel
        const results = await Promise.all(videoPromises);
        
        // Process results and create elements
        results.forEach(videoData => {
            if (videoData) {
                const videoElement = createVideoItem(videoData);
                videosContainer.appendChild(videoElement);
            } else {
                const noVideoElement = document.createElement('div');
                noVideoElement.className = 'search-item no-video';
                noVideoElement.textContent = 'No unique video found for this search';
                videosContainer.appendChild(noVideoElement);
            }
        });
    } catch (error) {
        console.error('Error in createSearchItems:', error);
        const errorElement = document.createElement('div');
        errorElement.className = 'search-item error';
        errorElement.textContent = `Failed to load videos: ${error.message}`;
        videosContainer.appendChild(errorElement);
    }
}

// Function to fetch all recommendations in parallel
async function fetchAllRecommendations(data) {
    try {
        // Create all containers in parallel
        await Promise.all([
            createSearchItems(data['Similar Topic Video Searches'] || [], 'similarTopicVideos'),
            createSearchItems(data['Prerequisite Video Searches'] || [], 'prerequisiteVideos'),
            createSearchItems(data['Next Topic Video Searches'] || [], 'nextTopicVideos')
        ]);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        showError('Failed to load recommendations');
    }
}

// Replace the fetchVideoDetails function
async function fetchVideoDetails(videoId) {
    try {
        const response = await fetch('https://gradus1-0.onrender.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: videoId,
                maxResults: 1
            })
        });
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const videoDetails = data.items[0].snippet;
            return {
                title: videoDetails.title,
                description: videoDetails.description
            };
        } else {
            throw new Error('Video not found');
        }
    } catch (error) {
        console.error('Error fetching video details:', error);
        throw error;
    }
}

// Generate recommendations
async function generateRecommendations() {
    if (!videoId) {
        console.error('No video ID available for generating recommendations.');
        return;
    }

    try {
        const videoDetails = await fetchVideoDetails(videoId);
        console.log('Video details fetched:', videoDetails);

        const genAI = new GoogleGenerativeAI("AIzaSyDR6YhoL5wo1Xmvl36iI2_ebgySEwZslBo");
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-thinking-exp-01-21",
            temperature: 0.05
        });

        const output = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{
                    text: `${system_instruction}\n\nAnalyze this video:\nTitle: ${videoDetails.title}\nDescription: ${videoDetails.description}\n\nProvide the analysis in the specified JSON format.`
                }]
            }]
        });

        const responseText = await output.response.text();
        console.log('AI model response:', responseText);

        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let parsedData = JSON.parse(jsonMatch[0]);
                
                if (!Array.isArray(parsedData)) {
                    parsedData = [parsedData];
                }
                
                if (parsedData.length > 0) {
                    const data = parsedData[0];
                    console.log('Parsed data:', data);
                    
                    // Update tags
                    const subjectCategoryTag = document.getElementById('subjectCategoryTag');
                    const difficultyLevelTag = document.getElementById('difficultyLevelTag');

                    if (subjectCategoryTag) {
                        subjectCategoryTag.textContent = data['Subject Category'] || 'N/A';
                    }

                    if (difficultyLevelTag) {
                        difficultyLevelTag.textContent = data['Difficulty Level'] || 'N/A';
                    }
                    
                    // Fetch all recommendations in parallel
                    await fetchAllRecommendations(data);
                } else {
                    console.error('No data found in AI response.');
                }
            } else {
                console.error('No JSON match found in AI response.');
            }
        } catch (error) {
            console.error('Error processing recommendations:', error);
        }
    } catch (error) {
        console.error('Error generating recommendations:', error);
    }
}

// Ensure the script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', generateRecommendations);

// Format the content with enhanced markdown-like syntax
function formatContent(content) {   
    // Format headers with different styles
    content = content.replace(/^### (.*$)/gm, '<h3 class="summary-h3">$1</h3>');
    content = content.replace(/^## (.*$)/gm, '<h2 style="color: black;" class="summary-h2 ">$1</h2>');
    content = content.replace(/^# (.*$)/gm, '<h1 class="summary-h1">$1</h1>');
    
    // Format text emphasis
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="highlight-text">$1</strong>');
    content = content.replace(/\*(.*?)\*/g, '<em class="italic-text">$1</em>');
    
    // Format lists with better styling
    content = content.replace(/^\s*[-*]\s(.*)$/gm, '<li class="summary-list-item">$1</li>');
    content = content.replace(/((?:<li class="summary-list-item">.*<\/li>\n?)+)/g, '<ul class="summary-list">$1</ul>');
    
    // Format numbered lists
    content = content.replace(/^\d+\.\s(.*)$/gm, '<li class="numbered-list-item">$1</li>');
    content = content.replace(/((?:<li class="numbered-list-item">.*<\/li>\n?)+)/g, '<ol class="numbered-list">$1</ol>');
    
    // Format key concepts and definitions
    content = content.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');
    content = content.replace(/\[KEY\](.*?)\[\/KEY\]/g, '<span class="key-concept">$1</span>');
    content = content.replace(/\[DEF\](.*?)\[\/DEF\]/g, '<div class="definition-box">$1</div>');
    
    // Add section breaks
    content = content.replace(/---/g, '<hr class="section-break">');
    
    // Wrap paragraphs
    content = content.replace(/^(?!<[h|u|o|l|d])(.*$)/gm, '<p class="summary-paragraph">$1</p>');
    
    return `
        <div class="summary-content-wrapper">
            <style>
                .summary-content-wrapper {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #2c3e50;
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .summary-h1 {
                    font-size: 2em;
                    color: black;
                    border-bottom: 2px solid #3498db;
                    margin-bottom: 1em;
                    padding-bottom: 0.3em;
                }
                .summary-h2 {
                    font-size: 1.5em;
                    
                    margin: 1em 0;
                    color: black;
                }
                .summary-h3 {
                    font-size: 1.2em;
                    color: black;
                    margin: 0.8em 0;
                }
                .summary-list, .numbered-list {
                    padding-left: 2em;
                    margin: 1em 0;
                }
                .summary-list-item, .numbered-list-item {
                    margin: 0.5em 0;
                    line-height: 1.6;
                }
                .highlight-text {
                    background-color: #fff3cd;
                    padding: 0.2em 0.4em;
                    border-radius: 3px;
                    font-weight: 600;
                }
                .italic-text {
                    color: #666;
                    font-style: italic;
                }
                .inline-code {
                    background: #f8f9fa;
                    padding: 0.2em 0.4em;
                    border-radius: 3px;
                    font-family: monospace;
                    color: #e83e8c;
                }
                .key-concept {
                    background: #e3f2fd;
                    padding: 0.2em 0.5em;
                    border-radius: 4px;
                    font-weight: 500;
                    color: #1565c0;
                }
                .definition-box {
                    background: #f8f9fa;
                    border-left: 4px solid #4caf50;
                    padding: 1em;
                    margin: 1em 0;
                    border-radius: 0 4px 4px 0;
                }
                .section-break {
                    border: 0;
                    height: 1px;
                    background: #e0e0e0;
                    margin: 2em 0;
                }
                .summary-paragraph {
                    margin: 1em 0;
                    line-height: 1.8;
                }
            </style>
            ${content}
        </div>
    `;
}

// Format Q&A content with enhanced styling
function formatQA(content) {
    // Remove question numbers and clean up formatting
    content = content.replace(/^\d+\.\s+/gm, '');
    content = content.replace(/\*+([^*]+)\*+/g, '$1');
    
    // Add category tags with improved styling
    content = content.replace(/\[(DEF|APP|CMP|C&E)\]/g, 
        '<span class="category-tag tag-$1">$1</span>');
    
    // Split into questions and answers with enhanced formatting
    const lines = content.split('\n');
    let formattedContent = '';
    let inQuestion = false;

    for (const line of lines) {
        let cleanLine = line
            .replace(/^(Question|Q):\s*/i, '')
            .replace(/^(Answer|A):\s*/i, '')
            .trim();

        // Format key terms and concepts
        cleanLine = cleanLine
            .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
            .replace(/\[KEY\](.*?)\[\/KEY\]/g, '<span class="key-concept">$1</span>')
            .replace(/\[NOTE\](.*?)\[\/NOTE\]/g, '<div class="note-box">$1</div>');

        if (line.toLowerCase().includes('question:') || line.toLowerCase().includes('q:')) {
            if (inQuestion) formattedContent += '</div>';
            formattedContent += '<div class="qa-block">';
            inQuestion = true;
            formattedContent += `
                <div class="question-content">
                    <div class="question-marker">Q</div>
                    <div class="question-text">${cleanLine}</div>
                </div>`;
        } else if (line.toLowerCase().includes('answer:') || line.toLowerCase().includes('a:')) {
            if (inQuestion) {
                formattedContent += '</div>';
                inQuestion = false;
            }
            formattedContent += `
                <div class="answer-content">
                    <div class="answer-marker">A</div>
                    <div class="answer-text">${cleanLine}</div>
                </div>`;
        } else if (cleanLine) {
            formattedContent += `<div class="additional-content">${cleanLine}</div>`;
        }
    }

    if (inQuestion) {
        formattedContent += '</div>';
    }

    return `
        <div class="qa-wrapper">
            <style>
                .qa-wrapper {
                    font-family: 'Arial', sans-serif;
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .qa-block {
                    background: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin: 20px 0;
                    padding: 20px;
                    transition: transform 0.2s ease;
                }
                .qa-block:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .question-content, .answer-content {
                    display: flex;
                    gap: 15px;
                    margin: 10px 0;
                }
                .question-marker, .answer-marker {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    flex-shrink: 0;
                }
                .question-marker {
                    background: #e3f2fd;
                    color: #1565c0;
                }
                .answer-marker {
                    background: #f0f4c3;
                    color: #827717;
                }
                .question-text {
                    font-size: 1.1em;
                    color: #1565c0;
                    font-weight: 500;
                    flex-grow: 1;
                }
                .answer-text {
                    color: #37474f;
                    line-height: 1.8;
                    flex-grow: 1;
                }
                .additional-content {
                    margin-left: 45px;
                    color: #546e7a;
                    line-height: 1.6;
                }
                .category-tag {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.8em;
                    font-weight: 500;
                    margin: 0 4px;
                }
                .tag-DEF { background: #e3f2fd; color: #1565c0; }
                .tag-APP { background: #f0f4c3; color: #827717; }
                .tag-CMP { background: #f3e5f5; color: #6a1b9a; }
                .tag-CE { background: #ffebee; color: #c62828; }
                .inline-code {
                    background: #f5f5f5;
                    padding: 0.2em 0.4em;
                    border-radius: 3px;
                    font-family: monospace;
                    color: #e83e8c;
                }
                .key-concept {
                    background: #e8f5e9;
                    padding: 0.2em 0.5em;
                    border-radius: 4px;
                    font-weight: 500;
                    color: #2e7d32;
                }
                .note-box {
                    background: #fff3e0;
                    border-left: 4px solid #ff9800;
                    padding: 1em;
                    margin: 1em 0;
                    border-radius: 0 4px 4px 0;
                }
            </style>
            ${formattedContent}
        </div>
    `;
}

// Add these variables at the top with other globals
let videoTranscript = '';
let videoInfo = '';  // New variable to store video info

// Add a flag to track if a request is in progress
let isRequestInProgress = false;
let isContentFetched = false;  // Track if content has been fetched

// Fetch summary and Q&A
async function fetchContent() {
    // If a request is already in progress, don't start another one
    if (isRequestInProgress) {
        console.log('Request already in progress, please wait...');
        return;
    }
    const userId = await getUserId();
    try {
        isRequestInProgress = true;  // Set flag when starting request
        const response = await fetch(`https://gradus-py-server.onrender.com/summarize/${videoId}?uid=${userId}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                // Content is fully fetched
                isContentFetched = true;
                // Enable chat button
                chatButton.disabled = false;
                chatButton.style.opacity = '1';
                chatButton.title = 'Open chat';
                break;
            }
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line) continue;
                
                try {
                    const data = JSON.parse(line);
                    
                    if (data.error) {
                        document.getElementById('summary-content').innerHTML = 
                            `<div class="error">${data.error}</div>`;
                        document.getElementById('qa-content').innerHTML = '';
                        continue;
                    }

                    switch (data.type) {
                        case 'video_info':
                            videoInfo = data.content;
                            if (data.message) {
                                document.getElementById('summary-content').innerHTML = 
                                    `<div class="info-message"><em>${data.message}</em></div>` +
                                    `<div class="video-content">${formatContent(data.content)}</div>`;
                            }
                            break;
                        case 'transcript':
                            videoTranscript = data.content;
                            break;
                        case 'start_summary':
                            const messageDiv = document.querySelector('#summary-content .info-message');
                            const message = messageDiv ? messageDiv.outerHTML : '';
                            document.getElementById('summary-content').innerHTML = message;
                            break;
                        case 'summary':
                            const summaryDiv = document.getElementById('summary-content');
                            summaryDiv.innerHTML += formatContent(data.content);
                            break;
                        case 'start_qa':
                            document.getElementById('qa-content').innerHTML = '';
                            break;
                        case 'qa':
                            const qaDiv = document.getElementById('qa-content');
                            qaDiv.innerHTML += formatQA(data.content);
                            break;
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        }
    } catch (error) {
        document.getElementById('summary-content').innerHTML = 
            `<div class="error">Error: ${error.message}</div>`;
        document.getElementById('qa-content').innerHTML = '';
    } finally {
        isRequestInProgress = false;  // Reset flag when request completes
    }
}

// Helper function to format the transcript
function formatTranscript(content) {
    // You can customize this function to format the transcript as needed
    return `<div class="transcript">${content}</div>`;
}

// Start fetching content when page loads
fetchContent();

document.getElementById('scheduleButton').addEventListener('click', function() {
    // Get video title from YouTube iframe
    const videoTitle = document.title || 'Study Session';
    
    // Create calendar event details
    const details = {
        title: `Study: ${videoTitle}`,
        details: `Study session for video: https://youtube.com/watch?v=${videoId}\n\nNotes:\n- Review summary before watching\n- Take notes during video\n- Practice with Q&A after watching`,
        duration: 60 // default duration in minutes
    };

    // Create Google Calendar URL
    const now = new Date();
    const startTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // Default to tomorrow
    startTime.setHours(10, 0, 0, 0); // Default to 10 AM

    const endTime = new Date(startTime.getTime() + (details.duration * 60 * 1000));

    const calendarUrl = new URL('https://calendar.google.com/calendar/render');
    calendarUrl.searchParams.append('action', 'TEMPLATE');
    calendarUrl.searchParams.append('text', details.title);
    calendarUrl.searchParams.append('details', details.details);
    calendarUrl.searchParams.append('dates', 
        `${startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z` +
        '/' +
        `${endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
    );

    // Open Google Calendar in new tab
    window.open(calendarUrl.toString(), '_blank');
});

// Update video title and store in history when title is received
window.addEventListener('message', function(event) {
    if (event.origin !== "https://www.youtube.com") return;
    
    if (event.data && event.data.event === "infoDelivery" && event.data.info && event.data.info.title) {
        document.title = event.data.info.title;
        // Update video title in history and ensure it's saved in notes
        updateVideoTitleInHistory(event.data.info.title);
        saveVideoToNotes(); // Ensure video is saved in notes
    }
});

// Update video title in history and notes
async function updateVideoTitleInHistory(title) {
    if (!videoId) return;
    
    try {
        const userId = await getUserId();
        if (!userId) {
            console.log('No user ID found, skipping title update');
            return;
        }

        const userDocRef = doc(db, 'Users', userId);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const history = data.videoHistory || [];
            
            // Update title in history
            const videoIndex = history.findIndex(v => v.videoId === videoId);
            if (videoIndex !== -1) {
                history[videoIndex].title = title;
            }

            // Update title in notes if it exists
            const notes = data.notes || {};
            if (notes[videoId]) {
                notes[videoId].title = title;
            }
            
            // Update both history and notes
            await updateDoc(userDocRef, {
                videoHistory: history,
                notes: notes
            });
        }
    } catch (error) {
        console.error('Error updating video information:', error);
    }
}

// Notes functionality using Firebase
const notesArea = document.getElementById('notesArea');
const saveButton = document.getElementById('saveNotes');

// Load saved notes for this video
async function loadNotes() {
    try {
        const userId = await getUserId();
        if (!userId) {
            console.log('No user ID found, skipping note load');
            return;
        }

        const userDocRef = doc(db, 'Users', userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const videoNotes = data.notes?.[videoId]?.content || '';
            notesArea.value = videoNotes;
        }
    } catch (error) {
        console.error("Error loading notes:", error);
    }
}

// Save notes to Firebase
async function saveNotes() {
    try {
        const userId = await getUserId();
        if (!userId) {
            console.log('No user ID found, skipping note save');
            return;
        }

        const notesContent = notesArea.value;
        const userDocRef = doc(db, 'Users', userId);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const notes = data.notes || {};
            
            // Update existing note
            notes[videoId] = {
                ...notes[videoId],
                content: notesContent,
                timestamp: serverTimestamp()
            };
            
            await updateDoc(userDocRef, { notes });
        }
        
        // Show save confirmation
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-check"></i> Saved!';
        setTimeout(() => {
            saveButton.innerHTML = originalText;
        }, 2000);
    } catch (error) {
        console.error("Error saving notes:", error);
        alert('Error saving notes. Please try again.');
    }
}

// Load notes when page loads
loadNotes();

// Auto-save on typing (debounced)
let saveTimeout;
notesArea.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNotes, 1000);
});

// Manual save button
saveButton.addEventListener('click', saveNotes);

// Add chatbot button handler
const chatButton = document.getElementById('chatButton');

// Initially disable the button
chatButton.disabled = true;
chatButton.style.opacity = '0.5';
chatButton.title = 'Waiting for content...';

let lastVideoId = null;  // Store the last used video ID

chatButton.addEventListener('click', async function() {
    if (!this.disabled && isContentFetched) {
        // Check if the video ID has changed
        if (videoId !== lastVideoId) {
            lastVideoId = videoId;  // Update the last used video ID

            let chatWindow;
            try {
                // First open the window to loading page
                chatWindow = window.open('http://localhost:9000/loading.html', '_blank');
                
                // Wait a moment to ensure window is opened
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Then initialize the chat server with proper error handling
                const initResponse = await fetch('http://localhost:9000/api/init', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                // Check if we got a valid response
                if (!initResponse.ok) {
                    const errorText = await initResponse.text();
                    throw new Error(`Server initialization failed: ${errorText}`);
                }
                
                // Parse the response carefully
                let data;
                try {
                    data = await initResponse.json();
                } catch (parseError) {
                    throw new Error('Invalid response from server');
                }

                // If initialization was successful, redirect to the chat page
                if (data && data.success) {
                    // Make sure the window is still open
                    if (chatWindow && !chatWindow.closed) {
                        // Use replace to avoid browser blocking issues
                        chatWindow.location.replace('http://localhost:9000');
                    } else {
                        throw new Error('Chat window was closed');
                    }
                } else {
                    throw new Error(data.error || 'Failed to initialize chat');
                }
            } catch (error) {
                console.error('Error initializing chat:', error);
                // Show error in the loading window if it's still open
                if (chatWindow) {
                    chatWindow.document.body.innerHTML = `
                        <div style="color: red; text-align: center; padding: 20px;">
                            <h2>Error Initializing Chat</h2>
                            <p>${error.message}</p>
                            <button onclick="window.close()">Close</button>
                        </div>
                    `;
                }
            }
        }
    }
});

// Print functionality for Summary and Q&A
async function printSummaryAndQA() {
    // Get the content containers
    const summaryContainer = document.getElementById('summary-container');
    const qaContainer = document.getElementById('qa-container');
    
    // Create a new div for the print content
    const printContent = document.createElement('div');
    printContent.style.padding = '20px';
    printContent.style.fontFamily = 'Arial, sans-serif';
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = 'Video Analysis Report';
    title.style.textAlign = 'center';
    title.style.color = '#2c3e50';
    title.style.marginBottom = '30px';
    printContent.appendChild(title);
    
    // Add summary section
    const summaryClone = summaryContainer.cloneNode(true);
    summaryClone.style.marginBottom = '40px';
    printContent.appendChild(summaryClone);
    
    // Add Q&A section
    const qaClone = qaContainer.cloneNode(true);
    printContent.appendChild(qaClone);
    
    // Configure PDF options
    const opt = {
        margin: [10, 10],
        filename: 'video-analysis.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
        // Generate PDF
        await html2pdf().set(opt).from(printContent).save();
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}

// Add event listener for print button
document.getElementById('printButton').addEventListener('click', printSummaryAndQA);

// Add this after the videoId initialization
const videoTitle = document.getElementById('videoTitle');

// Call the function when page loads
updateVideoTitle();

// When page loads
document.addEventListener('DOMContentLoaded', function() {
    if (videoId) {
        saveVideoToNotes(); // Ensure video is saved when page loads
        loadNotes(); // Load any existing notes
    }
});

// When you get the difficulty level from your data:
const level = 'Intermediate'; // or whatever level you're getting
updateDifficultyLevel(level);

