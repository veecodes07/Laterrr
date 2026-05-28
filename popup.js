const CAT_EMOJI = {
  shop:  '🛍',
  watch: '▶️',
  game:  '🎮',
  task:  '✅',
  inspo: '✨',
  read:  '📖',
};

let items = [];
let currentFilter = 'all';
let selectedCat = 'shop';
let currentTab = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const toggleAddBtn  = document.getElementById('toggleAdd');
const addPanel      = document.getElementById('addPanel');
const pageTitle     = document.getElementById('pageTitle');
const pageUrl       = document.getElementById('pageUrl');
const noteInput     = document.getElementById('noteInput');
const deadlineRow   = document.getElementById('deadlineRow');
const deadlineInput = document.getElementById('deadlineInput');
const saveBtn       = document.getElementById('saveBtn');
const itemsList     = document.getElementById('itemsList');
const emptyState    = document.getElementById('emptyState');
const itemCountEl   = document.getElementById('itemCount');
const catBtns       = document.querySelectorAll('.cat-btn');
const filterChips   = document.querySelectorAll('.filter-chip');

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadItems();
  await loadCurrentTab();
  renderList();
});

async function loadItems() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['laterr_items'], res => {
      items = res.laterr_items || [];
      resolve();
    });
  });
}

async function saveItems() {
  return new Promise(resolve => {
    chrome.storage.sync.set({ laterr_items: items }, resolve);
  });
}

async function loadCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs && tabs[0]) {
        currentTab = tabs[0];
        const title = tabs[0].title || 'Untitled page';
        const url   = tabs[0].url   || '';
        pageTitle.textContent = title;
        pageUrl.textContent   = shortUrl(url);
      }
      resolve();
    });
  });
}

// ── Toggle add panel ──────────────────────────────────────────────────────────
toggleAddBtn.addEventListener('click', () => {
  const open = addPanel.style.display !== 'none';
  addPanel.style.display = open ? 'none' : 'flex';
  toggleAddBtn.innerHTML = open
    ? svgPlus()
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  if (!open) noteInput.focus();
});

function svgPlus() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
}

// ── Category selection ────────────────────────────────────────────────────────
catBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    catBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCat = btn.dataset.cat;
    // Show deadline row only for tasks
    deadlineRow.style.display = selectedCat === 'task' ? 'flex' : 'none';
  });
});

// ── Save ──────────────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  if (!currentTab) return;

  const item = {
    id:       Date.now(),
    title:    currentTab.title || 'Untitled',
    url:      currentTab.url   || '',
    cat:      selectedCat,
    note:     noteInput.value.trim(),
    deadline: selectedCat === 'task' ? deadlineInput.value : '',
    savedAt:  Date.now(),
  };

  items.unshift(item);
  await saveItems();

  // Reset
  noteInput.value   = '';
  deadlineInput.value = '';
  addPanel.style.display = 'none';
  toggleAddBtn.innerHTML = svgPlus();

  renderList();

  // Briefly flash the button green
  saveBtn.textContent = 'Saved 🌱';
  saveBtn.style.background = '#6baa5e';
  setTimeout(() => {
    saveBtn.textContent = 'Save for later 🌱';
    saveBtn.style.background = '';
  }, 1200);
});

// ── Filters ───────────────────────────────────────────────────────────────────
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    renderList();
  });
});

// ── Render ────────────────────────────────────────────────────────────────────
function renderList() {
  const filtered = currentFilter === 'all'
    ? items
    : items.filter(i => i.cat === currentFilter);

  // Update count
  itemCountEl.textContent = `${items.length} saved`;

  // Clear
  while (itemsList.firstChild) itemsList.removeChild(itemsList.firstChild);

  if (filtered.length === 0) {
    itemsList.appendChild(emptyState);
    emptyState.style.display = '';
    return;
  }

  filtered.forEach(item => {
    const card = buildCard(item);
    itemsList.appendChild(card);
  });
}

function buildCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card' + (isUrgent(item) ? ' urgent' : '');
  card.dataset.cat = item.cat;

  const emoji = document.createElement('div');
  emoji.className = 'item-emoji';
  emoji.textContent = CAT_EMOJI[item.cat] || '🔖';

  const body = document.createElement('div');
  body.className = 'item-body';

  const titleEl = document.createElement('div');
  titleEl.className = 'item-title';
  titleEl.textContent = item.title;

  body.appendChild(titleEl);

  if (item.note) {
    const noteEl = document.createElement('div');
    noteEl.className = 'item-note';
    noteEl.textContent = item.note;
    body.appendChild(noteEl);
  }

  const meta = document.createElement('div');
  meta.className = 'item-meta';

  const tag = document.createElement('span');
  tag.className = `item-tag tag-${item.cat}`;
  tag.textContent = item.cat.charAt(0).toUpperCase() + item.cat.slice(1);
  meta.appendChild(tag);

  if (item.deadline) {
    const pill = document.createElement('span');
    const daysLeft = getDaysLeft(item.deadline);
    pill.className = 'deadline-pill' + (daysLeft > 3 ? ' ok' : '');
    pill.textContent = daysLeft < 0
      ? '⚠ overdue'
      : daysLeft === 0
        ? '⚠ today'
        : `⏳ ${daysLeft}d left`;
    meta.appendChild(pill);
  }

  body.appendChild(meta);

  const urlEl = document.createElement('div');
  urlEl.className = 'item-url';
  urlEl.textContent = shortUrl(item.url);
  body.appendChild(urlEl);

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const openBtn = document.createElement('button');
  openBtn.className = 'action-btn open';
  openBtn.title = 'Open';
  openBtn.setAttribute('aria-label', 'Open link');
  openBtn.innerHTML = svgOpen();
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: item.url });
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'action-btn del';
  delBtn.title = 'Delete';
  delBtn.setAttribute('aria-label', 'Delete');
  delBtn.innerHTML = svgTrash();
  delBtn.addEventListener('click', async () => {
    card.style.opacity = '0';
    card.style.transform = 'translateX(12px)';
    card.style.transition = 'all 0.18s ease';
    setTimeout(async () => {
      items = items.filter(i => i.id !== item.id);
      await saveItems();
      renderList();
    }, 170);
  });

  actions.appendChild(openBtn);
  actions.appendChild(delBtn);

  card.appendChild(emoji);
  card.appendChild(body);
  card.appendChild(actions);

  return card;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getDaysLeft(dateStr) {
  const now   = new Date(); now.setHours(0,0,0,0);
  const due   = new Date(dateStr); due.setHours(0,0,0,0);
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

function isUrgent(item) {
  if (!item.deadline) return false;
  return getDaysLeft(item.deadline) <= 2;
}

function svgOpen() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
}

function svgTrash() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
}

// ── Export to CSV ─────────────────────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', () => {
  if (items.length === 0) return;

  const rows = [
    ['Title', 'URL', 'Category', 'Note', 'Deadline', 'Saved At']
  ];

  items.forEach(item => {
    rows.push([
      `"${(item.title  || '').replace(/"/g, '""')}"`,
      `"${(item.url    || '').replace(/"/g, '""')}"`,
      item.cat || '',
      `"${(item.note   || '').replace(/"/g, '""')}"`,
      item.deadline || '',
      item.savedAt ? new Date(item.savedAt).toLocaleDateString() : ''
    ]);
  });

  const csv     = rows.map(r => r.join(',')).join('\n');
  const blob    = new Blob([csv], { type: 'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = 'laterrr-export.csv';
  a.click();
  URL.revokeObjectURL(url);
});