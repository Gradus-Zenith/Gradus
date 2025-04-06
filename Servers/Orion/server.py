from fastapi import FastAPI, HTTPException, Cookie, Request
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from google.generativeai import types
import uvicorn
from fastapi.responses import StreamingResponse
import json
import asyncio
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp  # Replace googleapiclient with yt-dlp
from pathlib import Path
from typing import Optional
import firebase_admin
from firebase_admin import credentials, firestore
import re
import os
from dotenv import load_dotenv


app = FastAPI()
load_dotenv()

# Configure CORS with credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://gradus1-0.onrender.com","http://localhost:3000","http://127.0.0.1:5500", "http://localhost:5500", "http://127.0.0.1:5501", "https://gradus1-0-1.onrender.com/"],  # Add your frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin SDK
db = None  # Initialize db as None
try:
    # Use the correct path to the service account key file
    cred = credentials.Certificate("/etc/secrets/gradus-26a77-firebase-adminsdk-fbsvc-7267a72476.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase initialized successfully")
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    print("Application will continue without Firebase functionality")

# API keys (in production, these should be in environment variables)
API_KEY_1 = os.getenv('API_KEY_1')
API_KEY_2 = os.getenv('API_KEY_2')
API_KEY_3 = os.getenv('API_KEY_3')

# Create a directory for storing the files using relative path
CHATBOT_DIR = Path("../Chatbot")  # Go up one level and into Chatbot directory

# Ensure the directory exists
CHATBOT_DIR.mkdir(parents=True, exist_ok=True)

# Create files if they don't exist
def ensure_files_exist():
    transcript_file = CHATBOT_DIR / "transcript.txt"
    summary_file = CHATBOT_DIR / "summary.txt"
    quiz_file = CHATBOT_DIR / "quiz.txt"  # Add quiz file
    
    try:
        # Create files if they don't exist
        transcript_file.touch(exist_ok=True)
        summary_file.touch(exist_ok=True)
        quiz_file.touch(exist_ok=True)  # Create quiz file
        print(f"Files created/verified successfully")  # Show absolute path for debugging
    except Exception as e:
        print(f"Error creating files: {e}")

# Function to get userID from request headers or cookies
async def get_user_id(request: Request):
    try:
        # First try to get user ID from cookies
        cookies = request.cookies
        if 'userId' in cookies:
            user_id = cookies['userId']
            print(f"User ID found in cookies: {user_id}")
            return user_id

        # Then try to get from X-User-ID header
        user_id = request.headers.get('X-User-ID')
        if user_id:
            print(f"User ID found in headers: {user_id}")
            return user_id

        print("No user ID found in cookies or headers")
        return None
    except Exception as e:
        print(f"Error getting user ID: {e}")
        return None

