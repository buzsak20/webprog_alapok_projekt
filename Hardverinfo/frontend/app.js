const API_BASE = 'http://localhost:3000';

const state = {
  token: localStorage.getItem('hardverinfo_token') || null,
  user: JSON.parse(localStorage.getItem('hardverinfo_user') || 'null'),
  posts: [],
  selectedPostId: null,
  adminData: { posts: [], comments: [], users: [] }
};

const s = (selector) => document.querySelector(selector);
const sa = (selector) => document.querySelectorAll(selector);

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
const sessionPanel = s('#sessionPanel');
const postCount = s('#postCount');
const commentCount = s('#commentCount');
const userCount = s('#userCount');
const authTitle = s('#authTitle');
const authLead = s('#authLead');
const authLoginBtn = s('#authLoginBtn');
const authRegisterBtn = s('#authRegisterBtn');
const myPosts = s('#myPosts');
const editorGate = s('#editorGate');
const appShell = s('.app-shell');
const welcomeNav = s('a[data-route="welcome"]');
const adminNav = s('[data-admin-nav]');
const adminPosts = s('#adminPosts');
const adminComments = s('#adminComments');
const adminUsers = s('#adminUsers');
const dashboardHero = s('#dashboardHero');

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
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function fmtDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('hu-HU');
}

function routeTo(hash) {
  location.hash = hash;
}

