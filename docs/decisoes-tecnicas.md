# Decisões técnicas — Eleição Esportiva (Grupo 06)

## Por que Service Worker?
O Service Worker atua como intermediário entre a página e a rede. Depois de instalado, pode responder a requisições usando Cache API quando a conexão não está disponível.

## Por que combinar Network First e Cache First?
- Documentos de navegação usam Network First para tentar obter a versão mais recente.
- Arquivos estáticos essenciais usam Cache First para abrir rapidamente e continuar funcionando offline.
- A estratégia híbrida equilibra atualização e resiliência.

## Por que IndexedDB?
A fila de operações pode crescer e tem estrutura de registros. IndexedDB é assíncrono e mais apropriado que guardar uma fila complexa em LocalStorage.

## O que “sincronização” significa neste protótipo?
É uma simulação local. Não existe backend e nenhum voto é enviado pela internet. Uma implementação real precisaria de endpoint HTTPS, autenticação, validação e tratamento idempotente no servidor.

## Push local versus push remoto
`showNotification()` exibe uma notificação local após permissão. O evento `push` no Service Worker fica preparado para payload remoto, mas não há assinatura nem servidor push configurados. Portanto, o requisito é demonstrado parcialmente de forma didática e essa limitação deve ser explicada.

## Dicas de desempenho
- Preload do CSS porque é essencial para renderizar a página.
- Prefetch da tela de apuração porque é uma navegação provável após conhecer candidatos.
- DNS-prefetch para os domínios externos de fontes que a página realmente referencia.
- As dicas são sugestões ao navegador, não garantias. Devem ser verificadas em Network/Performance e Lighthouse.

## Privacidade e segurança
Os candidatos são fictícios. Os dados ficam no navegador. Não inserir dados pessoais reais. A trava de um voto é apenas uma demonstração e não deve ser usada como mecanismo de segurança eleitoral.
