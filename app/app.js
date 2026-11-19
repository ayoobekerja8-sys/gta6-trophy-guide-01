const STORAGE_KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoilers';
const GRADE_TOTALS = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const KIND_LABELS = { story: 'Story', activity: 'Activity', collectible: 'Collectible', robbery: 'Robbery', combat: 'Combat', exploration: 'Exploration', misc: 'Miscellaneous' };
const ui = {
  list: document.querySelector('#trophy-list'), roadmap: document.querySelector('#roadmap-cards'),
  progress: document.querySelector('#progress-label'), fill: document.querySelector('#progress-fill'),
  percent: document.querySelector('#overall-percent'), gradeCounts: document.querySelector('#grade-counts'),
  visibleCount: document.querySelector('#visible-count'), empty: document.querySelector('#empty-state'),
  search: document.querySelector('#search'), grade: document.querySelector('#grade-filter'),
  kind: document.querySelector('#kind-filter'), earned: document.querySelector('#earned-filter'),
  spoilers: document.querySelector('#spoiler-toggle'), importFile: document.querySelector('#import-file')
};
let trophyData;
let roadmapData;
let earnedIds = readSavedProgress();

function readSavedProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(stored) ? stored.map(Number).filter(Number.isInteger) : []);
  } catch {
    return new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earnedIds].sort((a, b) => a - b)));
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderGradeCounts() {
  ui.gradeCounts.innerHTML = Object.entries(GRADE_TOTALS).map(([grade, total]) =>
    `<span class="grade-count"><i class="grade-dot grade-${grade}" aria-hidden="true"></i><b>${total}</b> ${grade[0].toUpperCase() + grade.slice(1)}</span>`
  ).join('');
}

function renderRoadmap() {
  ui.roadmap.innerHTML = roadmapData.stages.map(stage => `
    <article class="roadmap-card">
      <h3>${escapeText(stage.title)}</h3>
      <p>${escapeText(stage.summary)}</p>
      <p class="stage-trophies">${stage.trophyIds.map(id => trophyData.trophies.find(trophy => trophy.id === id)?.name).filter(Boolean).map(escapeText).join(" · ")}</p><span class="stage-count">${stage.trophyIds.length} listed trophies</span>
    </article>`).join('');
}

function getVisibleTrophyName(trophy) {
  return ui.spoilers.checked && trophy.hidden && !earnedIds.has(trophy.id)
    ? 'Hidden trophy — story spoiler'
    : trophy.name;
}

function isTrophyVisible(trophy, query) {
  const spoilerHidden = ui.spoilers.checked && trophy.hidden && !earnedIds.has(trophy.id);
  const name = spoilerHidden ? 'hidden trophy story spoiler' : trophy.name;
  const searchable = (spoilerHidden ? `${name} ${trophy.kind} ${trophy.grade}` : `${name} ${trophy.description} ${trophy.guide} ${trophy.kind} ${trophy.grade}`).toLowerCase();
  if (query && !searchable.includes(query)) return false;
  if (ui.grade.value !== 'all' && trophy.grade !== ui.grade.value) return false;
  if (ui.kind.value === 'missable' && !trophy.missable) return false;
  if (ui.kind.value !== 'all' && ui.kind.value !== 'missable' && trophy.kind !== ui.kind.value) return false;
  if (ui.earned.value === 'earned' && !earnedIds.has(trophy.id)) return false;
  if (ui.earned.value === 'not-earned' && earnedIds.has(trophy.id)) return false;
  return true;
}

function createTrophyCard(trophy) {
  const earned = earnedIds.has(trophy.id);
  const spoilerHidden = ui.spoilers.checked && trophy.hidden && !earned;
  const card = document.createElement('article');
  card.className = `trophy-card grade-${trophy.grade}${earned ? ' is-earned' : ''}`;
  card.id = `trophy-${trophy.id}`;
  card.dataset.trophyId = trophy.id;
  const tags = [
    `<span class="tag">${escapeText(KIND_LABELS[trophy.kind] || 'Miscellaneous')}</span>`,
    trophy.missable ? '<span class="tag missable">Missable</span>' : '',
    trophy.hidden && trophy.kind !== 'story' ? '<span class="tag">Story</span>' : ''
  ].join('');
  const guideContent = spoilerHidden
    ? '<h4>Story guide concealed</h4><p>Earn this trophy or turn off spoiler hiding to reveal the guide and its sources.</p>'
    : `<h4>How to get it</h4><p>${escapeText(trophy.guide)}</p><h4 style="margin-top:9px">Sources</h4><div class="source-list">${trophy.sources.map(source => `<a href="${escapeText(source.url)}" target="_blank" rel="noreferrer">${escapeText(source.name)} ↗</a>`).join('')}</div>`;
  card.innerHTML = `
    <div class="card-top" role="button" tabindex="0" aria-expanded="false" aria-controls="guide-${trophy.id}">
      <span class="grade-badge">${escapeText(trophy.grade)}</span>
      <div class="card-copy"><h3>${escapeText(getVisibleTrophyName(trophy))}</h3>
      <p>${spoilerHidden ? 'Earn this story trophy to reveal its description.' : escapeText(trophy.description)}</p>
      <div class="card-tags">${tags}</div></div>
      <label class="earned-check" title="Mark earned"><input type="checkbox" aria-label="Mark ${escapeText(trophy.name)} earned" ${earned ? 'checked' : ''}></label>
      <span class="expand-cue" aria-hidden="true">⌄</span>
    </div>
    <div class="guide-panel" id="guide-${trophy.id}">${guideContent}</div>`;
  const top = card.querySelector('.card-top');
  const checkbox = card.querySelector('input[type="checkbox"]');
  const toggle = () => {
    const opened = card.classList.toggle('is-open');
    top.setAttribute('aria-expanded', String(opened));
  };
  top.addEventListener('click', event => {
    if (event.target.closest('.earned-check')) return;
    toggle();
  });
  top.addEventListener('keydown', event => {
    if (event.target === top && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggle();
    }
  });
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) earnedIds.add(trophy.id);
    else earnedIds.delete(trophy.id);
    saveProgress();
    renderTrophies();
  });
  return card;
}