function setView(route) {
  sa('.view').forEach(v => v.classList.add('hidden'));

  const map = {
    welcome: '#view-welcome',
    posts: '#view-posts',
    post: '#view-detail',
    auth: '#view-auth',
    new: '#view-editor',
    admin: '#view-admin',
    arch: '#view-arch'
  };

  const target = s(map[route] || '#view-welcome');
  if (target) target.classList.remove('hidden');

  if (pageTitle) {
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
}

async function fetchPosts() {
  try {
    const res = await fetch(`${API_BASE}/posts`);
    const data = await res.json();
    state.posts = Array.isArray(data) ? data : [];
    renderStats();
    renderPosts();
    renderMyPosts();
    if (location.hash.startsWith('#/post/')) renderDetail();
  } catch {
    showToast('Nem sikerült betölteni a bejegyzéseket.');
  }
}

async function fetchAdminOverview() {
  if (state.user?.role !== 'admin') return;

  try {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Nem sikerült betölteni az admin adatokat.');
    state.adminData = data;
    renderAdmin();
  } catch (err) {
    showToast(err.message);
  }
}

function renderStats() {
  if (postCount) postCount.textContent = state.posts.length;
  if (commentCount) {
    commentCount.textContent = state.posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
  }
  if (userCount) {
    userCount.textContent = new Set(state.posts.map(post => post.user?.id).filter(Boolean)).size;
  }
}

function renderPosts() {
  if (!postsGrid) return;

  const visiblePosts = state.posts.filter(post => post.status !== 'hidden' || state.user?.role === 'admin');

  if (!visiblePosts.length) {
    postsGrid.innerHTML = '<div class="panel empty">Nincs elérhető bejegyzés.</div>';
    return;
  }

  postsGrid.innerHTML = visiblePosts
    .map(post => `
      <article class="panel post-card">
        <span class="badge">${post.category || 'Egyéb'}</span>
        <div class="post-meta">
          <span>${post.user?.name || 'Ismeretlen szerző'}</span>
          <span>${fmtDate(post.createdAt)}</span>
          <span>${post.comments?.length || 0} komment</span>
        </div>
        <h3>${post.title}</h3>
        <p>${post.excerpt || ''}</p>
        <div class="post-actions">
          <button class="btn btn-primary" data-open-post="${post.id}">Olvasd</button>
          <span class="muted">${post.status || 'published'}</span>
        </div>
      </article>
    `)
    .join('');

  sa('[data-open-post]').forEach(btn => {
    btn.addEventListener('click', () => routeTo(`/post/${btn.dataset.openPost}`));
  });
}

function renderDetail() {
  const post = state.posts.find(p => Number(p.id) === Number(state.selectedPostId));

  if (!post) {
    if (detailCategory) detailCategory.textContent = '';
    if (detailTitle) detailTitle.textContent = 'Nincs kiválasztott bejegyzés';
    if (detailAuthor) detailAuthor.textContent = '';
    if (detailDate) detailDate.textContent = '';
    if (detailStatus) detailStatus.textContent = '';
    if (detailBody) detailBody.innerHTML = '<p>Nincsenek elérhető bejegyzések.</p>';
    if (commentList) commentList.innerHTML = '<div class="empty">Ehhez a nézethez előbb válassz bejegyzést.</div>';
    return;
  }

  if (detailCategory) detailCategory.textContent = post.category || '';
  if (detailTitle) detailTitle.textContent = post.title || '';
  if (detailAuthor) detailAuthor.textContent = post.user?.name || 'Ismeretlen szerző';
  if (detailDate) detailDate.textContent = fmtDate(post.createdAt);
  if (detailStatus) detailStatus.textContent = post.status || 'published';
  if (detailBody) {
    detailBody.innerHTML = (post.content || '').split(',').map(p => `<p>${p.trim()}</p>`).join('');
  }

  const isAdmin = state.user?.role === 'admin';
  const comments = (post.comments || []).filter(comment => isAdmin || comment.status === 'approved');

  if (commentList) {
    commentList.innerHTML = comments.length
      ? comments.map(comment => `
          <div class="comment">
            <div class="comment-head">
              <strong>${comment.user?.name || comment.guestName || 'Olvasó'}</strong>
              <time>${fmtDate(comment.createdAt)}</time>
            </div>
            <p>${comment.content}</p>
            <div class="muted">Státusz: ${comment.status || 'approved'}</div>
            ${isAdmin ? `
              <div class="button-row" style="margin-top: var(--space-3)">
                <button class="btn btn-secondary" data-comment-status="pending" data-comment-id="${comment.id}">Függőben</button>
                <button class="btn btn-primary" data-comment-status="approved" data-comment-id="${comment.id}">Jóváhagy</button>
              </div>
            ` : ''}
          </div>
        `).join('')
      : '<div class="empty">Ehhez a bejegyzéshez még nincs komment.</div>';
  }

  bindCommentModerationButtons();
}

function renderSession() {
  const isLoggedIn = !!state.user;
  const isAdmin = state.user?.role === 'admin';

  if (appShell) appShell.classList.toggle('logged-out', !isLoggedIn);
  if (loginToggle) loginToggle.classList.toggle('hidden', isLoggedIn);
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !isLoggedIn);
  if (welcomeNav) welcomeNav.classList.toggle('hidden', isLoggedIn);
  if (adminNav) adminNav.classList.toggle('hidden', !isAdmin);
  if (dashboardHero) dashboardHero.classList.toggle('hidden', !isAdmin);

  if (!sessionBox) return;

  if (!state.user) {
    sessionBox.innerHTML = '<p>Nincs aktív munkamenet.</p>';
    if (sessionPanel) sessionPanel.classList.add('hidden');
    return;
  }

  sessionBox.innerHTML = `
    <div class="comment">
      <strong>${state.user.name || 'Felhasználó'}</strong>
      <div class="muted">Felhasználónév: ${state.user.username}</div>
      <div class="muted">Szerepkör: ${state.user.role || 'felhasznalo'}</div>
    </div>
  `;
}

function renderMyPosts() {
  if (!myPosts || !editorGate || !postForm) return;

  if (!state.user) {
    editorGate.innerHTML = '<div class="empty panel">Bejegyzés írásához először jelentkezz be.</div>';
    postForm.classList.add('hidden');
    myPosts.innerHTML = '<div class="empty">A saját bejegyzésekhez jelentkezz be.</div>';
    return;
  }

  editorGate.innerHTML = '';
  postForm.classList.remove('hidden');

  const mine = state.posts.filter(post => Number(post.user?.id) === Number(state.user.id));

  myPosts.innerHTML = mine.length
    ? mine.map(post => `
        <div class="comment">
          <div class="comment-head">
            <strong>${post.title}</strong>
            <span class="muted">${post.category || ''}</span>
          </div>
          <p>${post.excerpt || ''}</p>
          <div class="button-row" style="margin-top: var(--space-3)">
            <button class="btn btn-secondary" data-open-own-post="${post.id}">Megnyitás</button>
          </div>
        </div>
      `).join('')
    : '<div class="empty">Még nincs saját bejegyzésed.</div>';

  sa('[data-open-own-post]').forEach(btn => {
    btn.addEventListener('click', () => routeTo(`/post/${btn.dataset.openOwnPost}`));
  });
}

