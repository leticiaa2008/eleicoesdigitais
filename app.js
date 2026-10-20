/* Eleição Esportiva — Grupo 06 | Demonstração educacional offline-first */
(() => {
  "use strict";
  let CANDIDATES = [
    { id: "c1", number: "01", name: "Marina Costa", role: "CHAPA 01 · ESPORTE PARA TODOS", slogan: "“Mais esporte, mais oportunidades.”", emoji: "🏃", cover: "", proposals: ["Organizar torneios entre turmas.", "Criar empréstimo de materiais esportivos.", "Promover treinos inclusivos para iniciantes."] },
    { id: "c2", number: "02", name: "Lucas Almeida", role: "CHAPA 02 · TIME EM MOVIMENTO", slogan: "“Juntos, a gente chega mais longe.”", emoji: "⚽", cover: "cover-blue", proposals: ["Melhorar a conservação da quadra.", "Montar um calendário mensal de jogos.", "Criar desafios esportivos com participação voluntária."] },
    { id: "c3", number: "03", name: "Rafaela Santos", role: "CHAPA 03 · INOVAÇÃO EM JOGO", slogan: "“Novas ideias. Um clube mais forte.”", emoji: "🏆", cover: "cover-orange", proposals: ["Criar mural digital de eventos e resultados.", "Realizar campanhas de respeito no esporte.", "Ouvir sugestões dos alunos a cada mês."] }
  ];
  const DB_NAME = "eleicao-esportiva-g6";
  const DB_VERSION = 1;
  const STORE = "operations";
  const VOTE_KEY = "eleicao-g6-vote";
  const API_BASE = "https://eleicoesdigitais-back.vercel.app";
  const VOTER_KEY = "eleicao-g6-voter-key";
  const CANDIDATES_CACHE_KEY = "eleicao-g6-candidates-cache";
  let serverResults = null;
  const presentationTemplates = CANDIDATES.map(c => ({ role: c.role, emoji: c.emoji, cover: c.cover }));
  const TOTALS_KEY = "eleicao-g6-local-totals";
  const $ = (sel, root = document) => root.querySelector(sel);
  let selectedCandidate = null;
  let toastTimer;

  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
  }
  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `Erro na API (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }
  function getVoterKey() {
    let key = localStorage.getItem(VOTER_KEY);
    if (!key) {
      key = (window.crypto?.randomUUID?.() || `voter-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(VOTER_KEY, key);
    }
    return key;
  }
  function mapRemoteCandidates(remoteCandidates, remoteProposals) {
    return remoteCandidates.map((remote, index) => {
      const template = presentationTemplates[index % presentationTemplates.length] || { role: "CLUBE DE ESPORTES", emoji: "🏆", cover: "" };
      const proposals = remoteProposals.filter(p => String(p.candidate_id) === String(remote.id)).map(p => `${p.title}: ${p.description}`);
      return {
        id: String(remote.id), number: String(remote.number).padStart(2, "0"),
        name: remote.name, role: template.role, slogan: `“${remote.slogan || "Mais esporte para todos."}”`,
        emoji: template.emoji, cover: template.cover, proposals: proposals.length ? proposals : [remote.slogan || "Conheça as propostas desta chapa."]
      };
    });
  }
  function loadCachedCandidates() {
    try {
      const cached = JSON.parse(localStorage.getItem(CANDIDATES_CACHE_KEY) || "null");
      if (cached && Array.isArray(cached.candidates) && cached.candidates.length) {
        CANDIDATES = mapRemoteCandidates(cached.candidates, Array.isArray(cached.proposals) ? cached.proposals : []);
        renderCandidates();
        console.info("Candidaturas recuperadas do cache local.", CANDIDATES.length);
      }
    } catch (error) { console.warn("Cache de candidaturas inválido.", error); }
  }
  async function loadCandidatesFromAPI() {
    if (!navigator.onLine) return;
    try {
      const [remoteCandidates, remoteProposals] = await Promise.all([
        apiRequest("/api/candidates"), apiRequest("/api/proposals")
      ]);
      if (!Array.isArray(remoteCandidates) || !remoteCandidates.length) return;
      localStorage.setItem(CANDIDATES_CACHE_KEY, JSON.stringify({ candidates: remoteCandidates, proposals: remoteProposals }));
      CANDIDATES = mapRemoteCandidates(remoteCandidates, remoteProposals);
      renderCandidates();
      console.info("Candidaturas carregadas da API Vercel.", CANDIDATES.length);
    } catch (error) {
      console.warn("API indisponível; usando candidaturas salvas localmente.", error.message);
    }
  }
  async function loadServerResults() {
    if (!navigator.onLine) return false;
    try {
      const rows = await apiRequest("/api/results");
      if (Array.isArray(rows)) { serverResults = rows; renderResults(); return true; }
    } catch (error) {
      console.warn("Não foi possível buscar a apuração da API:", error.message);
    }
    return false;
  }
  function getTotals() {
    try { return JSON.parse(localStorage.getItem(TOTALS_KEY)) || {}; } catch { return {}; }
  }
  function saveTotals(totals) { localStorage.setItem(TOTALS_KEY, JSON.stringify(totals)); }
  function getVote() {
    try { return JSON.parse(localStorage.getItem(VOTE_KEY)); } catch { return null; }
  }
  function setConnectionUI() {
    const online = navigator.onLine;
    const dot = $("#connectionDot");
    const text = $("#connectionText");
    if (dot) dot.className = `status-dot ${online ? "online" : "offline"}`;
    if (text) text.textContent = online ? "Conectado" : "Modo offline";
    const bDot = $("#bannerDot");
    const bStatus = $("#bannerStatus");
    if (bDot) bDot.className = `status-dot ${online ? "online" : "offline"}`;
    if (bStatus) bStatus.textContent = online ? "Você está online" : "Você está offline";
    const network = $("#networkStatus");
    const detail = $("#networkDetail");
    if (network) network.textContent = online ? "ONLINE" : "OFFLINE";
    if (detail) detail.textContent = online ? "Conexão disponível" : "Usando recursos locais";
  }
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB não disponível"));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Não foi possível abrir o IndexedDB"));
    });
  }
  async function addOperation(operation) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add({ ...operation, status: "pendente", createdAt: new Date().toISOString() });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }
  async function getOperations() {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn("Não foi possível ler a fila local:", err);
      return [];
    }
  }
  async function markOperationsSynced(ids) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      ids.forEach(id => store.delete(id));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }
  async function syncPending({ silent = false } = {}) {
    if (!navigator.onLine) {
      updatePendingCount();
      if (!silent) toast("Você está offline. Os votos continuam guardados neste dispositivo.");
      return false;
    }
    const pending = await getOperations();
    if (!pending.length) {
      await loadServerResults();
      updatePendingCount();
      if (!silent) toast("Tudo em dia: não há votos pendentes.");
      return true;
    }
    const syncedIds = [];
    let failed = false;
    for (const item of pending) {
      try {
        await apiRequest("/api/votes", {
          method: "POST",
          body: JSON.stringify({ candidate_id: item.candidateId, voter_key: item.voterKey || getVoterKey() })
        });
        syncedIds.push(item.id);
      } catch (error) {
        // 409 indica que o servidor já recebeu um voto desta chave; não reenviar indefinidamente.
        if (error.status === 409 && /já registrou|já.*voto|already/i.test(error.message)) syncedIds.push(item.id);
        else { failed = true; console.warn("Voto continua pendente para sincronização:", error.message); }
      }
    }
    if (syncedIds.length) await markOperationsSynced(syncedIds);
    await updatePendingCount();
    await loadServerResults();
    if (!silent) {
      if (failed) toast("Alguns votos continuam pendentes. Confira a API/Supabase e tente novamente.");
      else toast(`${syncedIds.length} voto(s) enviado(s) para o backend e Supabase.`);
    }
    return !failed;
  }
  async function updatePendingCount() {
    const count = (await getOperations()).length;
    const summary = $("#pendingSummary");
    const pending = $("#pendingVotes");
    if (summary) summary.textContent = `${count} ${count === 1 ? "operação pendente" : "operações pendentes"}`;
    if (pending) pending.textContent = String(count);
  }
  function renderCandidates() {
    const grid = $("#candidateGrid");
    if (!grid) return;
    const vote = getVote();
    grid.innerHTML = CANDIDATES.map(c => `
      <article class="candidate-card ${vote?.candidateId === c.id ? "selected" : ""}">
        <div class="candidate-cover ${c.cover}">
          <span class="candidate-number">Nº ${c.number}</span>
          <span class="candidate-emoji" aria-hidden="true">${c.emoji}</span>
        </div>
        <div class="candidate-body">
          <span class="candidate-role">${c.role}</span>
          <h3>${c.name}</h3>
          <p class="candidate-slogan">${c.slogan}</p>
          <span class="selected-label">${vote?.candidateId === c.id ? "✓ Voto registrado neste navegador" : ""}</span>
          <ul class="proposal-list">${c.proposals.map(p => `<li>${p}</li>`).join("")}</ul>
          <button class="button vote-button" type="button" data-vote="${c.id}" ${vote ? "disabled" : ""}>${vote ? (vote.candidateId === c.id ? "Voto registrado ✓" : "Votação já realizada") : "Votar nesta chapa ↗"}</button>
        </div>
      </article>`).join("");
    grid.querySelectorAll("[data-vote]").forEach(btn => btn.addEventListener("click", () => openVoteDialog(btn.dataset.vote)));
  }
  function openVoteDialog(id) {
    if (getVote()) { toast("Esta sessão já registrou um voto simulado."); return; }
    selectedCandidate = CANDIDATES.find(c => c.id === id);
    if (!selectedCandidate) return;
    const dialog = $("#voteDialog");
    $("#dialogTitle").textContent = `Votar em ${selectedCandidate.name}?`;
    $("#dialogText").textContent = `Chapa ${selectedCandidate.number}: ${selectedCandidate.slogan} Seu voto será salvo neste navegador.`;
    if (dialog?.showModal) dialog.showModal();
    else if (window.confirm(`Confirmar voto em ${selectedCandidate.name}?`)) registerVote();
  }
  async function registerVote() {
    if (!selectedCandidate) return;
    if (getVote()) { toast("Já existe um voto nesta sessão."); return; }
    const vote = { candidateId: selectedCandidate.id, candidateName: selectedCandidate.name, candidateNumber: selectedCandidate.number, votedAt: new Date().toISOString() };
    localStorage.setItem(VOTE_KEY, JSON.stringify(vote));
    const totals = getTotals();
    totals[selectedCandidate.id] = (Number(totals[selectedCandidate.id]) || 0) + 1;
    saveTotals(totals);
    serverResults = null;
    try {
      await addOperation({ type: "voto-simulado", candidateId: selectedCandidate.id, candidateName: selectedCandidate.name, candidateNumber: selectedCandidate.number, voterKey: getVoterKey() });
      if (navigator.serviceWorker?.controller && "SyncManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        if (reg.sync) await reg.sync.register("sincronizar-votos");
      }
      if (navigator.onLine) { await syncPending({ silent: true }); toast("Voto registrado neste dispositivo e enviado para sincronização com o Supabase."); }
      else toast("Voto guardado offline! Será enviado ao backend quando a conexão voltar.");
    } catch (err) {
      console.warn("IndexedDB indisponível; voto foi salvo no armazenamento local:", err);
      toast("Voto simulado salvo neste navegador. Fila offline indisponível neste ambiente.");
    }
    const dialog = $("#voteDialog");
    if (dialog?.open) dialog.close();
    selectedCandidate = null;
    renderCandidates();
    await updatePendingCount();
    refreshResults();
  }
  function renderResults() {
    const list = $("#resultsList");
    if (!list) return;
    const totals = getTotals();
    let rows;
    let total;
    if (Array.isArray(serverResults)) {
      rows = serverResults.map((remote, index) => {
        const local = CANDIDATES.find(c => String(c.id) === String(remote.id)) || CANDIDATES[index];
        return { candidate: local || { id: String(remote.id), name: remote.name, number: String(remote.number), role: "CLUBE DE ESPORTES", emoji: "🏆" }, count: Number(remote.votes) || 0, pct: Number(remote.percentage) || 0 };
      }).sort((a, b) => b.count - a.count);
      total = rows.reduce((sum, row) => sum + row.count, 0);
    } else {
      total = CANDIDATES.reduce((sum, c) => sum + (Number(totals[c.id]) || 0), 0);
      rows = [...CANDIDATES].map(c => {
        const count = Number(totals[c.id]) || 0;
        return { candidate: c, count, pct: total ? Math.round(count / total * 100) : 0 };
      }).sort((a, b) => b.count - a.count);
    }
    list.innerHTML = rows.map(({ candidate: c, count, pct }) =>
      `<article class="result-row"><div class="result-row-top"><div><div class="result-name">${c.emoji || "🏆"} ${c.name}</div><div class="result-number">Chapa ${c.number} · ${(c.role || "CLUBE DE ESPORTES").split("·").pop().trim()}</div></div><div class="result-count">${count}<small>${pct}% dos votos ${serverResults ? "no servidor" : "locais"}</small></div></div><div class="progress-track" role="progressbar" aria-label="Percentual de votos de ${c.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="progress-fill" style="width:${pct}%"></div></div></article>`
    ).join("");
    const totalEl = $("#totalVotes");
    if (totalEl) totalEl.textContent = String(total);
    const updated = $("#resultsUpdated");
    if (updated) updated.textContent = `${serverResults ? "Apuração do servidor" : "Apuração local"} · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  async function refreshResults() {
    renderResults();
    await updatePendingCount();
    setConnectionUI();
  }
  async function showLocalNotification(title, body, target = "./resultado.html") {
    if (!("Notification" in window)) { toast("Este navegador não oferece suporte a notificações."); return; }
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      toast("Notificações exigem HTTPS (ou localhost) e suporte a Service Worker.");
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") { toast("Permissão de notificação não concedida."); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon: "./assets/icon.svg", badge: "./assets/icon.svg", tag: "eleicao-esportiva-aviso", data: { url: target } });
      toast("Notificação de demonstração exibida.");
    } catch (err) {
      console.error(err);
      toast("Não foi possível exibir a notificação neste navegador.");
    }
  }
  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) { console.warn("Service Worker não suportado."); return; }
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      console.info("Service Worker registrado:", reg.scope);
      if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", event => {
        if (event.data?.type === "SYNC_COMPLETE") {
          updatePendingCount();
          toast("A fila offline foi processada pela demonstração.");
        }
      });
    } catch (err) { console.error("Falha ao registrar Service Worker:", err); }
  }
  document.addEventListener("DOMContentLoaded", async () => {
    loadCachedCandidates();
    renderCandidates();
    await loadCandidatesFromAPI();
    await refreshResults();
    await loadServerResults();
    registerServiceWorker();
    $("#confirmVote")?.addEventListener("click", registerVote);
    $("#cancelVote")?.addEventListener("click", () => $("#voteDialog")?.close());
    $("#syncButton")?.addEventListener("click", () => syncPending());
    $("#notifyButton")?.addEventListener("click", () => showLocalNotification("Eleição Esportiva", "Confira as propostas e acompanhe a apuração simulada.", "./index.html#candidatos"));
    $("#notifyResults")?.addEventListener("click", () => showLocalNotification("Apuração disponível", "Os resultados simulados do Clube de Esportes estão prontos para consulta.", "./resultado.html"));
    $("#refreshResults")?.addEventListener("click", async () => { await loadServerResults(); await refreshResults(); toast(serverResults ? "Apuração atualizada pelo backend." : "Apuração local atualizada; backend indisponível."); });
    window.addEventListener("online", () => { setConnectionUI(); syncPending({ silent: true }); });
    window.addEventListener("offline", setConnectionUI);
    setConnectionUI();
    if (navigator.onLine) syncPending({ silent: true });
  });
})();