function renderTrophies() {
  const query = ui.search.value.trim().toLowerCase();
  const visible = trophyData.trophies.filter(trophy => isTrophyVisible(trophy, query));
  ui.list.replaceChildren(...visible.map(createTrophyCard));
  ui.visibleCount.textContent = visible.length;
  ui.empty.hidden = visible.length !== 0;
  updateProgress();
}

function updateProgress() {
  const earnedCount = earnedIds.size;
  const percent = Math.round(earnedCount / trophyData.trophies.length * 100);
  ui.progress.textContent = `${earnedCount} of ${trophyData.trophies.length} earned`;
  ui.fill.style.width = `${percent}%`;
  ui.percent.textContent = `${percent}%`;
}

function setSpoilerPreference(enabled) {
  ui.spoilers.checked = enabled;
  localStorage.setItem(SPOILER_KEY, String(enabled));
}

function exportProgress() {
  const payload = { game: trophyData.game, format: 'leonida-trophy-atlas/v1', earnedIds: [...earnedIds].sort((a, b) => a - b) };
  const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'leonida-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(blobUrl);
}

function parseImportedProgress(value) {
  const values = Array.isArray(value) ? value : value?.earnedIds ?? value?.earned ?? [];
  if (!Array.isArray(values)) throw new Error('Progress file must contain an earnedIds list.');
  const knownIds = new Set(trophyData.trophies.map(trophy => trophy.id));
  return new Set(values.map(item => typeof item === 'number' ? item : trophyData.trophies.find(trophy => trophy.name === item)?.id)
    .filter(id => knownIds.has(id)));
}

async function importProgress(file) {
  try {
    earnedIds = parseImportedProgress(JSON.parse(await file.text()));
    saveProgress();
    renderTrophies();
  } catch {
    window.alert('That file could not be read as a trophy progress export.');
  } finally {
    ui.importFile.value = '';
  }
}

function applyHashState() {
  const hash = location.hash;
  document.body.classList.toggle('cover-capture', hash === '#cover' || hash === '#demo-earned');
  document.body.classList.toggle('guide-capture', hash === '#trophy-28');
  document.body.classList.toggle('roadmap-capture', hash === '#roadmap');
  document.body.classList.toggle('filter-capture', hash.includes('='));
  if (hash === '#demo-earned') {
    earnedIds = new Set([2, 3, 14, 28, 31, 40]);
    renderTrophies();
    return;
  }
  if (hash === '#spoilers-on') {
    setSpoilerPreference(true);
    renderTrophies();
    setTimeout(() => document.querySelector('#tracker').scrollIntoView(), 250);
    return;
  }
  if (hash === '#roadmap') {
    renderTrophies();
    return;
  }
  const match = hash.match(/^#trophy-(\d+)$/);
  if (match) {
    const trophyId = Number(match[1]);
    if (trophyId === 28) {
      ui.search.value = '';
      ui.grade.value = 'all'; ui.kind.value = 'all'; ui.earned.value = 'all';
    }
    renderTrophies();
    setTimeout(() => {
      const card = document.querySelector(`#trophy-${trophyId}`);
      if (card) {
        card.classList.add('is-open');
        card.querySelector('.card-top').setAttribute('aria-expanded', 'true');
      }
    }, 300);
    return;
  }
  if (hash.includes('=')) {
    ui.search.value = '';
    ui.grade.value = 'all'; ui.kind.value = 'all'; ui.earned.value = 'all';
    const params = new URLSearchParams(hash.slice(1));
    if (['platinum','gold','silver','bronze','all'].includes(params.get('grade'))) ui.grade.value = params.get('grade');
    if (['story','activity','collectible','robbery','combat','exploration','missable','all'].includes(params.get('kind'))) ui.kind.value = params.get('kind');
    if (['earned','not-earned','all'].includes(params.get('status'))) ui.earned.value = params.get('status');
    if (params.get('spoilers') === 'on' || params.get('spoilers') === 'off') setSpoilerPreference(params.get('spoilers') === 'on');
  }
  renderTrophies();
}

function connectControls() {
  for (const element of [ui.search, ui.grade, ui.kind, ui.earned]) element.addEventListener('input', renderTrophies);
  ui.spoilers.addEventListener('change', () => {
    setSpoilerPreference(ui.spoilers.checked);
    renderTrophies();
  });
  document.querySelector('#export-button').addEventListener('click', exportProgress);
  ui.importFile.addEventListener('change', () => {
    if (ui.importFile.files[0]) importProgress(ui.importFile.files[0]);
  });
  document.querySelector('#reset-button').addEventListener('click', () => {
    if (!window.confirm('Clear all saved trophy progress?')) return;
    earnedIds = new Set(); saveProgress(); renderTrophies();
  });
  window.addEventListener('hashchange', applyHashState);
}

async function startAtlas() {
  const [trophiesResponse, roadmapResponse] = await Promise.all([fetch('data/trophies.json'), fetch('data/roadmap.json')]);
  [trophyData, roadmapData] = await Promise.all([trophiesResponse.json(), roadmapResponse.json()]);
  if (location.hash !== '#demo-earned') ui.spoilers.checked = localStorage.getItem(SPOILER_KEY) === 'true';
  renderGradeCounts();
  renderRoadmap();
  connectControls();
  renderTrophies();
  applyHashState();
}

startAtlas();
