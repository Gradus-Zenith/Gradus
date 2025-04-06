
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


// Specific user ID
const SPECIFIC_USER_ID = getUserId();

// Get video ID from URL
function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    console.log('Current Video ID:', videoId);
    return videoId;
}

// Save notes to Firebase
async function saveNotesToFirebase() {
    console.log('Save notes function called');
    
    const videoId = getVideoId();
    if (!videoId) {
        console.error('No video ID found');
        alert('Error: No video ID found');
        return;
    }

    const notesArea = document.getElementById('notesArea');
    const notesContent = notesArea.value;
    const saveButton = document.getElementById('saveNotes');

    try {
        // First, try to get the existing document
        const userDocRef = doc(db, 'Users', SPECIFIC_USER_ID);
        const docu = await getDoc(userDocRef);
        
        let updateData = {};
        if (docu.exists) {
            // If document exists, update only the specific video notes
            updateData = {
                [`notes.${videoId}`]: {
                    content: notesContent,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    videoId: videoId
                }
            };
            await updateDoc(userDocRef, updateData);
        } else {
            // If document doesn't exist, create it with initial notes
            updateData = {
                notes: {
                    [videoId]: {
                        content: notesContent,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        videoId: videoId
                    }
                }
            };
            await userDocRef.set(updateData);
        }

        console.log('Notes saved successfully');
        saveButton.innerHTML = '<i class="fas fa-check"></i> Saved!';
        setTimeout(() => {
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
        }, 2000);

    } catch (error) {
        console.error('Error saving notes:', error);
        alert('Error saving notes: ' + error.message);
        saveButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        setTimeout(() => {
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
        }, 2000);
    }
}

// Load notes from Firebase
async function loadNotesFromFirebase() {
    console.log('Loading notes...');
    const videoId = getVideoId();
    
    if (!videoId) {
        console.log('No video ID found for loading notes');
        return;
    }

    try {
        const userDocRef = doc(db, 'Users', SPECIFIC_USER_ID);
        const docu = await getDoc(userDocRef);
        if (docu.exists) {
            const data = docu.data();
            console.log('Retrieved data:', data);
            const videoNotes = data.notes?.[videoId]?.content || '';
            document.getElementById('notesArea').value = videoNotes;
            console.log('Notes loaded successfully');
        } else {
            console.log('No existing notes found');
        }
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

// Auto-save functionality
let saveTimeout;
function setupAutoSave() {
    const notesArea = document.getElementById('notesArea');
    notesArea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveNotesToFirebase, 1000);
    });
}

// Initialize notes functionality
function initializeNotes() {
    console.log('Initializing notes functionality');
    
    const saveButton = document.getElementById('saveNotes');
    if (saveButton) {
        saveButton.addEventListener('click', saveNotesToFirebase);
        console.log('Save button listener added');
    }

    // Load existing notes
    loadNotesFromFirebase();
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', initializeNotes);

// Export functions for debugging
window.debugNotes = {
    save: saveNotesToFirebase,
    load: loadNotesFromFirebase,
    getVideoId: getVideoId
};

export { db }; 