// ==========================================
// DIGITE AQUI A URL REAL DA SUA VERCEL
// Exemplo: 'https://eleicoes-backend.vercel.app'
// ==========================================
const BASE_URL = 'https://eleicoesdigitais-back-git-main-leticiaa2008s-projects.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Apaga os cards velhos estáticos e carrega os dados do Supabase
    const cardsGrid = document.querySelector('.cards-grid');
    if (cardsGrid) {
        carregarCandidatos(cardsGrid);
    }

    // 2. Configura os modais
    setupModals();
});

// ==========================================
// BUSCA CANDIDATOS NO SUPABASE
// ==========================================
async function carregarCandidatos(container) {
    try {
        const response = await fetch(`${BASE_URL}/api`);
        if (!response.ok) throw new Error('Falha ao conectar na API');

        const candidates = await response.json();

        if (!Array.isArray(candidates) || candidates.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum candidato encontrado no banco.</p>';
            return;
        }

        // Limpa os cards de "Marina Costa", "Lucas Almeida" do HTML estático
        container.innerHTML = '';

        // Cria os cards dinâmicos com os dados do Supabase
        candidates.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'card';

            const foto = candidate.photo_url || 'assets/icon.svg';
            const num = String(candidate.number || candidate.id).padStart(2, '0');

            card.innerHTML = `
                <div class="card-header">
                    <span class="badge-numero">Nº ${num}</span>
                    <img src="${foto}" alt="${candidate.name}" class="card-img" onerror="this.src='assets/icon.svg'">
                </div>
                <div class="card-body">
                    <small class="chapa-tag">CHAPA ${num}</small>
                    <h3>${candidate.name}</h3>
                    ${candidate.slogan ? `<p class="slogan">"${candidate.slogan}"</p>` : ''}
                    <button class="btn btn-votar" onclick="iniciarVoto(${candidate.id}, '${candidate.name}')">
                        Votar
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = `<p style="grid-column: 1/-1; color: red; text-align: center;">
            Erro ao carregar os dados. Verifique se a BASE_URL no app.js está correta e se a API está no ar.
        </p>`;
    }
}

// ==========================================
// REGISTRA O VOTO VIA API
// ==========================================
async function enviarVoto(candidateId) {
    try {
        const response = await fetch(`${BASE_URL}/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ candidateId })
        });

        const result = await response.json();

        if (response.ok) {
            exibirSucesso();
        } else {
            alert('Erro ao registrar voto: ' + (result.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Erro ao conectar ao servidor para votar.');
    }
}

// ==========================================
// CONTROLE DOS MODAIS
// ==========================================
let idSelecionado = null;

function iniciarVoto(id, nome) {
    idSelecionado = id;
    const modal = document.getElementById('modal-confirmacao');
    const nomeEl = document.getElementById('modal-candidato-nome');

    if (nomeEl) nomeEl.innerText = nome;

    if (modal) {
        modal.style.display = 'flex';
    } else {
        if (confirm(`Confirmar voto em ${nome}?`)) {
            enviarVoto(id);
        }
    }
}

function setupModals() {
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const modalConfirmacao = document.getElementById('modal-confirmacao');

    if (btnConfirmar) {
        btnConfirmar.onclick = () => {
            if (modalConfirmacao) modalConfirmacao.style.display = 'none';
            if (idSelecionado) enviarVoto(idSelecionado);
        };
    }

    if (btnCancelar) {
        btnCancelar.onclick = () => {
            if (modalConfirmacao) modalConfirmacao.style.display = 'none';
            idSelecionado = null;
        };
    }
}

function exibirSucesso() {
    const modalSucesso = document.getElementById('modal-sucesso');
    if (modalSucesso) {
        modalSucesso.style.display = 'flex';
        setTimeout(() => {
            window.location.href = 'resultado.html';
        }, 2000);
    } else {
        alert('Voto registrado com sucesso!');
        window.location.href = 'resultado.html';
    }
}