function renderAdmin() {
  if (state.user?.role !== 'admin') return;

  if (adminPosts) {
    adminPosts.innerHTML = state.adminData.posts.length
      ? state.adminData.posts.map(post => `
          <div class="moderation-item">
            <div class="comment-head">
              <strong>${post.title}</strong>
              <span class="muted">${post.status}</span>
            </div>
            <p>${post.user?.name || 'Ismeretlen szerző'} · ${fmtDate(post.createdAt)}</p>
            <div class="button-row" style="margin-top: var(--space-3)">
              <button class="btn btn-secondary" data-post-status="hidden" data-post-id="${post.id}">Elrejtés</button>
              <button class="btn btn-primary" data-post-status="published" data-post-id="${post.id}">Publikálás</button>
              <button class="btn btn-secondary" data-delete-post="${post.id}">Törlés</button>
            </div>
          </div>
        `).join('')
      : '<div class="empty">Nincs moderálható bejegyzés.</div>';
  }

  if (adminComments) {
    adminComments.innerHTML = state.adminData.comments.length
      ? state.adminData.comments.map(comment => `
          <div class="moderation-item">
            <div class="comment-head">
              <strong>${comment.user?.name || comment.guestName || 'Olvasó'}</strong>
              <span class="muted">${comment.status}</span>
            </div>
            <p>${comment.content}</p>
            <div class="muted">Bejegyzés: ${comment.post?.title || 'Ismeretlen'}</div>
            <div class="button-row" style="margin-top: var(--space-3)">
              <button class="btn btn-secondary" data-comment-status="pending" data-comment-id="${comment.id}">Függőben</button>
              <button class="btn btn-primary" data-comment-status="approved" data-comment-id="${comment.id}">Jóváhagy</button>
            </div>
          </div>
        `).join('')
      : '<div class="empty">Nincs moderálható komment.</div>';
  }

  if (adminUsers) {
    adminUsers.innerHTML = state.adminData.users.length
      ? `
        <table class="table">
          <thead>
            <tr>
              <th>Név</th>
              <th>Felhasználónév</th>
              <th>Szerepkör</th>
              <th>Létrehozva</th>
            </tr>
          </thead>
          <tbody>
            ${state.adminData.users.map(user => `
              <tr>
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>${fmtDate(user.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<div class="empty">Nincs felhasználói adat.</div>';
  }

  bindAdminButtons();
}

async function loginUser(payload) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Hibás bejelentkezés.');

  state.token = data.token;
  state.user = data.user;
  saveSession();
}

async function registerUser(payload) {
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
}

async function createPost(payload) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Nem sikerült létrehozni a bejegyzést.');
  return data;
}

async function createComment(postId, payload) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Nem sikerült elküldeni a kommentet.');
  return data;
}

async function updatePostStatus(postId, status) {
  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Nem sikerült frissíteni a bejegyzést.');
  return data;
}

async function deletePost(postId) {
  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Nem sikerült törölni a bejegyzést.');
  return data;
}

async function updateCommentStatus(commentId, status) {
  const res = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Nem sikerült frissíteni a kommentet.');
  return data;
}

