// ATENÇÃO: Coloque aqui a URL que a Vercel gerou para o seu Backend
const API_URL = 'https://eleicoesdigitais-back-git-main-leticiaa2008s-projects.vercel.app/';

document.addEventListener('DOMContentLoaded', () => {
    carregarCandidatos();
    configurarModais();
});

// Procura os candidatos na API da Vercel (que vem da tabela candidates do Supabase)
async function carregarCandidatos() {
    // Procura os containers comuns do seu HTML
    const container = document.getElementById('cards-container') 
                   || document.getElementById('candidates-grid') 
                   || document.querySelector('.candidates-grid');

    if (!container) return;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erro ao conectar com o backend');

        const candidates = await response.json();
        
        if (!candidates || candidates.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum candidato cadastrado no Supabase.</p>';
            return;
        }

        renderizarCandidatos(candidates, container);
    } catch (error) {
        console.error('Erro ao carregar candidatos:', error);
        container.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">
            Erro ao carregar os candidatos. Verifique a URL do Backend e o Supabase.
        </p>`;
    }
}

// Monta os cards dinamicamente na tela
function renderizarCandidatos(candidates, container) {
    container.innerHTML = '';

    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'candidate-card'; // ou 'card'
        
        // Mapeia os campos da tabela "candidates" do seu Supabase
        const nome = candidate.name || candidate.nome || 'Candidato';
        const numero = candidate.number || candidate.numero || candidate.id;
        const foto = candidate.avatar_url || candidate.foto || 'assets/icon.svg';
        const partido = candidate.party || candidate.partido || '';

        card.innerHTML = `
            <img src="${foto}" alt="${nome}" onerror="this.src='assets/icon.svg'">
            <h3>${nome}</h3>
            <p>${partido ? partido + ' - ' : ''}Número: ${numero}</p>
            <button class="btn btn-votar" onclick="confirmarVoto('${candidate.id}', '${nome}')">Votar</button>
        `;
        container.appendChild(card);
    });
}

// Função de Envio do Voto para a Vercel / Supabase
async function enviarVoto(candidateId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ candidateId })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Voto registrado com sucesso!');
            window.location.href = 'resultado.html';
        } else {
            alert(`Erro ao computar voto: ${data.error || 'Tente novamente'}`);
        }
    } catch (error) {
        console.error('Erro na requisição de voto:', error);
        alert('Erro ao conectar ao servidor para registrar o voto.');
    }
}

// Controle de Confirmação
let idCandidatoSelecionado = null;

function confirmarVoto(id, nome) {
    idCandidatoSelecionado = id;
    const modal = document.getElementById('modal-confirmacao');
    const modalNome = document.getElementById('modal-candidato-nome');
    
    if (modalNome) modalNome.innerText = nome;
    if (modal) {
        modal.style.display = 'flex';
    } else {
        if (confirm(`Deseja confirmar o voto em ${nome}?`)) {
            enviarVoto(id);
        }
    }
}

function configurarModais() {
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const modalConfirmacao = document.getElementById('modal-confirmacao');

    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            if (modalConfirmacao) modalConfirmacao.style.display = 'none';
            if (idCandidatoSelecionado) enviarVoto(idCandidatoSelecionado);
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            if (modalConfirmacao) modalConfirmacao.style.display = 'none';
            idCandidatoSelecionado = null;
        });
    }
}