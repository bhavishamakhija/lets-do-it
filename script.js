import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, Timestamp, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = { apiKey: "AIzaSyC10vLz8HCpelvdqg-etneUt95JkefGoUk", authDomain: "lets-do-it-dd683.firebaseapp.com", projectId: "lets-do-it-dd683", storageBucket: "lets-do-it-dd683.firebasestorage.app", messagingSenderId: "994172286869", appId: "1:994172286869:web:6eff7b0860fb99062a689c" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const modal = document.getElementById('authModal');
const appContainer = document.getElementById('app');
const modalTitle = document.getElementById('modalTitle');
const authBtn = document.getElementById('authBtn');
const switchMode = document.getElementById('switchMode');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authForm = document.getElementById('authForm');
const authLoading = document.getElementById('authLoading');
const authError = document.getElementById('authError');
const taskInput = document.getElementById('taskInput');
const prioritySelect = document.getElementById('prioritySelect');
const dueInput = document.getElementById('dueDate');
const taskTypeSelect = document.getElementById('taskTypeSelect');
const shareEmailInput = document.getElementById('shareEmail');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const statsEl = document.getElementById('stats');
const userEmailEl = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const themeSelect = document.getElementById('themeSelect');
const toggleBtns = document.querySelectorAll('.toggle-btn');

let currentUser = null;
let tasksCol = null;
let unsubscribeTasks = null;
let currentTaskType = 'personal';
let allTasks = [];

// AUTH
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    modal.classList.remove('active');
    appContainer.style.display = 'block';
    userEmailEl.textContent = user.email;
    tasksCol = collection(db, 'tasks');
    startTaskListener();
    loadTheme();
  } else {
    appContainer.style.display = 'none';
    modal.classList.add('active');
    if (unsubscribeTasks) unsubscribeTasks();
  }
});

let isLogin = true;
switchMode.onclick = () => {
  isLogin = !isLogin;
  modalTitle.textContent = isLogin ? 'Log In' : 'Sign Up';
  authBtn.textContent = isLogin ? 'Log In' : 'Create Account';
  switchMode.textContent = isLogin ? 'Create an account' : 'Already have an account? Log in';
  authError.classList.remove('show');
};

const showError = msg => { authError.textContent = msg; authError.classList.add('show'); setTimeout(() => authError.classList.remove('show'), 5000); };

authBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return showError('Fill all fields');
  authForm.style.display = 'none';
  authLoading.style.display = 'block';
  try {
    isLogin ? await signInWithEmailAndPassword(auth, email, password) : await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) { showError(err.message); authForm.style.display = 'block'; authLoading.style.display = 'none'; }
};

logoutBtn.onclick = () => confirm('Logout?') && signOut(auth);

// TASKS LISTENER
const startTaskListener = () => {
  const q = query(tasksCol, orderBy('timestamp', 'desc'));
  unsubscribeTasks = onSnapshot(q, snap => {
    allTasks = snap.docs.map(d => ({id: d.id, ...d.data()}));
    filterAndRenderTasks();
  });
};

// FILTER & RENDER TASKS
const filterAndRenderTasks = () => {
  let filtered = allTasks.filter(t => {
    // Safety check - ensure task has required fields
    if (!t.type) t.type = 'personal';
    if (!t.creatorId) return false;

    // Filter by task type
    if (currentTaskType === 'personal') {
      if (t.type !== 'personal') return false;
      if (t.creatorId !== currentUser.uid) return false;
    } else if (currentTaskType === 'team') {
      if (t.type !== 'team') return false;
      if (t.creatorId !== currentUser.uid && !(t.sharedWith && t.sharedWith.includes(currentUser.email))) return false;
    }

    // Filter by search
    const search = searchInput.value.toLowerCase();
    if (search && t.text && !t.text.toLowerCase().includes(search)) return false;

    return true;
  });

  renderTasks(filtered);
};

