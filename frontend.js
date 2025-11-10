import { 
    setupFirebaseAndAuth, 
    handleSignUp, 
    handleLogin, 
    handleSignOut, 
    loadTasks, 
    addTask, 
    toggleTask, 
    deleteTask 
} from './backend.js';

// --- Global DOM Elements ---
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const taskForm = document.getElementById('task-form');
const tasksList = document.getElementById('tasks-list');
const authStatus = document.getElementById('auth-status');
const errorMessage = document.getElementById('error-message');
const loadingIndicator = document.getElementById('loading-indicator');
const signoutBtn = document.getElementById('signout-btn');
const linkToSignup = document.getElementById('link-to-signup');
const linkToLogin = document.getElementById('link-to-login');

// --- State and UI Control ---

function displayError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = message ? 'block' : 'none';
}

function setLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
}

/**
 * Handles client-side routing to show the correct page section.
 * @param {string} pageId - 'login-page', 'signup-page', or 'home-page'
 */
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });
    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = 'block';
    }
}

// --- Task Rendering Functions ---

/**
 * Creates the HTML element for a single task.
 * @param {Object} task 
 */
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between p-4 bg-white rounded-xl shadow transition duration-150 ease-in-out hover:shadow-lg';
    
    // Task content and toggle button
    const content = document.createElement('div');
    content.className = 'flex items-center flex-grow cursor-pointer';
    content.onclick = () => toggleTask(task.id, task.completed);
    
    const statusIcon = document.createElement('span');
    statusIcon.className = `w-5 h-5 mr-3 flex items-center justify-center rounded-full border-2 ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`;
    statusIcon.innerHTML = task.completed ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : '';

    const textSpan = document.createElement('span');
    textSpan.textContent = task.text;
    textSpan.className = `flex-grow break-words ${task.completed ? 'task-done' : 'text-gray-800'}`;

    content.appendChild(statusIcon);
    content.appendChild(textSpan);

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'ml-4 flex-shrink-0 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-lg hover:bg-red-200 transition duration-200';
    deleteButton.onclick = (e) => {
        e.stopPropagation(); // Prevent toggling when deleting
        deleteTask(task.id);
    };

    li.appendChild(content);
    li.appendChild(deleteButton);
    return li;
}

/**
 * Renders the entire list of tasks. This is the callback for onSnapshot.
 * @param {Array} tasks - The array of task objects from Firestore.
 * @param {string | null} error - An error message if fetching failed.
 */
export function renderTasks(tasks, error = null) {
    tasksList.innerHTML = ''; // Clear existing list
    
    if (error) {
        displayError(`Task loading error: ${error}`);
        return;
    }

    if (tasks.length === 0) {
        const message = document.createElement('p');
        message.className = 'text-center text-gray-500 p-4 border border-dashed border-gray-300 rounded-lg';
        message.textContent = "No tasks yet! Add one above to get started.";
        tasksList.appendChild(message);
    } else {
        tasks.forEach(task => {
            tasksList.appendChild(createTaskElement(task));
        });
    }
}

// --- Event Handlers ---

function setupEventListeners() {
    // 1. Authentication Links
    linkToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('signup-page');
        displayError('');
    });
    linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('login-page');
        displayError('');
    });
    
    // 2. Sign Up Submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        displayError('');
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        const result = await handleSignUp(email, password);
        setLoading(false);

        if (!result.success) {
            displayError(result.message);
        } else {
            // Auth listener in backend.js will handle showing 'home-page'
        }
    });

    // 3. Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        displayError('');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const result = await handleLogin(email, password);
        setLoading(false);

        if (!result.success) {
            displayError(result.message);
        } else {
            // Auth listener in backend.js will handle showing 'home-page'
        }
    });

    // 4. Sign Out
    signoutBtn.addEventListener('click', async () => {
        setLoading(true);
        await handleSignOut();
        // Auth listener in backend.js will handle showing 'login-page'
        setLoading(false);
    });

    // 5. Add Task
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('task-input');
        const text = input.value.trim();
        if (text) {
            addTask(text);
            input.value = ''; // Clear input field
        }
    });
}


// --- Initialization ---

/**
 * Callback run when authentication is successful (user is logged in).
 * @param {string} userId - The unique ID of the current user.
 */
function onAuthSuccess(userId) {
    authStatus.textContent = `Signed in as: ${userId}`;
    showPage('home-page');
    displayError('');
    setLoading(false);
    
    // Start listening for tasks now that we have a user ID
    // We pass 'renderTasks' as the callback for the backend service to use
    loadTasks(renderTasks);
}

/**
 * Callback run when authentication is required (user is signed out or error).
 * @param {string} message - Status or error message.
 */
function onAuthRequired(message) {
    authStatus.textContent = message;
    showPage('login-page');
    displayError('');
    setLoading(false);
}


// Main function to start the application
function initApp() {
    setupEventListeners();
    setLoading(true); // Show connecting message initially
    
    // Start the Firebase setup and authentication flow
    setupFirebaseAndAuth(onAuthSuccess, onAuthRequired);
}

// Ensure the app starts after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);