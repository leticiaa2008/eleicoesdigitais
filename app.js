// ==========================================
// CONFIGURAÇÃO DA API
// ==========================================
// Substitua pela URL real do seu projeto publicado na Vercel
const API_URL = 'https://eleicoesdigitais-back-git-main-leticiaa2008s-projects.vercel.app/';

// ==========================================
// BIND DOS EVENTOS DA INTERFACE (MANTIDOS DO SEU CÓDIGO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Se estiver na página inicial (votação)
    if (document.getElementById('cards-container')) {
        carregarECandidatosVotacao();
    }
    
    // Se estiver na página de resultados
    if (document.getElementById('results-container')) {
        carregarEResultados();
    }

    // Configuração dos modais
    setupModals();
});

// ==========================================
// INTEGRACAO COM SUPABASE VIA VERCEL API
// ==========================================

// Procura os candidatos no Supabase para montar a tela de votação
async function carregarECandidatosVotacao() {
    const container = document.getElementById('cards-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/candidatos`);
        if (!response.ok) throw new Error('Erro ao carregar candidatos do servidor');

        const candidatos = await response.json();
        renderCards(candidatos);
    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = `<p style="color: red; text-align: center;">Erro ao carregar os candidatos. Verifique a conexão.</p>`;
    }
}

// Renderiza os cards mantendo a sua estrutura de HTML/CSS original
function renderCards(candidatos) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    candidatos.forEach(candidato => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${candidato.foto || 'assets/icon.svg'}" alt="${candidato.nome}">
            <h3>${candidato.nome}</h3>
            <p>${candidato.partido || ''}</p>
            <button class="btn btn-votar" onclick="confirmarVoto(${candidato.id}, '${candidato.nome}')">Votar</button>
        `;
        container.appendChild(card);
    });
}

// Envia o voto para o Supabase
async function executarVoto(id) {
    try {
        const response = await fetch(`${API_URL}/votar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ candidatoId: id })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccessModal();
        } else {
            alert(`Erro ao registrar voto: ${data.error || 'Tente novamente.'}`);
        }
    } catch (error) {
        console.error('Erro ao votar:', error);
        alert('Erro de conexão ao tentar registrar o voto.');
    }
}

// Procura os resultados em tempo real no Supabase para a tela de resultados
async function carregarEResultados() {
    const container = document.getElementById('results-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/candidatos`);
        if (!response.ok) throw new Error('Erro ao carregar resultados');

        const candidatos = await response.json();
        
        // Ordena por maior número de votos
        candidatos.sort((a, b) => b.votos - a.votos);
        
        const totalVotos = candidatos.reduce((acc, c) => acc + (c.votos || 0), 0);

        container.innerHTML = '';
        candidatos.forEach(candidato => {
            const percentual = totalVotos > 0 ? ((candidato.votos / totalVotos) * 100).toFixed(1) : 0;
            
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `
                <div class="result-info">
                    <span><strong>${candidato.nome}</strong> (${candidato.partido || 'Sem partido'})</span>
                    <span>${candidato.votos || 0} votos (${percentual}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentual}%"></div>
                </div>
            `;
            container.appendChild(item);
        });

        const totalEl = document.getElementById('total-votos');
        if (totalEl) totalEl.innerText = `Total de Votos: ${totalVotos}`;

    } catch (error) {
        console.error('Erro nos resultados:', error);
    }
}

// ==========================================
// MODAIS E CONFIRMAÇÕES (DO SEU PROJETO)
// ==========================================
let candidatoSelecionadoId = null;

function confirmarVoto(id, nome) {
    candidatoSelecionadoId = id;
    const modal = document.getElementById('modal-confirmacao');
    const nomeEl = document.getElementById('modal-candidato-nome');
    
    if (nomeEl) nomeEl.innerText = nome;
    if (modal) modal.style.display = 'flex';
}

function setupModals() {
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const modalConfirmacao = document.getElementById('modal-confirmacao');
    const modalSucesso = document.getElementById('modal-sucesso');

    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            if (modalConfirmacao) modalConfirmacao.style.display = 'none';
            if (candidatoSelecionadoId !== null) {
                executarVoto(candidatoSelecionadoId);
            }
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            if (modalConfirmacao) modalConfirmacao.style.display = 'none';
            candidatoSelecionadoId = null;
        });
    }
}

function showSuccessModal() {
    const modalSucesso = document.getElementById('modal-sucesso');
    if (modalSucesso) {
        modalSucesso.style.display = 'flex';
        setTimeout(() => {
            modalSucesso.style.display = 'none';
            window.location.href = 'resultado.html';
        }, 2000);
    } else {
        alert('Voto computado com sucesso!');
        window.location.href = 'resultado.html';
    }
}