# Function to store content in Firebase
async def store_in_firebase(user_id, video_id, content_type, content):
    print(f"\n=== Firebase Storage Attempt ===")
    print(f"Attempting to store {content_type} for user: {user_id}")
    
    if not user_id:
        print("❌ ERROR: No user ID provided, skipping Firebase storage")
        return False
    
    if db is None:
        print("❌ ERROR: Firebase not initialized, skipping storage")
        return False
    
    try:
        # Create a reference to the user document in the Users collection
        user_ref = db.collection('Users').document(user_id)
        
        # Create a reference to the specific content section (summary, transcript, or quiz)
        content_ref = user_ref.collection(content_type).document('content')
        
        # Prepare data based on content type
        data = {
            'content': content,
            'videoId': video_id,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        # Add type-specific metadata
        if content_type == 'transcript':
            # Check if transcript has timestamps
            has_timestamps = any(line.strip().startswith('[') for line in content.split('\n') if line.strip())
            data['hasTimestamps'] = has_timestamps
            data['type'] = 'transcript'
            
            # Process transcript to ensure timestamps if not present
            if not has_timestamps:
                processed_content = ""
                for i, line in enumerate(content.split('\n')):
                    if line.strip():
                        timestamp = f"{i:02d}:00"
                        processed_content += f"[{timestamp}] {line.strip()}\n"
                data['content'] = processed_content
                data['hasTimestamps'] = True
                print(f"✅ Added timestamps to transcript")
        
        elif content_type == 'summary':
            data['type'] = 'summary'
        
        elif content_type == 'quiz':
            data['type'] = 'quiz'
            data['isReady'] = True
        
        elif content_type == 'videoInfo':
            data['type'] = 'videoInfo'
        
        # Update the content document with the data
        content_ref.set(data, merge=True)
        
        print(f"\n=== Firebase Storage Success ===")
        print(f"✅ User ID: {user_id}")
        print(f"✅ Content Type: {content_type}")
        print(f"✅ Video ID: {video_id}")
        print(f"✅ Storage Path: Users/{user_id}/{content_type}/content")
        print(f"✅ Content Length: {len(content)} characters")
        print(f"=== End Storage Log ===\n")
        
        # Verify the data was stored
        try:
            stored_data = content_ref.get()
            if stored_data.exists:
                print(f"✅ Verification: Data successfully stored and retrieved")
                print(f"✅ Stored content length: {len(stored_data.get('content', ''))} characters")
                return True
            else:
                print(f"❌ Verification: Data was not found after storage")
                return False
        except Exception as e:
            print(f"❌ Verification Error: {str(e)}")
            return False
        
    except Exception as e:
        print(f"\n❌ ERROR storing {content_type} in Firebase:")
        print(f"❌ Error details: {str(e)}")
        print(f"=== End Error Log ===\n")
        return False

# Function to retrieve content from Firebase
async def get_from_firebase(user_id, content_type):
    print(f"\n=== Firebase Retrieval Attempt ===")
    print(f"Attempting to retrieve {content_type} for user: {user_id}")
    
    if not user_id:
        print("❌ ERROR: No user ID provided, skipping Firebase retrieval")
        return None
    
    if db is None:
        print("❌ ERROR: Firebase not initialized, skipping retrieval")
        return None
    
    try:
        # Create a reference to the user document in the Users collection
        user_ref = db.collection('Users').document(user_id)
        
        # Create a reference to the specific content section (summary, transcript, or quiz)
        content_ref = user_ref.collection(content_type).document('content')
        
        # Get the content
        content_doc = content_ref.get()
        
        if content_doc.exists:
            content_data = content_doc.to_dict()
            print(f"\n=== Firebase Retrieval Success ===")
            print(f"✅ User ID: {user_id}")
            print(f"✅ Content Type: {content_type}")
            print(f"✅ Content Length: {len(content_data.get('content', ''))} characters")
            print(f"=== End Retrieval Log ===\n")
            return content_data
        else:
            print(f"❌ Content not found in Firebase: {content_type}")
            return None
        
    except Exception as e:
        print(f"\n❌ ERROR retrieving {content_type} from Firebase:")
        print(f"❌ Error details: {str(e)}")
        print(f"=== End Error Log ===\n")
        return None

class Agent:
    def __init__(self, api_key):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.0-flash-thinking-exp-01-21"

class model1(Agent):
    def __init__(self, api_key):
        super().__init__(api_key)
        self.api_key = api_key

    def generate_summary(self, text):
        instructions = '''[INSTRUCTION]  
You are an expert content analyst specializing in educational material.  
You might be given **either** a transcript **or** video details (title & description).  

[IMPORTANT]
- **If given video details (title & description):**  
  - **Filter out promotional content** and retain only educational material.  
  - **Provide a concise summary** (shorter than transcript-based summaries).  
  
- **If given a full transcript:**  
  - **Follow the structured documentation format** see below.  
  - **Provide a comprehensive, well-structured summary.** with all essential points.
  - **Extract and explain key technical concepts** separately.  
  - Use **headings** (`###`), subheadings, and **bullet points**.  
    - Integrate LaTeX for math:  
    - Inline: `$E = mc^2$`  
    - Block:  
        ```
        $$
        E = mc^2
        $$
        ```  

  
- Start directly with the summary content
- **No acknowledgments, meta-commentary, or mentions of the input type,"provided transcript" or analysis process.** 

[OUTPUT STYLE]
- Begin directly with a title and content
- Avoid using words like "transcript", "text", or "analysis"
- Write as if you're summarizing the video content directly
- Use LaTeX math formatting for equations:s
  - Inline math: Use single $ (e.g., $A_1v_1 = A_2v_2$)
  - Block math: Use double $$ for displayed equations
  - Example: $$A_1v_1 = A_2v_2$$

[OUTPUT FORMAT]  
1. **Summary Section**
- **If given video details:**  
     - Short summary (8-15 lines), focusing on key educational insights retained from the description.  
     - **Include** extra structure like key terms relevant to the content.

   - **If given a full transcript:**  
    - **Comprehensive, well-structured summary** retaining and covering all essential ideas, arguments, and concepts.  
    - **Active voice, professional tone**, no filler words or conversational elements.  
    - **Clear headings, subheadings, and bullet points** for readability. 

   [FORMATTING GUIDELINES]  
        - **Use clear headings** and subheadings
        - **Implement bullet points** where appropriate
        - Ensure **smooth transitions** between sections
        - Maintain **professional academic tone**
        - Structure content for **optimal readability**
        - Use `###` for section headings  
        - Use `-` for bullet points  
        - Do not wrap full sections in code blocks (except block LaTeX)  
        - Stream output line by line naturally—no broken math or malformed lists  

2. **Reference Section (Only for full transcripts)**
   - List atmost of **10 key technical terms** requiring explanation.
   - **Exclude basic concepts** and terms already explained in the summary.  
   - Provide **concise, clear definitions** directly relevant to the content. 

[QUALITY STANDARDS]
- **Always adjust output length based on input type** (shorter for video details, detailed for transcripts).    
- **Ensure accuracy** in technical explanations
- **Maintain clarity** and accessibility
- **Preserve** all key information from source
'''
        response = self.client.models.generate_content(
            model=self.model,
            contents=f"[CONTEXT]\n{text}",
            config=types.GenerateContentConfig(
                system_instruction=instructions, 
                temperature=0.45
            )
        )
        return response.text


class model2(Agent):
    def __init__(self, api_key):
        super().__init__(api_key)
        self.api_key = api_key

    def generate_qna(self, text):
        instructions = f'''[INSTRUCTION]  
You are an expert in educational content evaluation. 

[IMPORTANT]
- Start directly with the Q&A content
- No introductory statements or meta-commentary
- No acknowledgments or process descriptions
- Begin immediately with the section.

**Your task** is to:
- Create a **comprehensive Self-Assessment Q&A** section
- Test understanding of **key concepts and technical terms**
- Ensure questions cover both **theory and application**
- Provide **clear, educational answers**

[OUTPUT FORMAT]
Title:**Self-Assessment Q&A**
   
1. **Question Categories**
   Each question must be tagged with one of:
   - **[DEF]** Definition/Concept Questions
   - **[APP]** Application Scenarios
   - **[CMP]** Comparative Analysis
   - **[C&E]** Cause and Effect Relations

2. **Question Structure**
   - Present 8-10 questions in **increasing complexity**
   - Each question must be followed by a concise, educational answer
   - Include **immediate answers** after each question
   - Maintain **consistent formatting**
   - Use **clear, precise language**

[ASSESSMENT GUIDELINES]  
- Questions must be **entirely based** on the provided summary and technical terms
- Use technical terms **consistently and meaningfully**
- **Avoid pure factual recall** unless it serves a deeper understanding
- For **application questions**, use plausible real-world or domain-specific contexts
- **Comparative questions** must highlight functional, contextual, or structural differences
- **Cause-and-effect questions** must explore underlying mechanisms or consequences
- Test understanding of **technical terms** from Reference Section
- Ensure questions **promote critical thinking**
- Include **practical applications** where relevant

[QUALITY STANDARDS]  
- **Maintain accuracy** in all answers
- Ensure **clear connection** to summary content
- Provide **educational value** in answers
- Keep responses **concise but thorough**
- Use **professional academic tone**

[CONSTRAINTS]  
- Do not modify original content
- All answers must be derivable from the summary
- Avoid introducing new concepts
'''
        prompt = f'''[SUMMARY]  
{text}
'''
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=instructions, 
                temperature=0.3
            )
        )
        return response.text


