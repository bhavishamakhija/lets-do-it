import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, Timestamp, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = { apiKey: "AIzaSyC10vLz8HCpelvdqg-etneUt95JkefGoUk", authDomain: "lets-do-it-dd683.firebaseapp.com", projectId: "lets-do-it-dd683", storageBucket: "lets-do-it-dd683.firebasestorage.app", messagingSenderId: "994172286869", appId: "1:994172286869:web:6eff7b0860fb99062a689c" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
const dueInput = document.getElementById('dueDate');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const statsEl = document.getElementById('stats');
const userEmailEl = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const themeBtn = document.querySelector('.theme-toggle');

let currentUser = null;
let tasksCol = null;
let unsubscribeTasks = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    modal.classList.remove('active');
    appContainer.style.display = 'block';
    userEmailEl.textContent = user.email;
    tasksCol = collection(db, 'users', user.uid, 'tasks');
    startTaskListener();
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

const startTaskListener = () => {
  const q = query(tasksCol, orderBy('timestamp', 'desc'));
  unsubscribeTasks = onSnapshot(q, snap => renderTasks(snap.docs.map(d => ({id: d.id, ...d.data()}))));
};

const renderTasks = docs => {
  taskList.innerHTML = docs.length === 0 ? '<div class="empty-state">No tasks yet – add one!</div>' : '';
  let active = 0;
  docs.forEach(t => {
    if (!t.completed) active++;
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `<input type="checkbox" ${t.completed?'checked':''}>
      <span class="task-text ${t.completed?'completed':''}">${t.text||'Task'}</span>
      ${t.due ? `<span class="due">${new Date(t.due.toDate()).toLocaleDateString()}</span>` : ''}
      <button class="delete-btn">Delete</button>`;
    div.querySelector('input').onchange = () => updateDoc(doc(db, 'users', currentUser.uid, 'tasks', t.id), {completed: !t.completed});
    div.querySelector('.delete-btn').onclick = () => confirm('Delete?') && deleteDoc(doc(db, 'users', currentUser.uid, 'tasks', t.id));
    taskList.appendChild(div);
  });
  statsEl.textContent = `${active} active / ${docs.length} total`;
};

const addTask = async () => {
  const text = taskInput.value.trim();
  if (!text) return;
  await addDoc(tasksCol, { text, completed: false, due: dueInput.value ? Timestamp.fromDate(new Date(dueInput.value)) : null, timestamp: Timestamp.now() });
  taskInput.value = ''; dueInput.value = '';
};
addBtn.onclick = addTask;
taskInput.addEventListener('keydown', e => e.key === 'Enter' && addTask());

const setTheme = theme => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); themeBtn.className = theme === 'dark' ? 'theme-toggle fas fa-sun' : 'theme-toggle fas fa-moon'; };
setTheme(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeBtn.onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
