'use strict';
const state = { events: [], source: null, retryTimer: null, retryMs: 2000 };
const $ = (id) => document.getElementById(id);

function filters() {
  return { entity: $('entity').value, action: $('action').value, user: $('user').value.trim() };
}
function params(extra = {}) {
  const search = new URLSearchParams({ ...filters(), ...extra });
  for (const [key, value] of [...search]) if (!value) search.delete(key);
  return search.toString();
}
function setStatus(mode, label) {
  const el = $('connection'); el.className = `status status--${mode}`; el.lastChild.textContent = ` ${label}`;
}
function formatDate(value) { return new Intl.DateTimeFormat('es-EC', { dateStyle:'short', timeStyle:'medium' }).format(new Date(value)); }

function render() {
  const body = $('events'); body.replaceChildren();
  $('count').textContent = `${state.events.length} evento${state.events.length === 1 ? '' : 's'}`;
  if (!state.events.length) {
    const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 5; cell.className = 'empty'; cell.textContent = 'No hay eventos para estos filtros.'; return;
  }
  for (const event of state.events) {
    const row = body.insertRow();
    row.insertCell().textContent = formatDate(event.timestamp);
    const entity = row.insertCell(); const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = event.entity; entity.append(badge);
    row.insertCell().textContent = event.action;
    row.insertCell().textContent = event.userEmail || event.userId || 'Sistema';
    const action = row.insertCell(); const button = document.createElement('button'); button.className = 'view'; button.textContent = 'Ver JSON'; button.onclick = () => showDetail(event); action.append(button);
  }
}
function showDetail(event) {
  $('detail-title').textContent = `${event.entity} · ${event.action}`;
  const meta = $('meta'); meta.replaceChildren();
  for (const [label, value] of [['ID',event.id],['Fecha',formatDate(event.timestamp)],['Usuario',event.userEmail || event.userId || 'Sistema']]) {
    const dt=document.createElement('dt'), dd=document.createElement('dd'); dt.textContent=label; dd.textContent=value; meta.append(dt,dd);
  }
  $('json').textContent = JSON.stringify(event.data, null, 2); $('detail').showModal();
}
async function loadRecent() {
  const response = await fetch(`/api/audit?${params({ pageSize:'50' })}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json(); state.events = data.items; render();
}
function connect() {
  clearTimeout(state.retryTimer); state.source?.close(); setStatus('connecting','Conectando');
  const source = new EventSource(`/api/audit/events?${params()}`); state.source = source;
  source.addEventListener('connected', () => { state.retryMs = 2000; setStatus('online','En vivo'); });
  source.addEventListener('audit', ({ data }) => {
    const event = JSON.parse(data); state.events = [event, ...state.events.filter((item) => item.id !== event.id)].slice(0, 100); render();
  });
  source.onerror = () => {
    source.close(); setStatus('offline',`Reconectando en ${Math.round(state.retryMs / 1000)} s`);
    state.retryTimer = setTimeout(connect, state.retryMs); state.retryMs = Math.min(30000, state.retryMs * 2);
  };
}
async function apply() {
  try { await loadRecent(); connect(); } catch (error) { setStatus('offline','API no disponible'); console.error(error); }
}
$('apply').addEventListener('click', apply);
$('user').addEventListener('keydown', (event) => { if (event.key === 'Enter') apply(); });
$('close').addEventListener('click', () => $('detail').close());
$('detail').addEventListener('click', (event) => { if (event.target === $('detail')) $('detail').close(); });
apply();