class model3(Agent):
    def __init__(self, api_key):
        super().__init__(api_key)
        self.api_key = api_key

    def generate_quiz(self, text):
        instructions = '''<|system|>
[INSTRUCTION]
You are a professional quiz generator tasked with creating a 10-question multiple-choice quiz based entirely on the provided video transcript. Your focus is on generating medium to hard difficulty questions that test deep understanding, application, analysis, and reasoning — not surface-level recall.

[GOAL]
Craft a challenging and well-balanced Advanced Knowledge Check Quiz with questions that push the learner to think critically and apply what they've understood from the transcript.

[QUESTION REQUIREMENTS]
- Generate exactly 10 multiple-choice questions (MCQs)
- Each question must have 4 distinct answer choices: A), B), C), D)
- Only one correct answer per question. Clearly indicate it using the format: Answer: B, etc.
- Ensure that all questions are either Medium or Hard difficulty — avoid basic or overly factual questions
- Design questions that reflect deeper insights such as:
  * Comparing or evaluating concepts
  * Applying ideas in new contexts
  * Interpreting implications
  * Analyzing nuanced distinctions

[TONE & QUALITY]
- Use a professional, academic tone
- Ensure all questions are clear, well-structured, and challenging
- Avoid vague wording or overly simple fact-based queries

[CONTENT RULES]
- All questions must be directly derived from the transcript content
- **No acknowledgments, meta-commentary, or mentions of the input type,"provided transcript" or analysis process.** 
- Do not invent new information or rely on external knowledge
- **Active voice, professional tone**, no filler words or conversational elements. 
- Do not include explanations, hints, or commentary — only the question, options, and answer
- Output must be strictly limited to 10 questions

[OUTPUT FORMAT]
1. Question text here  
   A) Option 1  
   B) Option 2  
   C) Option 3  
   D) Option 4  
   Answer: C

2. Question text here  
   A) Option 1  
   B) Option 2  
   C) Option 3  
   D) Option 4  
   Answer: A

(Continue up to exactly 10 questions)
</|system|>'''

        prompt = f'''<|user|>
[CONTENT]  
{text}
</|user|>

<|assistant|>
Please generate the quiz based on the above content, following all specified requirements.
</|assistant|>'''

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=instructions,
                temperature=0.3
            )
        )
        
        print("Quiz Generated")
        return response.text

 
