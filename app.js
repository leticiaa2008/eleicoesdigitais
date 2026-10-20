// ==========================================
// CONFIGURAÇÃO DA API DA VERCEL
// ==========================================
// Substitua pela URL gerada no seu deploy da Vercel
const API_URL = 'https://eleicoesdigitais-back-git-main-leticiaa2008s-projects.vercel.app/';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega os dados reais do Supabase na página inicial
    if (document.querySelector('.cards-grid') || document.getElementById('cards-container')) {
        carregarCandidatosDoSupabase();
    }

    // 2. Carrega a apuração na página de resultados
    if (document.getElementById('results-container')) {
        carregarResultados();
    }

    configurarModais();
});

// ==========================================
// CARREGAR CANDIDATOS (SUPABASE -> SITE)
// ==========================================
async function carregarCandidatosDoSupabase() {
    // Busca o elemento container na tela (tenta classe ou id)
    const container = document.querySelector('.cards-grid') || document.getElementById('cards-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/candidates`);
        if (!response.ok) throw new Error('Erro ao buscar candidatos');

        const candidates = await response.json();

        if (!candidates || candidates.length === 0) {
            container.innerHTML = '<p style="text-align: center; width: 100%;">Nenhum candidato encontrado no Supabase.</p>';
            return;
        }

        // Limpa os cards antigos e estáticos do HTML
        container.innerHTML = '';

        // Renderiza cada candidato vindo do Supabase
        candidates.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'card';
            
            // Ícone padrão caso photo_url esteja NULL
            const foto = candidate.photo_url || 'assets/icon.svg';
            const numeroFormatado = String(candidate.number || candidate.id).padStart(2, '0');

            card.innerHTML = `
                <div class="card-header">
                    <span class="badge-numero">Nº ${numeroFormatado}</span>
                    <img src="${foto}" alt="${candidate.name}" class="card-img" onerror="this.src='assets/icon.svg'">
                </div>
                <div class="card-body">
                    <small class="chapa-tag">CHAPA ${numeroFormatado}</small>
                    <h3>${candidate.name}</h3>
                    ${candidate.slogan ? `<p class="slogan">"${candidate.slogan}"</p>` : ''}
                    
                    <button class="btn btn-votar" onclick="confirmarVoto(${candidate.id}, '${candidate.name}')">
                        Votar
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Erro ao conectar com Supabase:', error);
        container.innerHTML = `<p style="color: red; text-align: center; width: 100%;">
            Não foi possível carregar as candidaturas do Supabase. Verifique a API.
        </p>`;
    }
}

// ==========================================
// REGISTRAR VOTO NO SUPABASE
// ==========================================
async function enviarVoto(candidateId) {
    try {
        const response = await fetch(`${API_URL}/votes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ candidateId })
        });

        const data = await response.json();

        if (response.ok) {
            exibirModalSucesso();
        } else {
            alert(`Erro ao registrar voto: ${data.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('Erro na requisição de voto:', error);
        alert('Erro ao conectar ao servidor para registrar seu voto.');
    }
}

// ==========================================
// GERENCIAMENTO DE MODAIS E CONFIRMAÇÕES
// ==========================================
let idCandidatoSelecionado = null;

function confirmarVoto(id, nome) {
    idCandidatoSelecionado = id;
    const modal = document.getElementById('modal-confirmacao');
    const modalNome = document.getElementById('modal-candidato-nome');

    if (modalNome) modalNome.innerText = nome;
    
    if (modal) {
        modal.style.display = 'flex';
    } else {
        if (confirm(`Deseja confirmar seu voto em "${nome}"?`)) {
            enviarVoto(id);
        }
    }
}

function configurarModais() {
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const modalConfirmacao = document.getElementById('modal-confirmacao');

    if (btnConfirmar) {
        btnConfirmar.onclick = () => {
            if (modalConfirmacao) modalConfirmacao.style.display = 'none';
            if (idCandidatoSelecionado) enviarVoto(idCandidatoSelecionado);
        };
    }

    if (btnCancelar) {
        btnCancelar.onclick = () => {
            if (modalConfirmacao) modalConfirmacao.style.display = 'none';
            idCandidatoSelecionado = null;
        };
    }
}

function exibirModalSucesso() {
    const modalSucesso = document.getElementById('modal-sucesso');
    if (modalSucesso) {
        modalSucesso.style.display = 'flex';
        setTimeout(() => {
            modalSucesso.style.display = 'none';
            window.location.href = 'resultado.html';
        }, 2000);
    } else {
        alert('Voto registrado com sucesso!');
        window.location.href = 'resultado.html';
    }
}