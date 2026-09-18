// ============ API Helper ============
const API = '/api/todos';

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ============ State ============
let todos = [];
let currentFilter = 'all';

// ============ DOM Refs ============
const form = document.getElementById('add-form');
const input = document.getElementById('todo-input');
const listEl = document.getElementById('todo-list');
const emptyEl = document.getElementById('empty-state');
const loadingEl = document.getElementById('loading');
const toastBox = document.getElementById('toast-container');

// ============ Toast ============
function showToast(message, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  toastBox.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// ============ Stats ============
function updateStats() {
  const total = todos.length;
  const done = todos.filter(t => t.completed).length;
  document.querySelector('#stat-total .stat-count').textContent = total;
  document.querySelector('#stat-active .stat-count').textContent = total - done;
  document.querySelector('#stat-completed .stat-count').textContent = done;
}

// ============ Render ============
function getFiltered() {
  if (currentFilter === 'active') return todos.filter(t => !t.completed);
  if (currentFilter === 'completed') return todos.filter(t => t.completed);
  return todos;
}

function renderTodos() {
  const filtered = getFiltered();
  listEl.innerHTML = '';

  if (todos.length === 0) {
    emptyEl.style.display = 'flex';
    emptyEl.querySelector('p').textContent = 'No todos yet. Add one above!';
  } else if (filtered.length === 0) {
    emptyEl.style.display = 'flex';
    emptyEl.querySelector('p').textContent = `No ${currentFilter} todos.`;
  } else {
    emptyEl.style.display = 'none';
  }

  filtered.forEach(todo => {
    listEl.appendChild(createTodoEl(todo));
  });

  updateStats();
}

function createTodoEl(todo) {
  const item = document.createElement('div');
  item.className = `todo-item${todo.completed ? ' completed' : ''}`;
  item.dataset.id = todo._id;

  item.innerHTML = `
    <label class="checkbox-wrapper">
      <input type="checkbox" ${todo.completed ? 'checked' : ''} />
      <span class="checkmark">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </span>
    </label>
    <span class="todo-title">${escapeHtml(todo.title)}</span>
    <div class="todo-actions">
      <button class="btn-icon edit" title="Edit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="btn-icon delete" title="Delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `;

  // Toggle complete
  item.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleComplete(todo));

  // Edit
  item.querySelector('.btn-icon.edit').addEventListener('click', () => startEdit(item, todo));

  // Delete
  item.querySelector('.btn-icon.delete').addEventListener('click', () => deleteTodo(item, todo));

  return item;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ============ CRUD Operations ============

// CREATE
async function addTodo(title) {
  try {
    const todo = await api(API, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    todos.unshift(todo);
    renderTodos();
    showToast('Todo added!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// READ
async function fetchTodos() {
  try {
    loadingEl.style.display = 'flex';
    emptyEl.style.display = 'none';
    todos = await api(API);
    loadingEl.style.display = 'none';
    renderTodos();
  } catch (err) {
    loadingEl.style.display = 'none';
    showToast('Failed to load todos', 'error');
  }
}

// UPDATE - toggle
async function toggleComplete(todo) {
  try {
    const updated = await api(`${API}/${todo._id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: !todo.completed }),
    });
    const idx = todos.findIndex(t => t._id === todo._id);
    if (idx !== -1) todos[idx] = updated;
    renderTodos();
    showToast(updated.completed ? 'Marked complete!' : 'Marked active!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// UPDATE - edit title
function startEdit(item, todo) {
  const titleEl = item.querySelector('.todo-title');
  const actionsEl = item.querySelector('.todo-actions');

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'todo-edit-input';
  editInput.value = todo.title;
  editInput.maxLength = 200;

  titleEl.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  actionsEl.innerHTML = `
    <button class="btn-icon save" title="Save">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
    <button class="btn-icon cancel" title="Cancel">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  const save = async () => {
    const newTitle = editInput.value.trim();
    if (!newTitle) { showToast('Title cannot be empty', 'error'); return; }
    if (newTitle === todo.title) { renderTodos(); return; }
    try {
      const updated = await api(`${API}/${todo._id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle }),
      });
      const idx = todos.findIndex(t => t._id === todo._id);
      if (idx !== -1) todos[idx] = updated;
      renderTodos();
      showToast('Todo updated!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  actionsEl.querySelector('.save').addEventListener('click', save);
  actionsEl.querySelector('.cancel').addEventListener('click', () => renderTodos());
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') renderTodos();
  });
}

// DELETE
async function deleteTodo(item, todo) {
  try {
    item.classList.add('removing');
    await new Promise(r => setTimeout(r, 300));
    await api(`${API}/${todo._id}`, { method: 'DELETE' });
    todos = todos.filter(t => t._id !== todo._id);
    renderTodos();
    showToast('Todo deleted!');
  } catch (err) {
    showToast(err.message, 'error');
    renderTodos();
  }
}

// ============ Event Listeners ============

// Add form submit
form.addEventListener('submit', e => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  addTodo(title);
  input.value = '';
  input.focus();
});

// Filter tabs
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.filter-btn.active').classList.remove('active');
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// ============ Init ============
fetchTodos();
