/* Service Worker — Grupo 06 | Estratégia: cache-first para recursos estáticos e fallback offline. */
const CACHE_NAME = "eleicao-esportiva-g6-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./resultado.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/icon.svg"
];
const FALLBACK_URL = "./index.html";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache dos recursos essenciais. Se um item falhar, tenta armazenar os demais.
    await Promise.all(CORE_ASSETS.map(async url => {
      try { await cache.add(new Request(url, { cache: "reload" })); }
      catch (error) { console.warn("Não foi possível pré-armazenar:", url, error); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("eleicao-esportiva-g6-") && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // não armazenar indiscriminadamente recursos de terceiros
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cachedPage = await caches.match(request, { ignoreSearch: true });
        if (cachedPage) return cachedPage;
        const fallback = await caches.match(FALLBACK_URL);
        if (fallback) return fallback;
        return new Response("<!doctype html><html lang='pt-BR'><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>Offline</title><body><h1>Você está offline</h1><p>Abra a página inicial após conectar-se à internet pelo menos uma vez.</p></body></html>", { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });
      }
    })());
    return;
  }
  // Cache-first para arquivos estáticos: resposta rápida offline; atualização opcional via rede.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return new Response("", { status: 503, statusText: "Offline — recurso indisponível em cache" });
    }
  })());
});

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ type: "SYNC_COMPLETE", message }));
}

async function processPendingSync() {
  // A sincronização real envia a fila ao backend. Nunca apaga um voto só por estar na fila.
  const DB_NAME = "eleicao-esportiva-g6";
  const STORE = "operations";
  const API_BASE = "https://eleicoesdigitais-back.vercel.app";
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const pending = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  const syncedIds = [];
  for (const item of pending) {
    try {
      const response = await fetch(`${API_BASE}/api/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: item.candidateId, voter_key: item.voterKey })
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok || (response.status === 409 && /já registrou|já.*voto|already/i.test(result.error || ""))) {
        syncedIds.push(item.id);
      } else if (response.status >= 500 || response.status === 429) {
        throw new Error(result.error || `Backend indisponível (${response.status})`);
      }
      // Erros de validação permanecem na fila para inspeção; não são apagados.
    } catch (error) {
      db.close();
      await notifyClients(`Sincronização não concluída: ${error.message}`);
      throw error; // permite ao navegador repetir o Background Sync
    }
  }
  if (syncedIds.length) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      syncedIds.forEach(id => store.delete(id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  db.close();
  await notifyClients(`${syncedIds.length} voto(s) sincronizado(s) com a API; ${pending.length - syncedIds.length} permanece(m) pendente(s).`);
}

self.addEventListener("sync", event => {
  if (event.tag === "sincronizar-votos") event.waitUntil(processPendingSync());
});

self.addEventListener("push", event => {
  let payload = { title: "Eleição Esportiva", body: "Há uma nova atualização da eleição.", url: "./resultado.html" };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; }
  catch { if (event.data) payload.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(payload.title || "Eleição Esportiva", {
    body: payload.body || "Há uma nova atualização da eleição.",
    icon: "./assets/icon.svg",
    badge: "./assets/icon.svg",
    tag: "eleicao-esportiva-push",
    data: { url: payload.url || "./resultado.html" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./resultado.html", self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
