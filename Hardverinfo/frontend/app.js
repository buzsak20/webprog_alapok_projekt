const API_BASE = 'http://localhost:3000';

const state = {
  token: localStorage.getItem('hardverinfo_token') || null,
  user: JSON.parse(localStorage.getItem('hardverinfo_user') || 'null'),
  posts: [],
  selectedPostId: null
};

const s = (selector) => document.querySelector(selector);
const pageTitle = s('#pageTitle');
const postsGrid = s('#postsGrid');
const commentList = s('#commentList');
const detailCategory = s('#detailCategory');
const detailTitle = s('#detailTitle');
const detailAuthor = s('#detailAuthor');
const detailDate = s('#detailDate');
const detailStatus = s('#detailStatus');
const detailBody = s('#detailBody');
const loginForm = s('#loginForm');
const registerForm = s('#registerForm');
const postForm = s('#postForm');
const commentForm = s('#commentForm');
const logoutBtn = s('#logoutBtn');
const loginToggle = s('#loginToggle');
const sessionBox = s('#sessionBox');
const postCount = s('#postCount');
const commentCount = s('#commentCount');
const userCount = s('#userCount');

function saveSession() {
  localStorage.setItem('hardverinfo_token', state.token || '');
  localStorage.setItem('hardverinfo_user', JSON.stringify(state.user || null));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('hardverinfo_token');
  localStorage.removeItem('hardverinfo_user');
}

function authHeaders() {
  return state.token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` }
    : { 'Content-Type': 'application/json' };
}

function showToast(message) {
  const wrap = s('#toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function fmtDate(value) {
  return new Date(value).toLocaleString('hu-HU');
}

function routeTo(hash) {
  location.hash = hash;
}

function setView(route) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const map = {
    welcome: '#view-welcome',
    posts: '#view-posts',
    post: '#view-detail',
    auth: '#view-auth',
    new: '#view-editor',
    admin: '#view-admin',
    arch: '#view-arch'
  };
  const target = document.querySelector(map[route] || '#view-welcome');
  if (target) target.classList.remove('hidden');
  pageTitle.textContent = {
    welcome: 'Üdvözlő oldal',
    posts: 'Bejegyzések',
    post: 'Részletek',
    auth: 'Autentikáció',
    new: 'Új bejegyzés',
    admin: 'Admin',
    arch: 'Architektúra'
  }[route] || 'HardverInfo';
}

async function fetchPosts() {
  try {
    const res = await fetch(`${API_BASE}/posts`);
    const data = await res.json();
    state.posts = Array.isArray(data) ? data : [];
    renderStats();
    renderPosts();
  } catch {
    showToast('Nem sikerült betölteni a bejegyzéseket.');
  }
}

function renderStats() {
  postCount.textContent = state.posts.length;
  commentCount.textContent = state.posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
  userCount.textContent = new Set(state.posts.map(post => post.user?.id).filter(Boolean)).size;
}

function renderPosts() {
  if (!state.posts.length) {
    postsGrid.innerHTML = '<div class="panel empty">Nincs még megjeleníthető bejegyzés.</div>';
    return;
  }

  postsGrid.innerHTML = state.posts.map(post => `
    <article class="panel post-card">
      <span class="badge">${post.category}</span>
      <div class="post-meta">
        <span>${post.user?.name || 'Ismeretlen szerző'}</span>
        <span>${fmtDate(post.createdAt)}</span>
        <span>${post.comments?.length || 0} komment</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
      <div class="post-actions">
        <button class="btn btn-primary" data-open-post="${post.id}">Olvasás</button>
        <span class="muted">${post.status}</span>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('[data-open-post]').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.selectedPostId = Number(btn.dataset.openPost);
      await fetchPostDetail(state.selectedPostId);
      routeTo(`post/${state.selectedPostId}`);
    });
  });
}

