import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // ADDED Auth methods
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Configuration and State ---
setLogLevel('debug');

// IMPORTANT: Global variables provided by the Canvas environment MUST be used
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Replace this with your actual Firebase config for local testing if needed
const LOCAL_FIREBASE_CONFIG = null; 
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : LOCAL_FIREBASE_CONFIG;

let db;
let auth;
export let currentUserId = null;

// --- Utility Functions ---

function getCollectionRef() {
    if (!db || !currentUserId) {
        console.error("Database or User ID is not ready.");
        return null;
    }
    // Private data path: /artifacts/{appId}/users/{userId}/tasks
    const collectionPath = `artifacts/${appId}/users/${currentUserId}/tasks`;
    return collection(db, collectionPath);
}

// --- Auth Backend Functions ---

/**
 * Handles user sign-up with email and password.
 */
export async function handleSignUp(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        console.error("Signup failed:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Handles user login with email and password.
 */
export async function handleLogin(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        console.error("Login failed:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Handles user sign-out.
 */
export async function handleSignOut() {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Signout failed:", error);
    }
}

// --- Public API / Backend Functions ---

/**
 * Initializes Firebase and sets up the auth listener.
 * @param {Function} onAuthSuccessCallback - Callback to run after successful sign-in.
 * @param {Function} onAuthErrorCallback - Callback to run on authentication failure.
 */
export async function setupFirebaseAndAuth(onAuthSuccessCallback, onAuthErrorCallback) {
    if (!firebaseConfig) {
        onAuthErrorCallback("Error: Firebase configuration missing.");
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Try signing in with provided custom token if available (for Canvas environment)
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserId = user.uid;
                onAuthSuccessCallback(currentUserId);
            } else {
                // If user is null, authentication is required (login/signup page)
                currentUserId = null;
                onAuthErrorCallback("Authentication required.");
            }
        });

    } catch (error) {
        console.error("Firebase setup failed:", error);
        onAuthErrorCallback(`Error during setup: ${error.message}`);
    }
}

/**
 * Sets up a real-time listener for tasks and calls a rendering callback.
 * @param {Function} renderCallback - Function in the client to update the UI.
 */
export function loadTasks(renderCallback) {
    const collectionRef = getCollectionRef();
    if (!collectionRef) return;

    // Create a query to order tasks by creation time (newest first)
    // NOTE: In a real environment, you might need to create an index for this query.
    const tasksQuery = query(collectionRef, orderBy('createdAt', 'desc'));

    // Set up real-time listener (onSnapshot)
    onSnapshot(tasksQuery, (snapshot) => {
        const tasks = [];
        snapshot.forEach((doc) => {
            tasks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        // Pass the array of tasks back to the frontend for rendering
        renderCallback(tasks);
    }, (error) => {
        console.error("Error fetching tasks:", error);
        // Pass error to frontend
        renderCallback([], error.message); 
    });
}

/**
 * Adds a new task to the database.
 */
export async function addTask(text) {
    const collectionRef = getCollectionRef();
    if (!collectionRef) return;

    try {
        await addDoc(collectionRef, {
            text: text.trim(),
            completed: false,
            createdAt: Date.now()
        });
    } catch (error) {
        console.error("Error adding document: ", error);
    }
}

/**
 * Toggles the 'completed' status of a task.
 */
export async function toggleTask(taskId, isCompleted) {
    const collectionRef = getCollectionRef();
    if (!collectionRef) return;

    try {
        const docRef = doc(collectionRef, taskId);
        await updateDoc(docRef, { completed: !isCompleted });
    } catch (error) {
        console.error("Error toggling task: ", error);
    }
}

/**
 * Deletes a task from the database.
 */
export async function deleteTask(taskId) {
    const collectionRef = getCollectionRef();
    if (!collectionRef) return;

    try {
        const docRef = doc(collectionRef, taskId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting task: ", error);
    }
}