function bindAdminButtons() {
  sa('[data-post-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await updatePostStatus(btn.dataset.postId, btn.dataset.postStatus);
        showToast('Bejegyzés státusza frissítve.');
        await fetchPosts();
        await fetchAdminOverview();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  sa('[data-delete-post]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await deletePost(btn.dataset.deletePost);
        showToast('Bejegyzés törölve.');
        await fetchPosts();
        await fetchAdminOverview();
        if (Number(state.selectedPostId) === Number(btn.dataset.deletePost)) {
          state.selectedPostId = null;
          routeTo('/posts');
        }
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  bindCommentModerationButtons();
}

function bindCommentModerationButtons() {
  sa('[data-comment-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await updateCommentStatus(btn.dataset.commentId, btn.dataset.commentStatus);
        showToast('Komment státusza frissítve.');
        await fetchPosts();
        if (state.user?.role === 'admin') await fetchAdminOverview();
        if (state.selectedPostId) renderDetail();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

function handleRoute() {
  const hash = location.hash || '#/welcome';
  const cleaned = hash.replace(/^#\/?/, '');
  const parts = cleaned.split('/').filter(Boolean);

  let route = parts[0] || 'welcome';
  const subroute = parts[1] || null;

  if (state.user && route === 'welcome') {
    route = 'posts';
    location.hash = '/posts';
    return;
  }

  if (route === 'admin' && state.user?.role !== 'admin') {
    routeTo('/posts');
    return;
  }

  setView(route);

  if (route === 'auth') {
    const isRegister = subroute === 'register';
    if (loginForm) loginForm.classList.toggle('hidden', isRegister);
    if (registerForm) registerForm.classList.toggle('hidden', !isRegister);
    if (sessionPanel) sessionPanel.classList.add('hidden');
    if (authLoginBtn) authLoginBtn.classList.toggle('hidden', !isRegister);
    if (authRegisterBtn) authRegisterBtn.classList.toggle('hidden', isRegister);
    if (authTitle) authTitle.textContent = isRegister ? 'Regisztráció' : 'Bejelentkezés';
    if (authLead) {
      authLead.textContent = isRegister
        ? 'Ezen a felületen van lehetőséged új fiókot létrehozni.'
        : 'A bejelentkezés felhasználónév és jelszó kombinációjával lehetséges.';
    }
  }

  if (route === 'post' && parts[1]) {
    state.selectedPostId = Number(parts[1]);
    renderDetail();
  }

  if (route === 'admin' && state.user?.role === 'admin') {
    fetchAdminOverview();
  }

  renderSession();
}

if (loginToggle) loginToggle.addEventListener('click', () => routeTo('/auth/login'));
if (authLoginBtn) authLoginBtn.addEventListener('click', (e) => { e.preventDefault(); routeTo('/auth/login'); });
if (authRegisterBtn) authRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); routeTo('/auth/register'); });

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    clearSession();
    renderSession();
    showToast('Kijelentkeztél.');
    routeTo('/welcome');
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    try {
      await registerUser({
        name: fd.get('name'),
        username: fd.get('username'),
        password: fd.get('password')
      });
      registerForm.reset();
      renderSession();
      showToast('Sikeres regisztráció.');
      await fetchPosts();
      routeTo('/posts');
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    try {
      await loginUser({
        username: fd.get('username'),
        password: fd.get('password')
      });
      loginForm.reset();
      renderSession();
      showToast('Sikeres bejelentkezés.');
      await fetchPosts();
      if (state.user?.role === 'admin') await fetchAdminOverview();
      routeTo('/posts');
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.user) {
      showToast('Új bejegyzéshez jelentkezz be.');
      routeTo('/auth/login');
      return;
    }
    const fd = new FormData(postForm);
    try {
      await createPost({
        title: fd.get('title'),
        category: fd.get('category'),
        content: fd.get('content')
      });
      postForm.reset();
      showToast('Bejegyzés mentve.');
      await fetchPosts();
      routeTo('/posts');
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (commentForm) {
  const authorInput = commentForm.querySelector('[name="author"]');
  if (authorInput) authorInput.remove();

  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.selectedPostId) {
      showToast('Nincs kiválasztott bejegyzés.');
      return;
    }
    const fd = new FormData(commentForm);
    try {
      await createComment(state.selectedPostId, {
        content: fd.get('content'),
        userId: state.user?.id ?? null
      });
      commentForm.reset();
      showToast('Komment elküldve. Moderátori jóváhagyás után jelenik meg.');
      await fetchPosts();
      renderDetail();
    } catch (err) {
      showToast(err.message);
    }
  });
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', async () => {
  renderSession();
  await fetchPosts();
  if (state.user?.role === 'admin') await fetchAdminOverview();
  handleRoute();
});