async function fetchPostDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/posts/${id}`);
    if (!res.ok) throw new Error();
    const post = await res.json();

    detailCategory.textContent = post.category;
    detailTitle.textContent = post.title;
    detailAuthor.textContent = post.user?.name || 'Ismeretlen szerző';
    detailDate.textContent = fmtDate(post.createdAt);
    detailStatus.textContent = post.status;
    detailBody.innerHTML = post.content.split('
').map(p => `<p>${p}</p>`).join('');

    const comments = post.comments || [];
    commentList.innerHTML = comments.length
      ? comments.map(comment => `
          <div class="comment">
            <div class="comment-head">
              <strong>${comment.guestName || 'Olvasó'}</strong>
              <time>${fmtDate(comment.createdAt)}</time>
            </div>
            <p>${comment.content}</p>
          </div>
        `).join('')
      : '<div class="empty">Ehhez a bejegyzéshez még nincs komment.</div>';

    setView('post');
  } catch {
    showToast('Nem sikerült megnyitni a bejegyzést.');
  }
}

async function registerUser(form) {
  const fd = new FormData(form);
  const payload = {
    name: fd.get('name'),
    username: fd.get('username'),
    password: fd.get('password')
  };

  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Sikertelen regisztráció.');

  state.token = data.token;
  state.user = data.user;
  saveSession();
  renderSession();
  showToast('Sikeres regisztráció.');
  routeTo('posts');
  await fetchPosts();
}

async function loginUser(form) {
  const fd = new FormData(form);
  const payload = {
    username: fd.get('username'),
    password: fd.get('password')
  };

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Sikertelen bejelentkezés.');

  state.token = data.token;
  state.user = data.user;
  saveSession();
  renderSession();
  showToast('Sikeres bejelentkezés.');
  routeTo('posts');
  await fetchPosts();
}

async function createPost(form) {
  const fd = new FormData(form);
  const payload = {
    title: fd.get('title'),
    category: fd.get('category'),
    content: fd.get('content')
  };

  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'A bejegyzés mentése sikertelen.');

  form.reset();
  showToast('Bejegyzés mentve.');
  routeTo('posts');
  await fetchPosts();
}

async function createComment(form) {
  const fd = new FormData(form);
  const payload = {
    content: fd.get('content'),
    guestName: state.user ? null : fd.get('author'),
    userId: state.user?.id || null
  };

  const res = await fetch(`${API_BASE}/posts/${state.selectedPostId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'A komment mentése sikertelen.');

  form.reset();
  showToast('Komment elküldve.');
  await fetchPostDetail(state.selectedPostId);
  await fetchPosts();
}

function renderSession() {
  loginToggle.classList.toggle('hidden', !!state.user);
  logoutBtn.classList.toggle('hidden', !state.user);

  if (!sessionBox) return;
  if (!state.user) {
    sessionBox.innerHTML = '<p>Nincs aktív munkamenet.</p>';
    return;
  }

  sessionBox.innerHTML = `
    <div class="comment">
      <strong>${state.user.name}</strong>
      <div class="muted">Felhasználónév: ${state.user.username}</div>
      <div class="muted">Szerepkör: ${state.user.role}</div>
    </div>
  `;
}

function handleRoute() {
  const hash = location.hash.replace('#', '') || 'welcome';
  const [route, id] = hash.split('/');
  if (route === 'post' && id) {
    state.selectedPostId = Number(id);
    fetchPostDetail(state.selectedPostId);
    return;
  }
  setView(route);
}

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await registerUser(e.target);
  } catch (err) {
    showToast(err.message);
  }
});

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await loginUser(e.target);
  } catch (err) {
    showToast(err.message);
  }
});

postForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await createPost(e.target);
  } catch (err) {
    showToast(err.message);
  }
});

commentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await createComment(e.target);
  } catch (err) {
    showToast(err.message);
  }
});

logoutBtn?.addEventListener('click', () => {
  clearSession();
  renderSession();
  showToast('Kijelentkeztél.');
  routeTo('welcome');
});

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', async () => {
  renderSession();
  handleRoute();
  await fetchPosts();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => null);
  }
});
