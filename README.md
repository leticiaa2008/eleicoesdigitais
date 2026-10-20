# Eleição Esportiva — Grupo 06: Clube de Esportes

Projeto acadêmico de **Web Apps Offline-First** para a disciplina de Desenvolvimento de Sistemas, orientada pelo Prof. Esp. Leandro Gaudio Rosa.

> **Aviso:** esta é uma simulação educacional. Não usa votos reais, campanhas partidárias nem dados eleitorais oficiais.

## 1. Objetivo

Demonstrar uma aplicação web que apresenta candidaturas fictícias para um clube esportivo, registra uma escolha simulada, mostra uma apuração local e mantém recursos essenciais acessíveis quando a conexão fica indisponível.

## 2. Integrantes

- Integrante 1: preencher nome
- Integrante 2: preencher nome
- Integrante 3: preencher nome
- Integrante 4: preencher nome

## 3. Aplicação publicada

- GitHub Pages: preencher após publicar
- Repositório GitHub: preencher com a URL do repositório
- Vídeo de demonstração: preencher com o link
- Evidências: pasta [`screenshots/`](./screenshots/)

## 4. Tecnologias

- HTML5, CSS3 e JavaScript puro
- Service Worker e Cache API
- IndexedDB para a fila de operações pendentes
- LocalStorage para impedir novo voto na mesma sessão/navegador e contar os votos locais
- Notifications API para notificação local demonstrativa
- Manifest PWA
- Chrome/Edge DevTools e Lighthouse para testes

## 5. Funcionalidades

- Lista de três candidaturas fictícias e suas propostas
- Confirmação de voto simulado
- Bloqueio de uma segunda votação no mesmo navegador/perfil
- Apuração local com totais e percentuais
- Indicador online/offline
- Armazenamento local de operações pendentes
- Botão de tentativa de sincronização
- Registro de Service Worker e cache dos arquivos essenciais
- Notificação demonstrativa, mediante permissão
- Ação ao clicar na notificação, abrindo a página relacionada
- Layout responsivo e suporte a preferência por movimento reduzido

## 6. Como executar localmente

**Não abra o HTML com duplo clique (`file://`).** Service Workers precisam de HTTPS ou `localhost`.

### Opção A — VS Code com Live Server

1. Extraia a pasta do projeto.
2. Abra a pasta `eleicoes-digitais-grupo6` no VS Code.
3. Se Live Server já estiver instalado, clique com o botão direito em `index.html`.
4. Escolha **Open with Live Server**.
5. O navegador abrirá um endereço parecido com `http://127.0.0.1:5500`.

### Opção B — Python instalado

Abra um terminal dentro da pasta e execute:

```bash
python -m http.server 8000
```

No navegador, acesse `http://localhost:8000`.

## 7. Estratégia de cache e funcionamento offline

- **Cache de núcleo na instalação:** `sw.js` tenta armazenar `index.html`, `resultado.html`, `style.css`, `app.js`, `manifest.json` e o ícone.
- **Navegação:** estratégia *Network First*: tenta buscar a página na rede e usa uma cópia em cache quando a rede falha.
- **Arquivos estáticos do mesmo domínio:** estratégia *Cache First*: responde pelo cache para reduzir latência e funcionar sem rede.
- **Fallback:** tenta entregar a página inicial em cache; se não houver cache, exibe uma mensagem offline simples.
- O cache de terceiros, como fontes do Google, não é obrigatório para o funcionamento principal. Se as fontes externas não estiverem disponíveis, o navegador usa fontes alternativas.

## 8. Backend Vercel + Supabase

O front-end está configurado para usar `https://eleicoesdigitais-back.vercel.app` como API. Ele consulta `/api/candidates`, `/api/proposals` e `/api/results`; votos online são enviados a `/api/votes`. Se estiver offline ou a API falhar, a operação permanece na fila IndexedDB e é tentada novamente quando a conexão voltar.

Para funcionar de ponta a ponta, a API publicada precisa ter as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` configuradas na Vercel e o script `supabase/schema.sql` executado no projeto Supabase. Configure também `FRONTEND_ORIGIN` com a origem exata onde este front-end está hospedado (por exemplo, o domínio GitHub Pages, sem caminho). A API deve responder em `https://eleicoesdigitais-back.vercel.app/api/health` com `ok: true`. Nunca coloque a chave `service_role` no front-end.

## 9. Background Sync e fila offline

