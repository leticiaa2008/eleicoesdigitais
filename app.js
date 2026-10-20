// API pública do backend Eleições Digitais. Rotas reais ficam sob /api.
const API_BASE = 'https://eleicoesdigitais-back.vercel.app/api';
const API_URL = API_BASE;
const VOTER_KEY_STORAGE = 'eleicoes_digitais_voter_key';
function getVoterKey() {
  let key = localStorage.getItem(VOTER_KEY_STORAGE);
  if (!key) {
    key = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}-${Math.random()}`);
    localStorage.setItem(VOTER_KEY_STORAGE, key);
  }
  return key;
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || payload.error || `Erro HTTP ${response.status}`);
  return payload;
}
document.addEventListener('DOMContentLoaded', () => {
  atualizarStatusConexao();
  const grid = document.getElementById('candidateGrid') || document.getElementById('cards-container') || document.querySelector('.cards-grid');
  if (grid) carregarCandidatosDoSupabase(grid);
  if (document.getElementById('resultsList')) carregarResultados();
  const refresh = document.getElementById('refreshResults');
  if (refresh) refresh.addEventListener('click', carregarResultados);
  const notify = document.getElementById('notifyResults');
  if (notify) notify.addEventListener('click', () => alert('Apuração atualizada com os dados retornados pela API.'));
});
async function atualizarStatusConexao() {
  const dot = document.getElementById('connectionDot');
  const label = document.getElementById('connectionText');
  try {
    const health = await api('/health');
    if (label) label.textContent = health.database === 'connected' ? 'Supabase conectado' : 'API online';
    if (dot) dot.classList.add('online');
  } catch (e) {
    if (label) label.textContent = 'Sem conexão com API';
    if (dot) dot.classList.add('offline');
    console.error('Falha no health check:', e);
  }
}
async function carregarCandidatosDoSupabase(container) {
  container.innerHTML = '<p>Carregando candidaturas do Supabase…</p>';
  try {
    const candidates = await api('/candidates');
    container.replaceChildren();
    if (!Array.isArray(candidates) || candidates.length === 0) {
      container.innerHTML = '<p>Nenhum candidato cadastrado na tabela candidates do Supabase.</p>';
      return;
    }
    for (const candidate of candidates) {
      const card = document.createElement('article');
      card.className = 'candidate-card';
      const photo = document.createElement('img');
      photo.className = 'candidate-photo'; photo.alt = candidate.name || 'Candidato';
      photo.src = candidate.photo_url || './assets/icon.svg';
      photo.onerror = () => { photo.onerror = null; photo.src = './assets/icon.svg'; };
      const number = document.createElement('p'); number.className = 'candidate-number';
      number.textContent = `Nº ${candidate.number ?? candidate.id}`;
      const name = document.createElement('h3'); name.textContent = candidate.name || 'Candidato sem nome';
      const slogan = document.createElement('p'); slogan.textContent = candidate.slogan || '';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'button button-primary'; button.textContent = 'Votar';
      button.addEventListener('click', () => confirmarVoto(candidate.id, candidate.name || 'Candidato'));
      card.append(photo, number, name, slogan, button); container.appendChild(card);
    }
  } catch (error) {
    console.error('Erro ao carregar candidatos:', error);
    container.innerHTML = '';
    const msg = document.createElement('p');
    msg.textContent = `Não foi possível carregar os candidatos do Supabase: ${error.message}`;
    container.appendChild(msg);
  }
}
let idCandidatoSelecionado = null;
function confirmarVoto(id, nome) {
  idCandidatoSelecionado = id;
  const modal = document.getElementById('modal-confirmacao');
  const modalNome = document.getElementById('modal-candidato-nome');
  if (modalNome) modalNome.textContent = nome;
  if (modal) {
    modal.style.display = 'flex';
    const confirmButton = document.getElementById('btn-confirmar');
    const cancelButton = document.getElementById('btn-cancelar');
    if (confirmButton) confirmButton.onclick = async () => { modal.style.display = 'none'; await enviarVoto(idCandidatoSelecionado); };
    if (cancelButton) cancelButton.onclick = () => { modal.style.display = 'none'; idCandidatoSelecionado = null; };
  } else if (confirm(`Deseja confirmar seu voto em “${nome}”?`)) enviarVoto(id);
}
async function enviarVoto(candidateId) {
  try {
    await api('/votes', { method: 'POST', body: JSON.stringify({ candidate_id: candidateId, voter_key: getVoterKey() }) });
    alert('Voto registrado no Supabase!');
    window.location.href = './resultado.html';
  } catch (error) {
    console.error('Erro ao registrar voto:', error);
    alert(`O voto NÃO foi registrado: ${error.message}`);
  }
}
async function carregarResultados() {
  const list = document.getElementById('resultsList');
  if (!list) return;
  list.innerHTML = '<p>Carregando resultados do Supabase…</p>';
  try {
    const results = await api('/results');
    list.replaceChildren();
    let total = 0;
    for (const item of results) {
      total += Number(item.votes || 0);
      const row = document.createElement('article'); row.className = 'result-card';
      const title = document.createElement('h3'); title.textContent = `${item.number ?? item.id} — ${item.name}`;
      const count = document.createElement('p'); count.textContent = `${item.votes || 0} voto(s) · ${item.percentage || 0}%`;
      row.append(title, count); list.appendChild(row);
    }
    const totalEl = document.getElementById('totalVotes'); if (totalEl) totalEl.textContent = String(total);
    const updated = document.getElementById('resultsUpdated'); if (updated) updated.textContent = `Atualizado em ${new Date().toLocaleString('pt-BR')}`;
    const status = document.getElementById('networkStatus'); if (status) status.textContent = 'Online';
    const detail = document.getElementById('networkDetail'); if (detail) detail.textContent = 'Dados recebidos da API/Supabase';
    if (!results.length) list.innerHTML = '<p>O Supabase não retornou candidatos para apuração.</p>';
  } catch (error) {
    console.error('Erro ao carregar resultados:', error);
    list.innerHTML = '';
    const msg = document.createElement('p'); msg.textContent = `Não foi possível carregar a apuração: ${error.message}`; list.appendChild(msg);
    const status = document.getElementById('networkStatus'); if (status) status.textContent = 'Erro';
    const detail = document.getElementById('networkDetail'); if (detail) detail.textContent = 'Verifique a API e o Supabase';
  }
}
