// Front-end Eleições Digitais — integração corrigida com a API da Vercel.
const API_BASE = 'https://eleicoesdigitais-back.vercel.app/api';
let selectedCandidate = null;
const $ = (id) => document.getElementById(id);

function getVoterKey() {
  let key = localStorage.getItem('eleicao_g6_voter_key');
  if (!key) {
    key = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem('eleicao_g6_voter_key', key);
  }
  return key;
}
function showToast(message) {
  const toast = $('toast');
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Erro HTTP ${response.status}`);
  return payload;
}

async function loadCandidates() {
  const grid = $('candidateGrid');
  if (!grid) return;
  grid.innerHTML = '<p>Carregando candidaturas…</p>';
  try {
    const candidates = await api('/candidates');
    if (!Array.isArray(candidates) || !candidates.length) {
      grid.innerHTML = '<p>Nenhuma candidatura cadastrada na tabela candidates do Supabase.</p>';
      return;
    }
    grid.innerHTML = '';
    candidates.forEach((candidate, index) => {
      const article = document.createElement('article');
      article.className = 'candidate-card';
      const coverClass = ['','cover-blue','cover-orange'][index % 3];
      const number = candidate.number ?? candidate.id;
      article.innerHTML = `<div class="candidate-cover ${coverClass}"><span class="candidate-number">Nº ${escapeHtml(number)}</span><span class="candidate-emoji">🏆</span></div><div class="candidate-body"><span class="candidate-role">CHAPA ${escapeHtml(number)}</span><h3>${escapeHtml(candidate.name || 'Candidato')}</h3><p class="candidate-slogan">${escapeHtml(candidate.slogan || '')}</p><div class="candidate-proposals" data-proposals="${escapeHtml(candidate.id)}"></div><button class="button button-primary vote-button" type="button">Votar nesta chapa</button></div>`;
      article.querySelector('.vote-button').addEventListener('click', () => openVoteDialog(candidate));
      grid.appendChild(article);
      loadProposals(candidate.id, article.querySelector('.candidate-proposals'));
    });
    const counter = document.querySelector('.section-counter');
    if (counter) counter.textContent = `${candidates.length} CANDIDATURA${candidates.length === 1 ? '' : 'S'}`;
    setConnection(true, 'API conectada');
  } catch (error) {
    console.error('[API candidates]', error);
    grid.innerHTML = `<p>Não foi possível carregar candidaturas: ${escapeHtml(error.message)}. Verifique a API e as variáveis do Supabase.</p>`;
    setConnection(false, 'Falha na API');
  }
}
async function loadProposals(candidateId, target) {
  try {
    const proposals = await api(`/proposals?candidate_id=${encodeURIComponent(candidateId)}`);
    if (!proposals.length) return;
    const list = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = `Ver propostas (${proposals.length})`;
    const ul = document.createElement('ul');
    proposals.forEach(p => { const li = document.createElement('li'); li.textContent = `${p.title}: ${p.description}`; ul.appendChild(li); });
    list.append(summary, ul); target.appendChild(list);
  } catch (error) { console.warn('[API proposals]', error); }
}
function openVoteDialog(candidate) {
  selectedCandidate = candidate;
  const title = $('dialogTitle'); if (title) title.textContent = `Votar em ${candidate.name}?`;
  const text = $('dialogText'); if (text) text.textContent = 'Seu voto simulado será enviado ao backend e salvo no Supabase.';
  const dialog = $('voteDialog');
  if (dialog?.showModal) dialog.showModal();
  else if (confirm(`Confirma seu voto em ${candidate.name}?`)) submitVote();
}
async function submitVote() {
  if (!selectedCandidate) return;
  const button = $('confirmVote'); if (button) { button.disabled = true; button.textContent = 'Enviando…'; }
  try {
    const result = await api('/votes', { method: 'POST', body: JSON.stringify({ candidate_id: selectedCandidate.id, voter_key: getVoterKey() }) });
    $('voteDialog')?.close();
    showToast(result.message || 'Voto gravado no Supabase.');
    selectedCandidate = null;
    if ($('resultsList')) await loadResults();
  } catch (error) {
    console.error('[API vote]', error);
    showToast(`Não foi possível registrar o voto: ${error.message}`);
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Confirmar voto'; }
  }
}
async function loadResults() {
  const list = $('resultsList'); if (!list) return;
  list.innerHTML = '<p>Carregando apuração…</p>';
  try {
    const results = await api('/results');
    list.innerHTML = '';
    let total = 0;
    results.forEach(item => { total += Number(item.votes || 0); });
    if ($('totalVotes')) $('totalVotes').textContent = String(total);
    results.forEach(item => {
      const row = document.createElement('article'); row.className = 'result-row';
      const votes = Number(item.votes || 0); const pct = Number(item.percentage || 0);
      row.innerHTML = `<div class="result-row-top"><div><div class="result-name">${escapeHtml(item.name)}</div><div class="result-number">Chapa ${escapeHtml(item.number ?? item.id)}</div></div><div class="result-count">${votes}<small>${pct}% dos votos</small></div></div><div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
      list.appendChild(row);
    });
    if (!results.length) list.innerHTML = '<p>Não há candidaturas cadastradas para apuração.</p>';
    if ($('resultsUpdated')) $('resultsUpdated').textContent = `Atualizado em ${new Date().toLocaleString('pt-BR')}`;
    if ($('networkStatus')) $('networkStatus').textContent = 'Online';
    if ($('networkDetail')) $('networkDetail').textContent = 'Dados consultados na API';
    setConnection(true, 'API conectada');
  } catch (error) {
    console.error('[API results]', error);
    list.innerHTML = `<p>Falha ao carregar resultados: ${escapeHtml(error.message)}</p>`;
    if ($('networkStatus')) $('networkStatus').textContent = 'Erro';
    if ($('networkDetail')) $('networkDetail').textContent = error.message;
    setConnection(false, 'Falha na API');
  }
}
function setConnection(online, message) {
  const dot = $('connectionDot'); if (dot) dot.className = `status-dot ${online ? 'online' : 'offline'}`;
  const label = $('connectionText'); if (label) label.textContent = message;
  const bannerDot = $('bannerDot'); if (bannerDot) bannerDot.className = `status-dot ${online ? 'online' : 'offline'}`;
  const bannerStatus = $('bannerStatus'); if (bannerStatus) bannerStatus.textContent = message;
  const pending = $('pendingSummary'); if (pending) pending.textContent = online ? 'API acessível; operações enviadas diretamente' : 'Confira a conexão para sincronizar';
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function setupNotifications() {
  const button = $('notifyButton') || $('notifyResults');
  button?.addEventListener('click', async () => {
    if (!('Notification' in window)) return showToast('Este navegador não oferece notificações.');
    const permission = await Notification.requestPermission();
    if (permission === 'granted') new Notification('Eleição Esportiva', { body: 'Notificações de demonstração ativadas.', icon: './assets/icon.svg' });
    else showToast('Permissão de notificação não concedida.');
  });
}
document.addEventListener('DOMContentLoaded', () => {
  loadCandidates();
  loadResults();
  $('confirmVote')?.addEventListener('click', submitVote);
  $('cancelVote')?.addEventListener('click', () => $('voteDialog')?.close());
  $('refreshResults')?.addEventListener('click', loadResults);
  $('syncButton')?.addEventListener('click', async () => { await loadCandidates(); await loadResults(); });
  setupNotifications();
  window.addEventListener('online', () => { loadCandidates(); loadResults(); });
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service Worker:', error)));
}
