// ============ State ============
let token = localStorage.getItem('blog_token');
let currentUser = null;
let isRegisterMode = false;
let editingPostId = null;
let currentPostId = null;

const API = '/api';

// ============ Helpers ============
async function api(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 2500);
}

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function initial(name) { return name ? name.charAt(0).toUpperCase() : '?'; }

// ============ Navigation ============
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  const el = document.getElementById('view-' + name);
  if (el) el.style.display = 'block';

  if (name === 'feed') loadPosts();
  if (name === 'auth') { /* already set up */ }
  if (name === 'write') {
    if (!editingPostId) {
      document.getElementById('write-title').textContent = 'Create New Post';
      document.getElementById('post-title').value = '';
      document.getElementById('post-content').value = '';
      document.getElementById('post-submit').textContent = 'Publish';
    }
  }
}

function updateNav() {
  const area = document.getElementById('nav-auth-area');
  if (currentUser) {
    area.innerHTML = `
      <div class="nav-user">
        <div class="nav-avatar">${initial(currentUser.username)}</div>
        <span class="nav-username">${esc(currentUser.username)}</span>
        <button class="btn-logout" onclick="logout()">Logout</button>
      </div>`;
    document.getElementById('btn-new-post').style.display = 'inline-flex';
  } else {
    area.innerHTML = `<a href="#" class="nav-link" onclick="showView('auth')">Sign In</a>`;
    document.getElementById('btn-new-post').style.display = 'none';
  }
}

// ============ Auth ============
function toggleAuthMode(e) {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;
  document.getElementById('fg-username').style.display = isRegisterMode ? 'block' : 'none';
  document.getElementById('auth-title').textContent = isRegisterMode ? 'Create Account' : 'Sign In';
  document.getElementById('auth-subtitle').textContent = isRegisterMode ? 'Join the community today.' : 'Welcome back! Enter your details.';
  document.getElementById('auth-submit').textContent = isRegisterMode ? 'Sign Up' : 'Sign In';
  document.getElementById('auth-toggle-text').textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
  document.getElementById('auth-toggle-link').textContent = isRegisterMode ? 'Sign In' : 'Sign Up';
}

document.getElementById('auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const username = document.getElementById('auth-username').value.trim();

  if (!email || !password) return toast('Fill in all fields', 'error');
  if (isRegisterMode && !username) return toast('Username required', 'error');

  try {
    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const body = isRegisterMode ? { username, email, password } : { email, password };
    const data = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('blog_token', token);
    updateNav();
    showView('feed');
    toast(isRegisterMode ? 'Account created!' : 'Welcome back!');
  } catch (err) { toast(err.message, 'error'); }
});

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('blog_token');
  updateNav();
  showView('feed');
  toast('Logged out');
}

async function loadUser() {
  if (!token) return;
  try {
    currentUser = await api('/api/auth/me');
    updateNav();
  } catch { token = null; localStorage.removeItem('blog_token'); }
}

// ============ Posts ============
async function loadPosts() {
  const list = document.getElementById('posts-list');
  const empty = document.getElementById('feed-empty');
  const loading = document.getElementById('feed-loading');

  loading.style.display = 'flex';
  list.innerHTML = '';
  empty.style.display = 'none';

  try {
    const posts = await api('/api/posts');
    loading.style.display = 'none';

    if (posts.length === 0) { empty.style.display = 'flex'; return; }

    posts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.onclick = () => openPost(p._id);
      card.innerHTML = `
        <div class="post-card-header">
          <div class="post-avatar">${initial(p.author?.username)}</div>
          <div class="post-meta"><strong>${esc(p.author?.username || 'Unknown')}</strong> · ${timeAgo(p.createdAt)}</div>
        </div>
        <h3>${esc(p.title)}</h3>
        <p class="excerpt">${esc(p.content)}</p>
        <div class="post-card-footer">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            ${p.commentCount || 0} comments
          </span>
        </div>`;
      list.appendChild(card);
    });
  } catch (err) {
    loading.style.display = 'none';
    toast('Failed to load posts', 'error');
  }
}