# Get transcript
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
import yt_dlp

def get_transcript(video_id):
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        for transcript in transcript_list:
            if transcript.is_generated:  # Ensure it's an auto-generated transcript
                print(f"Using transcript in: {transcript.language}")

                try:
                    transcript_data = transcript.fetch()
                    # Each transcript entry is a dictionary with 'text', 'start', and 'duration' keys
                    full_transcript = "\n".join(
                        f"[{int(entry['start']) // 60:02d}:{int(entry['start']) % 60:02d}] {entry['text']}"
                        for entry in transcript_data
                    )

                    return {"type": "transcript", "content": full_transcript}

                except Exception as e:
                    print(f"Error fetching transcript: {e}")
                    # Print the structure of transcript_data for debugging
                    print(f"Transcript data structure: {type(transcript_data)}")
                    if transcript_data:
                        print(f"First entry structure: {type(transcript_data[0])}")
                        print(f"First entry keys: {transcript_data[0].keys()}")
                    continue  # Skip to the next available transcript

        print("No autogenerated transcript found.")

    except TranscriptsDisabled:
        print("Transcripts are disabled for this video.")
    except Exception as e:
        print(f"Error fetching transcript: {e}")

    # If transcript retrieval fails, fetch video details
    return get_video_info(video_id)


def get_video_info(video_id):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
    }
    print("Fetching video info")
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return {
                "type": "video_info",
                "message": "YouTube doesn't allow summary for this video to be generated, but here's a shorter context instead.",
                "content": f"**Title:** {info.get('title', 'N/A')}\n **Description:** {info.get('description', 'N/A')}"
            }
    except Exception as e:
        print(f"Error fetching video info with yt-dlp: {str(e)}")
        return None

