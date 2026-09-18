let token = localStorage.getItem('social_token'), me = null, regMode = false, selFile = null;
const $ = id => document.getElementById(id);

async function api(url, o = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  if (o.body instanceof FormData) { delete h['Content-Type']; }
  const r = await fetch(url, { headers: h, ...o });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Failed');
  return d;
}

function toast(m, t = 'ok') {
  const e = document.createElement('div'); e.className = 'toast ' + t; e.textContent = m;
  $('toast-box').appendChild(e);
  setTimeout(() => { e.classList.add('out'); setTimeout(() => e.remove(), 300); }, 2500);
}

function ago(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd';
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function ini(n) { return n ? n.charAt(0).toUpperCase() : '?'; }

function showV(n) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  const el = $('v-' + n); if (el) el.style.display = 'block';
  if (n === 'feed') loadFeed();
}

function updateNav() {
  const a = $('nav-area');
  if (me) {
    a.innerHTML = `<div class="nav-u"><div class="av av-sm">${ini(me.username)}</div><span>${esc(me.username)}</span><button class="btn-lo" onclick="logout()">Logout</button></div>`;
    $('create-box').style.display = 'block';
    $('create-av').textContent = ini(me.username);
  } else {
    a.innerHTML = `<a href="#" style="font-size:.88rem;font-weight:600" onclick="showV('auth')">Sign In</a>`;
    $('create-box').style.display = 'none';
  }
}

// AUTH
$('a-sw-l').onclick = e => {
  e.preventDefault(); regMode = !regMode;
  $('fg-user').style.display = regMode ? 'block' : 'none';
  $('a-title').textContent = regMode ? 'Create Account' : 'Sign In';
  $('a-sub').textContent = regMode ? 'Join the community!' : 'Welcome back!';
  $('a-btn').textContent = regMode ? 'Sign Up' : 'Sign In';
  $('a-sw-t').textContent = regMode ? 'Have an account?' : 'No account?';
  $('a-sw-l').textContent = regMode ? 'Sign In' : 'Sign Up';
};

$('a-form').onsubmit = async e => {
  e.preventDefault();
  const email = $('a-email').value.trim(), pass = $('a-pass').value, user = $('a-user').value.trim();
  if (!email || !pass) return toast('Fill all fields', 'err');
  if (regMode && !user) return toast('Username required', 'err');
  try {
    const ep = regMode ? '/api/auth/register' : '/api/auth/login';
    const body = regMode ? { username: user, email, password: pass } : { email, password: pass };
    const d = await api(ep, { method: 'POST', body: JSON.stringify(body) });
    token = d.token; me = d.user; localStorage.setItem('social_token', token);
    updateNav(); showV('feed'); toast(regMode ? 'Registered!' : 'Welcome!');
  } catch (err) { toast(err.message, 'err'); }
};

function logout() {
  token = null; me = null; localStorage.removeItem('social_token');
  updateNav(); showV('feed'); toast('Logged out');
}

async function loadMe() {
  if (!token) return;
  try { me = await api('/api/auth/me'); updateNav(); } catch { token = null; localStorage.removeItem('social_token'); }
}

// IMAGE
$('img-input').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  selFile = f;
  const reader = new FileReader();
  reader.onload = ev => { $('img-prev-el').src = ev.target.result; $('img-preview').style.display = 'block'; };
  reader.readAsDataURL(f);
};
function removeImage() { selFile = null; $('img-input').value = ''; $('img-preview').style.display = 'none'; }

// CREATE POST
async function createPost() {
  const content = $('create-input').value.trim();
  if (!content) return toast('Write something!', 'err');
  try {
    const fd = new FormData();
    fd.append('content', content);
    if (selFile) fd.append('image', selFile);
    const h = {}; if (token) h['Authorization'] = 'Bearer ' + token;
    const r = await fetch('/api/social/posts', { method: 'POST', headers: h, body: fd });
    const d = await r.json(); if (!r.ok) throw new Error(d.error);
    $('create-input').value = ''; removeImage(); toast('Posted!'); loadFeed();
  } catch (err) { toast(err.message, 'err'); }
}

// FEED
async function loadFeed() {
  const list = $('feed-list'), load = $('feed-load'), empty = $('feed-empty');
  load.style.display = 'flex'; list.innerHTML = ''; empty.style.display = 'none';
  try {
    const posts = await api('/api/social/posts');
    load.style.display = 'none';
    if (!posts.length) { empty.style.display = 'block'; return; }
    posts.forEach(p => list.appendChild(makeCard(p)));
  } catch { load.style.display = 'none'; toast('Failed to load', 'err'); }
}