// RENDER TASKS
const renderTasks = docs => {
  taskList.innerHTML = docs.length === 0 ? '<div class="empty-state">No tasks yet – add one!</div>' : '';
  let active = 0;

  docs.forEach(t => {
    if (!t.completed) active++;
    const div = document.createElement('div');
    div.className = `task-item ${t.priority} ${t.type}`;
    
    const dueDate = t.due ? `<span class="due">${new Date(t.due.toDate()).toLocaleDateString()}</span>` : '';
    const sharedWith = t.sharedWith?.length > 0 ? `<span class="team-badge">👥 ${t.sharedWith.length} shared</span>` : '';
    const priority = {high: '🔴 High', medium: '🟡 Med', low: '🟢 Low'}[t.priority] || '🟡 Med';

    div.innerHTML = `
      <input type="checkbox" ${t.completed ? 'checked' : ''}>
      <span class="task-text ${t.completed ? 'completed' : ''}">${t.text || 'Task'}</span>
      <div class="task-meta">
        <span class="priority-badge">${priority}</span>
        ${dueDate}
        ${sharedWith}
      </div>
      ${t.creatorId === currentUser.uid ? '<button class="delete-btn">Delete</button>' : ''}
    `;

    div.querySelector('input').onchange = () => 
      updateDoc(doc(db, 'tasks', t.id), {completed: !t.completed});

    const deleteBtn = div.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.onclick = () => confirm('Delete?') && deleteDoc(doc(db, 'tasks', t.id));
    }

    taskList.appendChild(div);
  });

  statsEl.textContent = `${active} active / ${docs.length} total`;
  
  // Check for due dates and show notifications
  checkDueDates(docs);
};

// CHECK DUE DATES AND NOTIFY
const checkDueDates = docs => {
  const today = new Date().toDateString();
  docs.forEach(t => {
    if (t.due && !t.completed) {
      try {
        const dueDate = new Date(t.due.toDate()).toDateString();
        if (dueDate === today && Notification.permission === 'granted') {
          new Notification('Task Due Today!', {
            body: t.text,
            icon: '📋'
          });
        }
      } catch(e) {
        console.log('Error checking due date:', e);
      }
    }
  });
};

// REQUEST NOTIFICATION PERMISSION
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ADD TASK
const addTask = async () => {
  const text = taskInput.value.trim();
  if (!text) return;

  const taskData = {
    text,
    completed: false,
    priority: prioritySelect.value,
    due: dueInput.value ? Timestamp.fromDate(new Date(dueInput.value)) : null,
    type: taskTypeSelect.value,
    creatorId: currentUser.uid,
    creatorEmail: currentUser.email,
    sharedWith: [],
    timestamp: Timestamp.now()
  };

  if (taskTypeSelect.value === 'team' && shareEmailInput.value.trim()) {
    taskData.sharedWith = [shareEmailInput.value.trim()];
  }

  try {
    await addDoc(tasksCol, taskData);
    taskInput.value = '';
    prioritySelect.value = 'medium';
    dueInput.value = '';
    shareEmailInput.value = '';
    shareEmailInput.style.display = 'none';
  } catch (err) {
    console.error('Error adding task:', err);
  }
};

addBtn.onclick = addTask;
taskInput.addEventListener('keydown', e => e.key === 'Enter' && addTask());

// TASK TYPE CHANGE
taskTypeSelect.onchange = () => {
  if (taskTypeSelect.value === 'team') {
    shareEmailInput.style.display = 'block';
  } else {
    shareEmailInput.style.display = 'none';
  }
};

// TOGGLE BUTTONS
toggleBtns.forEach(btn => {
  btn.onclick = () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTaskType = btn.dataset.type;
    filterAndRenderTasks();
  };
});

// Set Personal as default active
if (toggleBtns.length > 0) {
  toggleBtns[0].classList.add('active');
}

// SEARCH
searchInput.addEventListener('input', filterAndRenderTasks);

// THEMES
const saveTheme = theme => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('appTheme', theme);
};

const loadTheme = () => {
  const saved = localStorage.getItem('appTheme') || 'coquette';
  document.documentElement.dataset.theme = saved;
  themeSelect.value = saved;
};

themeSelect.onchange = () => saveTheme(themeSelect.value);