Ao confirmar um voto simulado, a aplicação grava uma operação no IndexedDB com status `pendente`. O indicador mostra quantas operações estão na fila. Quando a conexão volta, a aplicação tenta processar as pendências; se o navegador suportar Background Sync, também registra a tag `sincronizar-votos`.

**Limitação importante:** não existe API/backend neste projeto. Portanto, “sincronizar” significa concluir uma simulação local e remover a operação da fila, não enviar votos a um servidor. Para um cenário real, seria necessário criar uma API segura, validar a identidade e a elegibilidade no servidor, tratar duplicidade de forma transacional e definir regras de auditoria. O evento `sync` do Service Worker apenas notifica as páginas nesta versão didática; o processamento da fila é feito pela aplicação quando ela está aberta e a conexão retorna.

## 10. Push Notifications

- O botão **Testar notificação** pede permissão e usa `ServiceWorkerRegistration.showNotification()` para criar uma notificação local.
- O Service Worker contém o listener `push` e o listener `notificationclick`.
- A notificação local é uma simulação controlada; ela não comprova entrega remota real de push.
- Um sistema de push real precisa de um servidor, assinatura Push, chaves VAPID, endpoint de inscrição e envio por um serviço Web Push.
- Notificações normalmente exigem HTTPS (localhost é exceção para desenvolvimento) e permissão do usuário.

## 11. Preload, Prefetch e DNS-prefetch

- **Preload:** `style.css` é solicitado cedo porque define a apresentação essencial da página.
- **Prefetch:** `resultado.html` é indicado como recurso provável para a próxima navegação a partir da página inicial. Na página de resultados, `index.html` é indicado como retorno provável.
- **DNS-prefetch:** prepara resolução DNS para `fonts.googleapis.com` e `fonts.gstatic.com`, domínios usados para fontes externas.
- A página também usa `preconnect` para os domínios de fontes. O navegador pode ignorar dicas de prioridade e prefetch conforme a conexão, política de cache ou economia de dados; validar no DevTools e não presumir que toda dica será sempre executada.

## 12. Roteiro de testes e evidências

1. Abra a aplicação online e recarregue a página.
2. DevTools → **Application** → **Service Workers**: verifique se `sw.js` está ativo.
3. DevTools → **Application** → **Cache Storage**: confira `eleicao-esportiva-g6-v1`.
4. DevTools → **Network** → marque **Offline**.
5. Recarregue a página e confira se a interface e as candidaturas continuam aparecendo.
6. Registre um voto de teste. Confira a mensagem e a contagem de operações pendentes.
7. Desmarque **Offline** ou restaure a conexão. Clique em **Tentar sincronizar** e confira a fila.
8. Clique em **Testar notificação** e conceda permissão.
9. Clique na notificação e confira se a página relacionada abre.
10. DevTools → **Network**: inspecione recursos, tamanho, cache e dicas de carregamento.
11. Execute Lighthouse e registre uma comparação antes/depois se houver otimizações.

Salve prints em `screenshots/` e insira-os neste README com uma legenda. **Não invente evidências: capture as telas reais do seu navegador.**

## 13. Problemas conhecidos e limitações

- Dados e apuração são locais ao navegador; não são compartilhados entre pessoas ou dispositivos.
- Limpar dados do site pode apagar os votos e operações armazenados.
- A prevenção de duplicidade é didática e não é segurança suficiente para uma eleição real.
- Background Sync não é suportado por todos os navegadores e pode depender de permissões e condições do sistema.
- Push remoto não está configurado; o botão apresenta uma notificação local.
- O cache só existe depois que a página foi carregada pelo menos uma vez com os arquivos acessíveis.
- O navegador pode impedir notificações se a permissão for negada ou se a página não estiver em contexto seguro.

## 14. Melhorias futuras

- API de backend para sincronização real e persistência central
- Autenticação e controle de elegibilidade
- Registro de auditoria e proteção contra duplicidade no servidor
- Push remoto com VAPID
- Testes automatizados e melhorias guiadas por Lighthouse

## 15. Apresentação de até 7 minutos

- **0:00–2:00:** problema, público e proposta do Clube de Esportes
- **2:00–4:00:** candidaturas, propostas, voto simulado e apuração
- **4:00–6:00:** desligar a rede, mostrar cache, registrar pendência e reconectar
- **6:00–7:00:** notificação, preload/prefetch/DNS-prefetch e decisões técnicas

Cada integrante deve explicar pelo menos duas decisões técnicas. Atualizem este README com os nomes, links e evidências antes da entrega.
