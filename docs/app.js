let data = null;
let selectedSection = localStorage.getItem('routine-section') || '';
let currentView = 'today';
let deferredInstallPrompt = null;

const $ = (id) => document.getElementById(id);

const dayNames = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const dayOrder = ['SATURDAY','SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];

function todayName() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Dhaka' }).format(new Date()).toUpperCase();
}

function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')} ${suffix}`;
}

function classesFor(day, section = selectedSection) {
  return data.events
    .filter(e => e.day === day && e.section === section)
    .sort((a,b) => a.start.localeCompare(b.start));
}

function classCard(e) {
  return `<article class="class-card">
    <div class="time">${formatTime(e.start)}<br><span class="muted">to ${formatTime(e.end)}</span></div>
    <div>
      <div class="course">${escapeHtml(e.course)}</div>
      <div class="details">Teacher: ${escapeHtml(e.teacher || '—')}<br>Section: ${escapeHtml(e.section)}</div>
    </div>
    <div class="room">${escapeHtml(e.room)}</div>
  </article>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function renderToday() {
  const day = todayName();
  const classes = classesFor(day);
  const date = new Intl.DateTimeFormat('en-US', { day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Dhaka' }).format(new Date());
  $('todayTitle').textContent = `${day.charAt(0)}${day.slice(1).toLowerCase()} · ${date}`;

  $('todayView').innerHTML = classes.length
    ? `<div class="schedule">${classes.map(classCard).join('')}</div>`
    : `<div class="empty">No classes for <strong>${escapeHtml(selectedSection)}</strong> today. Enjoy your free time.</div>`;

  const now = new Date();
  const currentMinutes = Number(new Intl.DateTimeFormat('en-US', {hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Asia/Dhaka'}).format(now).replace(':','.'));
  const next = classes.find(e => Number(e.start.replace(':','.')) > currentMinutes);
  $('nextClass').innerHTML = next
    ? `<span>Next class</span><strong>${escapeHtml(next.course)}</strong>${formatTime(next.start)} · ${escapeHtml(next.room)}`
    : `<span>No more classes today</span><strong>You're done 🎉</strong>`;
}

function renderWeek() {
  $('weekView').innerHTML = `<div class="week-grid">${dayOrder.map(day => {
    const classes = classesFor(day);
    return `<article class="week-day"><h3>${day.charAt(0)}${day.slice(1).toLowerCase()}</h3>${classes.length ? classes.map(e => `<div class="mini"><div class="mini-time">${formatTime(e.start)}–${formatTime(e.end)}</div><div class="mini-course">${escapeHtml(e.course)}</div><div class="mini-room">${escapeHtml(e.room)}</div></div>`).join('') : '<div class="muted">No classes</div>'}</article>`;
  }).join('')}</div>`;
}

function render() {
  $('sectionSelect').value = selectedSection;
  renderToday();
  renderWeek();
}

function setupSections() {
  const select = $('sectionSelect');
  select.innerHTML = data.sections.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  if (!data.sections.includes(selectedSection)) selectedSection = data.sections[0] || '';
  select.value = selectedSection;
  select.addEventListener('change', () => {
    selectedSection = select.value;
    localStorage.setItem('routine-section', selectedSection);
    render();
  });
}

async function load() {
  try {
    const response = await fetch(`./data.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Routine data could not be loaded.');
    data = await response.json();
    setupSections();
    $('meta').textContent = `${data.metadata.version ? 'Version ' + data.metadata.version + ' · ' : ''}${data.metadata.effective_from || ''}`;
    $('footerMeta').textContent = data.metadata.effective_from ? `Updated: ${data.metadata.effective_from}` : 'Routine';
    render();
  } catch (error) {
    $('meta').innerHTML = `<span class="error">${escapeHtml(error.message)}</span>`;
  }
}

document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => {
  currentView = button.dataset.view;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === button));
  $('todayView').classList.toggle('hidden', currentView !== 'today');
  $('weekView').classList.toggle('hidden', currentView !== 'week');
}));

$('todayBtn').addEventListener('click', () => {
  currentView = 'today';
  document.querySelector('[data-view="today"]').click();
  window.scrollTo({top: document.querySelector('.tabs').offsetTop - 10, behavior:'smooth'});
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $('installBtn').classList.remove('hidden');
});

$('installBtn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $('installBtn').classList.add('hidden');
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
load();