async function openPost(id) {
  currentPostId = id;
  showView('post');
  const detail = document.getElementById('post-detail');
  detail.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const p = await api(`/api/posts/${id}`);
    const isOwner = currentUser && p.author?._id === currentUser._id;

    detail.innerHTML = `
      <div class="post-detail-meta">
        <div class="post-avatar">${initial(p.author?.username)}</div>
        <div>
          <div style="font-weight:600;font-size:.95rem">${esc(p.author?.username || 'Unknown')}</div>
          <div style="font-size:.8rem;color:var(--t3)">${timeAgo(p.createdAt)}${p.updatedAt !== p.createdAt ? ' · edited' : ''}</div>
        </div>
      </div>
      <h1>${esc(p.title)}</h1>
      <div class="post-body">${esc(p.content)}</div>
      ${isOwner ? `
      <div class="post-detail-actions">
        <button class="btn btn-ghost btn-sm" onclick="editPost('${p._id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deletePost('${p._id}')">Delete</button>
      </div>` : ''}`;

    renderComments(p.comments || [], id);
  } catch (err) {
    detail.innerHTML = '<p style="color:var(--t3)">Failed to load post.</p>';
  }
}

// ============ Write / Edit Post ============
document.getElementById('post-form').addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  if (!title || !content) return toast('Fill in all fields', 'error');

  try {
    if (editingPostId) {
      await api(`/api/posts/${editingPostId}`, { method: 'PUT', body: JSON.stringify({ title, content }) });
      toast('Post updated!');
      editingPostId = null;
    } else {
      await api('/api/posts', { method: 'POST', body: JSON.stringify({ title, content }) });
      toast('Post published!');
    }
    showView('feed');
  } catch (err) { toast(err.message, 'error'); }
});

async function editPost(id) {
  try {
    const p = await api(`/api/posts/${id}`);
    editingPostId = id;
    document.getElementById('write-title').textContent = 'Edit Post';
    document.getElementById('post-title').value = p.title;
    document.getElementById('post-content').value = p.content;
    document.getElementById('post-submit').textContent = 'Save Changes';
    showView('write');
  } catch (err) { toast(err.message, 'error'); }
}

async function deletePost(id) {
  if (!confirm('Delete this post and all its comments?')) return;
  try {
    await api(`/api/posts/${id}`, { method: 'DELETE' });
    toast('Post deleted');
    showView('feed');
  } catch (err) { toast(err.message, 'error'); }
}

// ============ Comments ============
function renderComments(comments, postId) {
  const section = document.getElementById('comments-section');
  const formHtml = currentUser ? `
    <form class="comment-form" onsubmit="addComment(event, '${postId}')">
      <input type="text" id="comment-input" placeholder="Write a comment..." maxlength="500"/>
      <button type="submit" class="btn btn-primary btn-sm">Post</button>
    </form>` : `<p style="font-size:.85rem;color:var(--t3);margin-bottom:16px"><a href="#" onclick="showView('auth')">Sign in</a> to comment.</p>`;

  let listHtml = '';
  comments.forEach(c => {
    const canDel = currentUser && c.author?._id === currentUser._id;
    listHtml += `
      <div class="comment-item">
        <div class="post-avatar" style="width:30px;height:30px;font-size:.7rem">${initial(c.author?.username)}</div>
        <div class="comment-body">
          <div class="comment-author">${esc(c.author?.username || 'Unknown')}</div>
          <div class="comment-text">${esc(c.text)}</div>
          <div class="comment-time">${timeAgo(c.createdAt)}</div>
        </div>
        ${canDel ? `<button class="comment-del" onclick="deleteComment('${c._id}','${postId}')" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>` : ''}
      </div>`;
  });

  section.innerHTML = `
    <h3>Comments (${comments.length})</h3>
    ${formHtml}
    <div class="comment-list">${listHtml || '<p style="font-size:.85rem;color:var(--t3)">No comments yet.</p>'}</div>`;
}

async function addComment(e, postId) {
  e.preventDefault();
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text) return;
  try {
    await api(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
    input.value = '';
    toast('Comment added!');
    openPost(postId);
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteComment(commentId, postId) {
  try {
    await api(`/api/comments/${commentId}`, { method: 'DELETE' });
    toast('Comment deleted');
    openPost(postId);
  } catch (err) { toast(err.message, 'error'); }
}

// ============ Init ============
(async () => {
  await loadUser();
  updateNav();
  showView('feed');
})();