function makeCard(p) {
  const d = document.createElement('div'); d.className = 'post-card';
  const liked = me && p.likes.includes(me._id || me.id);
  d.innerHTML = `
    <div class="pc-head"><div class="av">${ini(p.author?.username)}</div>
    <div class="pc-meta"><strong>${esc(p.author?.username || '?')}</strong> · ${ago(p.createdAt)}</div></div>
    <div class="pc-body">${esc(p.content)}</div>
    ${p.image ? `<img class="pc-img" src="${p.image}" alt="post"/>` : ''}
    <div class="pc-actions">
      <button class="act-btn ${liked ? 'liked' : ''}" onclick="likePost('${p._id}',this)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span>${p.likes.length}</span>
      </button>
      <button class="act-btn" onclick="openPost('${p._id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>${p.commentCount || 0}</span>
      </button>
      ${me && (me._id || me.id) === p.author?._id ? `<button class="act-btn" onclick="delPost('${p._id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
    </div>`;
  return d;
}

async function likePost(id, btn) {
  if (!me) return toast('Sign in to like', 'err');
  try {
    const d = await api(`/api/social/posts/${id}/like`, { method: 'POST', body: '{}' });
    btn.classList.toggle('liked', d.liked);
    btn.querySelector('span').textContent = d.likes.length;
    if (d.liked) { btn.querySelector('svg').classList.add('heart-pop'); setTimeout(() => btn.querySelector('svg').classList.remove('heart-pop'), 400); }
  } catch (err) { toast(err.message, 'err'); }
}

async function delPost(id) {
  if (!confirm('Delete this post?')) return;
  try { await api(`/api/social/posts/${id}`, { method: 'DELETE' }); toast('Deleted'); loadFeed(); }
  catch (err) { toast(err.message, 'err'); }
}

// POST DETAIL
async function openPost(id) {
  showV('post');
  const det = $('post-detail'), cm = $('post-comments');
  det.innerHTML = '<div class="load"><div class="spinner"></div></div>';
  try {
    const p = await api(`/api/social/posts/${id}`);
    const liked = me && p.likes.includes(me._id || me.id);
    const own = me && (me._id || me.id) === p.author?._id;
    det.innerHTML = `<div class="pd">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="av">${ini(p.author?.username)}</div>
        <div><div style="font-weight:600;font-size:.92rem">${esc(p.author?.username||'?')}</div><div style="font-size:.78rem;color:var(--t3)">${ago(p.createdAt)}</div></div>
      </div>
      <div class="pd-body">${esc(p.content)}</div>
      ${p.image ? `<img class="pd-img" src="${p.image}" alt="post"/>` : ''}
      <div class="pd-acts">
        <button class="act-btn ${liked?'liked':''}" onclick="likePost('${p._id}',this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span>${p.likes.length}</span></button>
        ${own?`<button class="btn btn-d" onclick="delPost('${p._id}');showV('feed')">Delete</button>`:''}
      </div>
    </div>`;
    // Comments
    const cForm = me ? `<form class="cm-form" onsubmit="addCm(event,'${p._id}')"><input id="cm-in" placeholder="Write a comment..." maxlength="500"/><button type="submit" class="btn btn-p btn-sm">Post</button></form>` :
      `<p style="font-size:.82rem;color:var(--t3);margin-bottom:12px"><a href="#" onclick="showV('auth')">Sign in</a> to comment.</p>`;
    let cList = '';
    (p.comments||[]).forEach(c => {
      const canDel = me && (me._id||me.id) === c.author?._id;
      cList += `<div class="cm-item"><div class="av av-sm">${ini(c.author?.username)}</div><div class="cm-body"><div class="cm-author">${esc(c.author?.username||'?')}</div><div class="cm-text">${esc(c.text)}</div><div class="cm-time">${ago(c.createdAt)}</div></div>${canDel?`<button class="cm-del" onclick="delCm('${c._id}','${p._id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`:''}</div>`;
    });
    cm.innerHTML = `<div class="cm-sec"><h3>Comments (${(p.comments||[]).length})</h3>${cForm}<div>${cList||'<p style="font-size:.82rem;color:var(--t3)">No comments yet.</p>'}</div></div>`;
  } catch { det.innerHTML = '<p style="color:var(--t3)">Failed to load.</p>'; }
}

async function addCm(e, pid) {
  e.preventDefault(); const inp = $('cm-in'), t = inp.value.trim(); if (!t) return;
  try { await api(`/api/social/posts/${pid}/comments`, { method: 'POST', body: JSON.stringify({ text: t }) }); inp.value = ''; toast('Commented!'); openPost(pid); }
  catch (err) { toast(err.message, 'err'); }
}

async function delCm(cid, pid) {
  try { await api(`/api/social/comments/${cid}`, { method: 'DELETE' }); toast('Deleted'); openPost(pid); }
  catch (err) { toast(err.message, 'err'); }
}

// INIT
(async () => { await loadMe(); updateNav(); showV('feed'); })();
