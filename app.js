/* Eleição Esportiva — Grupo 06 | Demonstração educacional offline-first */
(() => {
  "use strict";
  const CANDIDATES = [
    { id: "c1", number: "01", name: "Marina Costa", role: "CHAPA 01 · ESPORTE PARA TODOS", slogan: "“Mais esporte, mais oportunidades.”", emoji: "🏃", cover: "", proposals: ["Organizar torneios entre turmas.", "Criar empréstimo de materiais esportivos.", "Promover treinos inclusivos para iniciantes."] },
    { id: "c2", number: "02", name: "Lucas Almeida", role: "CHAPA 02 · TIME EM MOVIMENTO", slogan: "“Juntos, a gente chega mais longe.”", emoji: "⚽", cover: "cover-blue", proposals: ["Melhorar a conservação da quadra.", "Montar um calendário mensal de jogos.", "Criar desafios esportivos com participação voluntária."] },
    { id: "c3", number: "03", name: "Rafaela Santos", role: "CHAPA 03 · INOVAÇÃO EM JOGO", slogan: "“Novas ideias. Um clube mais forte.”", emoji: "🏆", cover: "cover-orange", proposals: ["Criar mural digital de eventos e resultados.", "Realizar campanhas de respeito no esporte.", "Ouvir sugestões dos alunos a cada mês."] }
  ];
  const DB_NAME = "eleicao-esportiva-g6";
  const DB_VERSION = 1;
  const STORE = "operations";
  const VOTE_KEY = "eleicao-g6-vote";
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
      if (!silent) toast("Você está offline. As operações continuam guardadas neste dispositivo.");
      return false;
    }
    const pending = await getOperations();
    if (!pending.length) {
      updatePendingCount();
      if (!silent) toast("Tudo em dia: não há operações pendentes.");
      return true;
    }
    // Simulação didática: sem API/backend, a conexão é usada apenas para demonstrar
    // a passagem de "pendente" para "sincronizado". Não envia votos para um servidor.
    try {
      await markOperationsSynced(pending.map(item => item.id));
      updatePendingCount();
      if (!silent) toast(`${pending.length} operação(ões) sincronizada(s) na demonstração local.`);
      refreshResults();
      return true;
    } catch (err) {
      console.error(err);
      if (!silent) toast("Não foi possível atualizar a fila. Tente novamente.");
      return false;
    }
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
    try {
      await addOperation({ type: "voto-simulado", candidateId: selectedCandidate.id, candidateName: selectedCandidate.name, candidateNumber: selectedCandidate.number });
      if (navigator.serviceWorker?.controller && "SyncManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        if (reg.sync) await reg.sync.register("sincronizar-votos");
      }
      toast(navigator.onLine ? "Voto simulado registrado. Operação adicionada à fila local." : "Voto guardado offline! Será possível sincronizar depois.");
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
    const total = CANDIDATES.reduce((sum, c) => sum + (Number(totals[c.id]) || 0), 0);
    const sorted = [...CANDIDATES].sort((a, b) => (Number(totals[b.id]) || 0) - (Number(totals[a.id]) || 0));
    list.innerHTML = sorted.map(c => {
      const count = Number(totals[c.id]) || 0;
      const pct = total ? Math.round(count / total * 100) : 0;
      return `<article class="result-row"><div class="result-row-top"><div><div class="result-name">${c.emoji} ${c.name}</div><div class="result-number">Chapa ${c.number} · ${c.role.split("·")[1].trim()}</div></div><div class="result-count">${count}<small>${pct}% dos votos locais</small></div></div><div class="progress-track" role="progressbar" aria-label="Percentual de votos de ${c.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="progress-fill" style="width:${pct}%"></div></div></article>`;
    }).join("");
    const totalEl = $("#totalVotes");
    if (totalEl) totalEl.textContent = String(total);
    const updated = $("#resultsUpdated");
    if (updated) updated.textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
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
    renderCandidates();
    await refreshResults();
    registerServiceWorker();
    $("#confirmVote")?.addEventListener("click", registerVote);
    $("#cancelVote")?.addEventListener("click", () => $("#voteDialog")?.close());
    $("#syncButton")?.addEventListener("click", () => syncPending());
    $("#notifyButton")?.addEventListener("click", () => showLocalNotification("Eleição Esportiva", "Confira as propostas e acompanhe a apuração simulada.", "./index.html#candidatos"));
    $("#notifyResults")?.addEventListener("click", () => showLocalNotification("Apuração disponível", "Os resultados simulados do Clube de Esportes estão prontos para consulta.", "./resultado.html"));
    $("#refreshResults")?.addEventListener("click", () => { refreshResults(); toast("Apuração atualizada neste dispositivo."); });
    window.addEventListener("online", () => { setConnectionUI(); syncPending({ silent: true }); });
    window.addEventListener("offline", setConnectionUI);
    setConnectionUI();
    if (navigator.onLine) syncPending({ silent: true });
  });
})();