@app.get("/summarize/{video_id}")
async def summarize_video(video_id: str, uid: Optional[str] = None, request: Request = None):
    async def generate():
        try:
            # Get userID from query parameters first, then fallback to cookies/headers
            user_id = uid
            if not user_id and request:
                user_id = await get_user_id(request)
            
            if not user_id:
                print("No user ID found, proceeding without user context")
                yield json.dumps({"error": "No authenticated user found"}) + "\n"
                return
            
            print(f"Processing request for user: {user_id}")
            
            # Ensure files exist before starting
            ensure_files_exist()
            
            result = get_transcript(video_id)
            if not result:
                yield json.dumps({"error": "Could not fetch video information"}) + "\n"
                return
            
            # Write transcript/video info to file and store in Firebase
            try:
                if result["type"] == "transcript":
                    transcript_text = result["content"]
                    # Write to local file
                    (CHATBOT_DIR / "transcript.txt").write_text(transcript_text, encoding='utf-8')
                    
                    # Store transcript in Firebase
                    success = await store_in_firebase(user_id, video_id, "transcript", transcript_text)
                    if not success:
                        print("❌ Failed to store transcript in Firebase")
                    
                elif result["type"] == "video_info":
                    video_info_text = result["content"]
                    (CHATBOT_DIR / "transcript.txt").write_text(video_info_text, encoding='utf-8')
                    
                    # Store video info in Firebase
                    success = await store_in_firebase(user_id, video_id, "videoInfo", video_info_text)
                    if not success:
                        print("❌ Failed to store video info in Firebase")
            except Exception as e:
                print(f"Error writing to transcript file: {e}")
                yield json.dumps({"error": f"Error writing transcript: {str(e)}"}) + "\n"
                return
            
            # Send the initial result
            yield json.dumps(result) + "\n"
            
            text = result["content"]
            print("Received transcript")
            
            # Initialize models
            agent1 = model1(API_KEY_1)
            agent2 = model2(API_KEY_2)
            agent3 = model3(API_KEY_3)

            # Generate and stream summary
            print("\n=== Starting Summary Generation ===")
            yield json.dumps({"type": "start_summary"}) + "\n"
            
            try:
                summary = agent1.generate_summary(text)
                if summary:
                    # Write summary to file
                    (CHATBOT_DIR / "summary.txt").write_text(summary, encoding='utf-8')
                    
                    # Store summary in Firebase
                    success = await store_in_firebase(user_id, video_id, "summary", summary)
                    if not success:
                        print("❌ Failed to store summary in Firebase")
                    
                    # Stream summary in chunks
                    for chunk in summary.split('\n'):
                        if chunk:
                            yield json.dumps({
                                "type": "summary",
                                "content": chunk + '\n'
                            }) + "\n"
                            await asyncio.sleep(0.05)
            except Exception as e:
                print(f"Error generating summary: {e}")
                yield json.dumps({"error": f"Error generating summary: {str(e)}"}) + "\n"

            # Generate Q&A content
            print("\n=== Starting QnA Generation ===")
            try:
                qa_section = await generate_qa_content(agent2, text)
                if qa_section:
                    # Store Q&A in Firebase
                    success = await store_in_firebase(user_id, video_id, "qa", qa_section)
                    if not success:
                        print("❌ Failed to store Q&A in Firebase")
                    
                    yield json.dumps({
                        "type": "qa",
                        "content": qa_section
                    }) + "\n"
            except Exception as e:
                print(f"Error generating Q&A: {e}")
                yield json.dumps({"error": f"Error generating Q&A: {str(e)}"}) + "\n"

            # Generate Quiz content
            print("\n=== Starting Quiz Generation ===")
            try:
                quiz_section = await generate_quiz_content(agent3, text)
                if quiz_section:
                    # Store quiz in Firebase
                    success = await store_in_firebase(user_id, video_id, "quiz", quiz_section)
                    if not success:
                        print("❌ Failed to store quiz in Firebase")
                    
                    yield json.dumps({
                        "type": "quiz",
                        "content": quiz_section
                    }) + "\n"
            except Exception as e:
                print(f"Error generating quiz: {e}")
                yield json.dumps({"error": f"Error generating quiz: {str(e)}"}) + "\n"

        except Exception as e:
            print(f"General error: {e}")
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(
        generate(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

async def generate_qa_content(agent2, text):
    print("Starting QnA Generation...")
    try:
        qa_section = agent2.generate_qna(text)
        print("QnA Generation Completed")
        return qa_section
    except Exception as e:
        print(f"Error in generate_qa_content: {e}")
        return ""

class QuizState:
    def __init__(self):
        self.is_quiz_ready = False
        self.quiz_content = None

quiz_state = QuizState()

# Add new endpoint to check quiz status
@app.get("/quiz/status")
async def check_quiz_status(request: Request):
    try:
        # Get userID from cookies (optional)
        user_id = await get_user_id(request)
        if user_id:
            print(f"Checking quiz status for user: {user_id}")
            
            # First check Firebase for quiz content
            quiz_data = await get_from_firebase(user_id, "quiz")
            if quiz_data and quiz_data.get("content"):
                print(f"✅ Quiz found in Firebase for user: {user_id}")
                quiz_state.quiz_content = quiz_data.get("content")
                quiz_state.is_quiz_ready = True
                return {"ready": True, "message": "Quiz is ready", "source": "firebase"}
        
        # Fallback to local file if Firebase check fails or no user ID
        quiz_file = CHATBOT_DIR / "quiz.txt"
        
        # Check if file exists and has content
        if quiz_file.exists() and quiz_file.stat().st_size > 0:
            if not quiz_state.quiz_content:  # Cache the quiz content
                quiz_state.quiz_content = quiz_file.read_text(encoding='utf-8')
            quiz_state.is_quiz_ready = True
            return {"ready": True, "message": "Quiz is ready", "source": "local"}
        else:
            return {"ready": False, "message": "Quiz is not yet generated"}
    except Exception as e:
        print(f"Error checking quiz status: {e}")
        return {"ready": False, "message": f"Error checking quiz status: {str(e)}"}

async def generate_quiz_content(agent3, text):
    print("Starting Quiz Generation...")
    try:
        quiz_state.is_quiz_ready = False  # Reset state
        quiz_section = agent3.generate_quiz(text)
        if quiz_section:
            try:
                (CHATBOT_DIR / "quiz.txt").write_text(quiz_section, encoding='utf-8')
                quiz_state.quiz_content = quiz_section
                quiz_state.is_quiz_ready = True
                print("Quiz Generation Completed")
                return quiz_section
            except Exception as e:
                print(f"Error writing to quiz file: {e}")
                return ""
    except Exception as e:
        print(f"Error in generate_quiz_content: {e}")
        return ""

# Add new endpoint to retrieve content from Firebase
@app.get("/content/{content_type}")
async def get_content(content_type: str, request: Request):
    try:
        # Get userID from cookies or headers
        user_id = await get_user_id(request)
        if not user_id:
            return {"error": "No authenticated user found"}
        
        print(f"Retrieving {content_type} for user: {user_id}")
        
        # Validate content type
        valid_types = ["transcript", "summary", "quiz", "qa", "videoInfo"]
        if content_type not in valid_types:
            return {"error": f"Invalid content type. Must be one of: {', '.join(valid_types)}"}
        
        # Get content from Firebase
        content_data = await get_from_firebase(user_id, content_type)
        
        if content_data:
            return {
                "success": True,
                "content": content_data.get("content", ""),
                "videoId": content_data.get("videoId", ""),
                "type": content_data.get("type", content_type),
                "hasTimestamps": content_data.get("hasTimestamps", False) if content_type == "transcript" else None,
                "isReady": content_data.get("isReady", False) if content_type == "quiz" else None
            }
        else:
            return {"error": f"Content not found for user: {user_id}"}
            
    except Exception as e:
        print(f"Error retrieving content: {e}")
        return {"error": str(e)}