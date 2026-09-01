// =========================================================
// 1. CONFIGURAÇÕES E ESTADO GLOBAL
// =========================================================
const principal = document.getElementById('conteudo-principal');
const btnHome = document.getElementById('btn-home');
const btnLoginMenu = document.getElementById('btn-login');

let usuarioLogado = JSON.parse(localStorage.getItem('usuarioSessao')) || null;
const getID = (obj) => obj ? obj.id : null;

const SERVICE_ID = "service_gvptgt4";
const TEMPLATE_ID = "template_ryqja5c";

function carregarTela(templateId) {
    const tpl = document.getElementById(templateId);
    if (!tpl) return console.error("Template não encontrado:", templateId);
    principal.innerHTML = "";
    principal.appendChild(tpl.content.cloneNode(true));
}

document.addEventListener('DOMContentLoaded', () => {
    if (usuarioLogado) renderizarDashboard();
    else carregarTela('tpl-home');
});

// =========================================================
// 2. AUTENTICAÇÃO E LOGIN
// =========================================================
function renderizarDashboard() {
    if (!usuarioLogado) { mostrarLogin(); return; }
    btnLoginMenu.textContent = "Meu Painel";
    usuarioLogado.tipo === 'professor' ? renderizarProfessor() : renderizarAluno();
}

function mostrarLogin() {
    carregarTela('tpl-login');
    document.getElementById('link-cadastrar').onclick = (e) => { e.preventDefault(); mostrarCadastro(); };
    document.getElementById('link-recuperar').onclick = (e) => { e.preventDefault(); mostrarTelaRecuperar(); };

    document.getElementById('form-login').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('l-email').value.toLowerCase().trim();
        const senha = document.getElementById('l-senha').value;
        const { data } = await _supabase.from('usuarios').select('*').eq('email', email).eq('senha', senha).maybeSingle();
        if (data) {
            usuarioLogado = data;
            localStorage.setItem('usuarioSessao', JSON.stringify(data));
            renderizarDashboard();
        } else alert("Dados inválidos.");
    };
}

// RECUPERAÇÃO E CADASTRO (Omitidos para brevidade, mas mantidos no fluxo)
function mostrarTelaRecuperar() {
    carregarTela('tpl-recuperar-senha');
    document.getElementById('link-v-login-rec').onclick = (e) => { e.preventDefault(); mostrarLogin(); };
    document.getElementById('form-recuperar-solicitar').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('r-email').value.toLowerCase().trim();
        const { data } = await _supabase.from('usuarios').select('nome, email').eq('email', email).maybeSingle();
        if (!data) return alert("E-mail não cadastrado.");
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, { nome: data.nome, pin, email_to: email });
            mostrarTelaDefinirNovaSenha(email, pin);
        } catch (e) { alert("Erro e-mail."); }
    };
}

function mostrarTelaDefinirNovaSenha(email, pinCorreto) {
    carregarTela('tpl-nova-senha');
    document.getElementById('form-atualizar-senha').onsubmit = async (e) => {
        e.preventDefault();
        if (document.getElementById('r-pin').value !== pinCorreto) return alert("PIN errado.");
        await _supabase.from('usuarios').update({ senha: document.getElementById('r-nova-senha').value }).eq('email', email);
        alert("Senha alterada!"); mostrarLogin();
    };
}

function mostrarCadastro() {
    carregarTela('tpl-cadastro');
    document.getElementById('link-v-login').onclick = (e) => { e.preventDefault(); mostrarLogin(); };
    
    document.getElementById('form-cadastro').onsubmit = async (e) => {
        e.preventDefault();
        const nome = document.getElementById('c-nome').value;
        const email = document.getElementById('c-email').value.toLowerCase().trim();
        const tipo = document.getElementById('tipo-usuario').value;
        const senha = document.getElementById('c-senha').value;

        // --- VALIDAÇÃO DE SENHA FORTE ---
        const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        

        if (!regexSenha.test(senha)) {
            alert("A senha deve conter no mínimo:\n- 8 caracteres\n- Uma letra maiúscula\n- Uma letra minúscula\n- Um número");
            return; // Interrompe a execução aqui
        }
        // --------------------------------

        if (tipo === 'professor' && !email.includes('ifpr.edu.br')) {
            return alert("Use @ifpr.edu.br");
        }

        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            // Se passou na validação da senha, envia o e-mail
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, { nome, pin, email_to: email });
            mostrarValidacaoPin(email, pin, nome, tipo, senha);
        } catch (e) { 
            alert("Erro ao enviar e-mail de confirmação."); 
        }
    };
}

function mostrarValidacaoPin(email, pinCorreto, nome, tipo, senha) {
    carregarTela('tpl-pin');
    document.getElementById('btn-v-pin').onclick = async () => {
        if (document.getElementById('input-pin').value === pinCorreto) {
            await _supabase.from('usuarios').insert([{ nome, email, senha, tipo, email_validado: true }]);
            alert("Ativado!"); mostrarLogin();
        } else alert("PIN errado.");
    };
}

// =========================================================
// 3. MÓDULO PROFESSOR
// =========================================================
async function renderizarProfessor() {
    carregarTela('tpl-dash-professor');
    document.getElementById('txt-n-prof').innerText = `Docente: ${usuarioLogado.nome}`;
    document.getElementById('btn-logout').onclick = () => { localStorage.removeItem('usuarioSessao'); location.reload(); };
    document.getElementById('btn-n-turma').onclick = abrirModalCriarTurma;

    const container = document.getElementById('lista-turmas');
    const inputBusca = document.getElementById('busca-turma');

    // 1. Buscar todas as turmas do professor do banco de dados
    const { data: turmas } = await _supabase.from('turmas').select('*').eq('professor_id', getID(usuarioLogado));

    // 2. Função interna para desenhar os cards na tela
    const desenharTurmas = (listaFiltrada) => {
        if (!listaFiltrada || listaFiltrada.length === 0) {
            container.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhuma turma encontrada.</p>";
            return;
        }
        container.innerHTML = listaFiltrada.map(t => `
            <div class="card-item">
                <h3>${t.nome}</h3>
                <span class="info-tag">Código: ${t.codigo_convite}</span>
                <button onclick="gerenciarTurma(${t.id}, '${t.nome}')" class="btn-pequeno">Gerenciar</button>
            </div>`).join('');
    };

    // 3. Renderização inicial (mostra tudo)
    desenharTurmas(turmas);

    // 4. Evento de busca (Filtro em tempo real)
    inputBusca.oninput = () => {
        const termo = inputBusca.value.toLowerCase().trim();
        const filtradas = turmas.filter(t => 
            t.nome.toLowerCase().includes(termo) || 
            t.codigo_convite.toLowerCase().includes(termo)
        );
        desenharTurmas(filtradas);
    };
}

function abrirModalCriarTurma() {
    document.body.appendChild(document.getElementById('tpl-modal-criar-turma').content.cloneNode(true));
    const modal = document.querySelector('.modal-overlay');
    document.getElementById('btn-cancelar-turma').onclick = () => modal.remove();
    document.getElementById('form-criar-turma').onsubmit = async (e) => {
        e.preventDefault();
        const p = { nome: document.getElementById('turma-nome').value, codigo_convite: Math.random().toString(36).substring(7).toUpperCase(), professor_id: getID(usuarioLogado) };
        await _supabase.from('turmas').insert([p]);
        modal.remove(); renderizarProfessor();
    };
}

async function gerenciarTurma(turmaId, nomeTurma) {
    carregarTela('tpl-gestao-turma');
    document.getElementById('txt-g-nome').innerText = `Gestão: ${nomeTurma}`;
    document.getElementById('btn-v-prof').onclick = renderizarProfessor;
    document.getElementById('btn-agendar').onclick = () => abrirModalAgendar(turmaId);
    document.getElementById('btn-add-ativ').onclick = () => abrirModalConteudo(turmaId, 'atividade');
    document.getElementById('btn-add-mat').onclick = () => abrirModalConteudo(turmaId, 'material');
    carregarDadosGestao(turmaId);
}

async function carregarDadosGestao(turmaId) {
    // 1. Busca os alunos
    const { data: al } = await _supabase.from('turma_alunos').select('aluno_id, usuarios(nome)').eq('turma_id', turmaId);
    
    const containerAlunos = document.getElementById('res-alunos');
    if (containerAlunos) {
        containerAlunos.innerHTML = al?.map(a => `<div style="padding:6px; border-bottom:1px solid #eee; font-size:0.8rem;">👤 ${a.usuarios.nome}</div>`).join('') || "Vazio";
    }

    // --- NOVA LÓGICA DE CORES POR ÍNDICE (À PROVA DE ERROS) ---
    const corGeral = "#6a8239"; 
    const paletaCores = [
        '#2196f3', // Azul
        '#9c27b0', // Roxo
        '#ff9800', // Laranja
        '#e91e63', // Rosa
        '#00bcd4', // Ciano
        '#f44336', // Vermelho
        '#673ab7', // Indigo
        '#3f51b5', // Azul Escuro
        '#009688'  // Teal
    ];

    const nomesMap = {};
    const coresPorAluno = {};

    // Aqui garantimos que cada aluno da lista receba uma cor diferente da paleta
    al?.forEach((aluno, index) => {
        nomesMap[aluno.aluno_id] = aluno.usuarios.nome;
        // O primeiro aluno pega a cor 0, o segundo a cor 1...
        coresPorAluno[aluno.aluno_id] = paletaCores[index % paletaCores.length];
    });

    // 2. Busca Cronograma e Atividades
    const { data: ag } = await _supabase.from('cronograma').select('*').eq('turma_id', turmaId).order('data', {ascending:true});
    const { data: it } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);

    // 3. Renderiza o Cronograma
    const containerCronograma = document.getElementById('res-cronograma');
    if (containerCronograma) {
        containerCronograma.innerHTML = ag?.map(a => {
            // Se tiver aluno_id, pega a cor dele no mapa, senão usa a cor geral
            const corFinal = a.aluno_id ? coresPorAluno[a.aluno_id] : corGeral;
            const labelDestino = a.aluno_id ? `👤 ${nomesMap[a.aluno_id] || 'Aluno'}` : "👥 Geral";

            return `
                <div class="item-cronograma" style="display:flex; flex-direction:column; align-items:flex-start; gap:5px; padding:12px; border-left: 8px solid ${corFinal}; margin-bottom:10px; background:#fff; border-radius:8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.7rem; font-weight:bold; color:white; background:${corFinal}; padding:3px 10px; border-radius:20px; text-transform: uppercase;">
                            ${labelDestino}
                        </span>
                        <div style="display:flex; gap:8px;">
                            <button onclick='editarAgendamento(${JSON.stringify(a)})' style="border:none; background:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                            <button onclick="excluirItem(${a.id}, 'ag', ${turmaId})" style="border:none; background:none; cursor:pointer; font-size:1.1rem;">🗑️</button>
                        </div>
                    </div>
                    <strong style="font-size:1rem; color:#222; margin-top:5px;">${a.titulo}</strong>
                    <div style="display:flex; gap:12px; font-size:0.8rem; color:#555; margin-top:3px;">
                        <span>📅 ${a.data || '---'}</span>
                        <span>⏰ ${a.hora_inicio || '--:--'}</span>
                    </div>
                </div>`;
        }).join('') || "Nenhum agendamento.";
    }

    // 4. Renderiza Atividades e Materiais
    const renderPadrao = (i) => `
        <div class="item-cronograma">
            <span>${i.titulo}</span>
            <div style="display:flex; gap:5px;">
                <button onclick='editarItem(${JSON.stringify(i)})' style="border:none; background:none; cursor:pointer;">✏️</button>
                <button onclick="excluirItem(${i.id || i['eu ia']}, 'at', ${turmaId})" style="border:none; background:none; cursor:pointer;">🗑️</button>
            </div>
        </div>`;

    const containerAtiv = document.getElementById('res-atividades');
    if (containerAtiv) containerAtiv.innerHTML = it?.filter(x => x.tipo === 'tarefa').map(renderPadrao).join('') || "---";

    const containerMat = document.getElementById('res-materiais');
    if (containerMat) containerMat.innerHTML = it?.filter(x => x.tipo !== 'tarefa').map(renderPadrao).join('') || "---";

    // ... dentro de carregarDadosGestao(turmaId) ...

// 5. Buscar Entregas (Progresso)
const { data: entregas } = await _supabase
    .from('progresso_aluno')
    .select(`
        id, 
        resposta_url, 
        nota, 
        feedback, 
        data_conclusao,
        usuarios(nome),
        cronograma(titulo),
        atividades(titulo)
    `)
    .or(`cronograma_id.not.is.null, atividade_id.not.is.null`);

const containerEntregas = document.getElementById('res-entregas');
if (containerEntregas) {
    containerEntregas.innerHTML = entregas?.map(e => {
        const tituloTarefa = e.cronograma?.titulo || e.atividades?.titulo || "Tarefa sem título";
        const notaAtual = e.nota !== null ? e.nota : "";
        const feedbackAtual = e.feedback || "";

        return `
            <div class="card-item" style="border-top-color: #f39c12; font-size: 0.85rem;">
                <strong style="color: var(--dark-green);">${e.usuarios.nome}</strong>
                <p>📌 <b>${tituloTarefa}</b></p>
                <a href="${e.resposta_url}" target="_blank" style="color: #2980b9; display:block; margin: 5px 0;">🔗 Ver Trabalho</a>
                <hr style="opacity: 0.2; margin: 10px 0;">
                
                <div class="form-group">
                    <label>Nota:</label>
                    <input type="number" id="nota-${e.id}" value="${notaAtual}" placeholder="0-10" step="0.1" style="padding: 5px;">
                </div>
                <div class="form-group">
                    <label>Feedback:</label>
                    <textarea id="feedback-${e.id}" rows="2" style="font-size: 0.8rem;">${feedbackAtual}</textarea>
                </div>
                <button onclick="salvarCorrecao(${e.id})" class="btn-acao-micro" style="width: 100%; background: #27ae60;">Salvar Correção</button>
            </div>
        `;
    }).join('') || "<p>Nenhuma entrega realizada ainda.</p>";
}
}

function abrirModalConteudo(turmaId, modo, item = null) {
    // 1. Cria o clone do template
    const clone = document.getElementById('tpl-modal-conteudo').content.cloneNode(true);
    
    // 2. Adiciona o clone ao corpo da página antes de tentar pegar os elementos
    document.body.appendChild(clone);

    // 3. Agora que ele está na página, selecionamos o Modal e o Botão
    const modal = document.querySelector('.modal-overlay');
    const btnFechar = modal.querySelector('#btn-f-modal'); // Buscamos o botão DENTRO do modal
    const formulario = modal.querySelector('#form-c');
    const sel = modal.querySelector('#at-tp');
    const tituloModal = modal.querySelector('#mod-c-titulo');

    // Configuração de modo (Atividade ou Material)
    if(modo === 'atividade') { 
        tituloModal.innerText = "Nova Atividade";
        sel.innerHTML = `<option value="tarefa">Tarefa</option>`; 
        modal.querySelector('#grp-prazo').style.display = "block"; 
    } else { 
        tituloModal.innerText = "Novo Material";
        sel.innerHTML = `<option value="link">Link</option><option value="video">Vídeo</option><option value="pdf">PDF</option>`; 
        modal.querySelector('#grp-prazo').style.display = "none"; 
    }

    // Se estiver EDITANDO, preenche os campos
    if(item) { 
        tituloModal.innerText = "Editar Item";
        modal.querySelector('#at-t').value = item.titulo; 
        modal.querySelector('#at-desc').value = item.descricao || ""; 
        modal.querySelector('#at-u').value = item.url_midia || ""; 
        sel.value = item.tipo; 
        if(item.data_entrega) modal.querySelector('#at-d').value = item.data_entrega;
    }

    // --- LÓGICA DO BOTÃO FECHAR ---
    btnFechar.onclick = () => {
        modal.remove();
    };

    // Lógica do Enviar (Salvar)
    formulario.onsubmit = async (e) => {
        e.preventDefault();
        
        const p = { 
            turma_id: turmaId, 
            titulo: modal.querySelector('#at-t').value, 
            descricao: modal.querySelector('#at-desc').value,
            tipo: sel.value, 
            url_midia: modal.querySelector('#at-u').value, 
            data_entrega: modal.querySelector('#at-d').value || null 
        };

        const idKey = item && item.id ? 'id' : 'eu ia'; // Verifica qual nome de ID o banco usa
        const idValue = item ? (item.id || item['eu ia']) : null;

        if(item) {
            await _supabase.from('atividades').update(p).eq(idKey, idValue);
        } else {
            await _supabase.from('atividades').insert([p]);
        }

        modal.remove(); 
        carregarDadosGestao(turmaId);
    };
}

function editarItem(item) { abrirModalConteudo(item.turma_id, item.tipo==='tarefa'?'atividade':'material', item); }

// =========================================================
// AGENDAR (ROBUSTO COM SELEÇÃO DE ALUNO)
// =========================================================
async function abrirModalAgendar(turmaId, item = null) {
    const clone = document.getElementById('tpl-modal-agendar').content.cloneNode(true);
    
    // 1. Carregar Alunos para o Select
    const { data: alunos } = await _supabase.from('turma_alunos').select('aluno_id, usuarios(nome)').eq('turma_id', turmaId);
    const selAlunos = clone.querySelector('#ag-sel-aluno');
    if (alunos) {
        alunos.forEach(a => {
            const o = document.createElement('option');
            o.value = a.aluno_id;
            o.textContent = `Individual: ${a.usuarios.nome}`;
            selAlunos.appendChild(o);
        });
    }

    // 2. Carregar Atividades para vincular
    const { data: atividades } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);
    const selAtividades = clone.querySelector('#ag-vinc-ativ');
    if (atividades && selAtividades) {
        atividades.forEach(ativ => {
            const o = document.createElement('option');
            o.value = ativ.id || ativ['eu ia']; 
            o.textContent = ativ.titulo;
            selAtividades.appendChild(o);
        });
    }

    document.body.appendChild(clone);
    const modal = document.querySelector('.modal-overlay');
    const formulario = document.getElementById('form-ag');
    const tituloModal = modal.querySelector('h3');

    // --- LOGICA DE PREENCHIMENTO PARA EDIÇÃO ---
    if (item) {
        tituloModal.innerText = "Editar Cronograma";
        document.getElementById('ag-t').value = item.titulo || "";
        document.getElementById('ag-d-ini').value = item.data || "";
        document.getElementById('ag-d-fim').value = item.data_fim || "";
        document.getElementById('ag-h1').value = item.hora_inicio || "";
        document.getElementById('ag-h2').value = item.hora_fim || "";
        document.getElementById('ag-conteudo').value = item.conteudo_estudo || "";
        document.getElementById('ag-link').value = item.link_material || "";
        document.getElementById('ag-ativ-desc').value = item.atividades_descricao || "";
        document.getElementById('ag-sel-aluno').value = item.aluno_id || "geral";
        document.getElementById('ag-vinc-ativ').value = item.atividade_vinculada_id || "";
    }

    formulario.onsubmit = async (e) => {
        e.preventDefault();
        
        const destino = document.getElementById('ag-sel-aluno').value;
        const atividadeId = document.getElementById('ag-vinc-ativ').value;

        const payload = { 
            turma_id: turmaId, 
            titulo: document.getElementById('ag-t').value, 
            data: document.getElementById('ag-d-ini').value, 
            data_fim: document.getElementById('ag-d-fim').value, 
            hora_inicio: document.getElementById('ag-h1').value, 
            hora_fim: document.getElementById('ag-h2').value, 
            aluno_id: destino === 'geral' ? null : destino,
            atividade_vinculada_id: atividadeId === "" ? null : atividadeId,
            conteudo_estudo: document.getElementById('ag-conteudo').value,
            link_material: document.getElementById('ag-link').value,
            atividades_descricao: document.getElementById('ag-ativ-desc').value
        };

        let erro;
        if (item) {
            // Se 'item' existe, estamos EDITANDO (UPDATE)
            const { error } = await _supabase.from('cronograma').update(payload).eq('id', item.id);
            erro = error;
        } else {
            // Se 'item' é nulo, estamos CRIANDO (INSERT)
            const { error } = await _supabase.from('cronograma').insert([payload]);
            erro = error;
        }
        
        if (erro) {
            alert("Erro ao salvar: " + erro.message);
        } else {
            alert(item ? "Cronograma atualizado!" : "Agendamento finalizado!");
            modal.remove(); 
            carregarDadosGestao(turmaId);
        }
    };

    document.getElementById('btn-f-agenda').onclick = () => modal.remove();
}
// Esta função é chamada quando você clica no botão ✏️ do cronograma
function editarAgendamento(item) {
    // Ela apenas abre o modal passando o ID da turma e os dados do item
    abrirModalAgendar(item.turma_id, item);
}
// =========================================================
// 4. MÓDULO ALUNO
// =========================================================
async function renderizarAluno() {
    carregarTela('tpl-dash-aluno');
    document.getElementById('txt-n-aluno').innerText = `Estudante: ${usuarioLogado.nome}`;
    document.getElementById('btn-l-aluno').onclick = () => { localStorage.removeItem('usuarioSessao'); location.reload(); };
    document.getElementById('btn-e-turma').onclick = () => {
        const cod = prompt("Código:");
        if(cod) _supabase.from('turmas').select('id').eq('codigo_convite', cod.toUpperCase()).single().then(({data})=>{
            if(data) _supabase.from('turma_alunos').insert([{ turma_id: data.id, aluno_id: getID(usuarioLogado) }]).then(() => renderizarAluno());
        });
    };
    const { data: v } = await _supabase.from('turma_alunos').select('turma_id').eq('aluno_id', getID(usuarioLogado));
    if(v?.length > 0) {
        const { data: t } = await _supabase.from('turmas').select('*').in('id', v.map(i => i.turma_id));
        document.getElementById('lista-turmas-aluno').innerHTML = t?.map(x => `
            <div class="card-item" style="border-top-color:#2980b9;">
                <h3>${x.nome}</h3>
                <button onclick="verMateriaisAluno(${x.id}, '${x.nome}')" class="btn-pequeno" style="background:#2980b9;">Acessar</button>
            </div>`).join('');
    }
}
async function verMateriaisAluno(id, nome) {
    carregarTela('tpl-materiais-aluno');
    document.getElementById('txt-m-nome').innerText = nome;
    document.getElementById('btn-v-est').onclick = renderizarAluno;
    
    // Busca cronograma
    const { data: ag } = await _supabase.from('cronograma')
        .select('*')
        .eq('turma_id', id)
        .or(`aluno_id.is.null,aluno_id.eq.${getID(usuarioLogado)}`)
        .order('data', {ascending: true});

    const { data: it } = await _supabase.from('atividades').select('*').eq('turma_id', id);
    

    const containerAg = document.getElementById('l-ag-prof');
    containerAg.innerHTML = ag?.map(a => `
        <div class="item-cronograma" style="display: flex; justify-content: space-between; align-items: center; border-left: 5px solid #f39c12;">
            <div>
                <small>📅 ${a.data}</small><br>
                <strong>${a.titulo}</strong>
            </div>
            <button onclick='abrirDetalhesAluno(${JSON.stringify(a)})' class="btn-acao-micro">Ver tudo</button>
        </div>
    `).join('') || "Nenhum agendamento.";




    const conteudos = it?.filter(item => item.tipo !== 'tarefa');
    document.getElementById('l-mt-prof').innerHTML = conteudos?.map(a => `
        <div class="item-cronograma" style="border-left: 4px solid #27ae60;">
            <div style="flex:1;">
                <span>${a.titulo}</span>
            </div>
            ${a.url_midia ? `<a href="${a.url_midia}" target="_blank" class="btn-acao-micro" style="text-decoration:none;">Abrir</a>` : ''}
        </div>`).join('') || "Nenhum material disponível.";

 
   const atividades = it?.filter(item => item.tipo === 'tarefa');
document.getElementById('l-at-prof').innerHTML = atividades?.map(a => `
    <div class="item-cronograma" style="border-left: 4px solid #c0392b; flex-direction: column; align-items: flex-start;">
        <div style="width: 100%; display: flex; justify-content: space-between;">
            <strong>${a.titulo}</strong>
            <span style="font-size: 0.7rem; color: #c0392b; font-weight: bold;">TAREFA</span>
        </div>
        ${a.data_entrega ? `<small>Prazo: ${a.data_entrega}</small>` : ''}
        
        <div style="margin-top: 10px; display: flex; gap: 5px; width: 100%;">
            <button onclick='abrirModalEnvio(${JSON.stringify(a)})' class="btn-acao-micro" style="background: #27ae60; flex: 1;">
                📤 Enviar Atividade
            </button>
            ${a.url_midia ? `<a href="${a.url_midia}" target="_blank" class="btn-acao-micro" style="text-decoration:none; background:#555;">Ver Instruções</a>` : ''}
        </div>
    </div>
`).join('') || "Nenhuma atividade pendente.";
}


function abrirModalEnvio(atividade) {
    const clone = document.getElementById('tpl-modal-enviar-atividade').content.cloneNode(true);
    document.body.appendChild(clone);

    const modal = document.querySelector('.modal-overlay');
    modal.querySelector('#env-nome-at').innerText = atividade.titulo;

    document.getElementById('btn-f-envio').onclick = () => modal.remove();

    document.getElementById('form-envio-aluno').onsubmit = async (e) => {
        e.preventDefault();
        const urlResposta = document.getElementById('env-url').value;

        // Salva no banco de dados Supabase na tabela progresso_aluno
        const { error } = await _supabase.from('progresso_aluno').insert([{
            atividade_id: atividade.id || atividade['eu ia'],
            aluno_id: getID(usuarioLogado),
            concluido: true,
            data_conclusao: new Date().toISOString(),
            // Se você não tiver a coluna 'resposta_url' no banco, ela deve ser criada como TEXT
            resposta_url: urlResposta 
        }]);

        if (error) {
            alert("Erro ao enviar: " + error.message);
        } else {
            alert("Atividade enviada com sucesso!");
            modal.remove();
        }
    };
}

async function salvarCorrecao(progressoId) {
    const nota = document.getElementById(`nota-${progressoId}`).value;
    const feedback = document.getElementById(`feedback-${progressoId}`).value;

    const { error } = await _supabase
        .from('progresso_aluno')
        .update({ nota, feedback })
        .eq('id', progressoId);

    if (error) alert("Erro ao salvar: " + error.message);
    else alert("✅ Correção enviada com sucesso!");
}


// =========================================================
// FUNÇÃO: ABRIR DETALHES DO CRONOGRAMA PARA O ALUNO
// =========================================================
async function abrirDetalhesAluno(item) {
    const tpl = document.getElementById('tpl-modal-detalhes-agendamento');
    const clone = tpl.content.cloneNode(true);
    document.body.appendChild(clone);

    const modal = document.querySelector('.modal-overlay');
    
    // 1. Preencher informações básicas do cronograma
    modal.querySelector('#det-titulo').innerText = item.titulo;
    modal.querySelector('#det-data').innerText = `📅 Dia: ${item.data} | ⏰ Horário: ${item.hora_inicio} às ${item.hora_fim}`;
    modal.querySelector('#det-conteudo').innerText = item.conteudo_estudo || "O professor não descreveu o conteúdo.";
    modal.querySelector('#det-atividades').innerText = item.atividades_descricao || "Não há atividades específicas descritas.";

    // 2. Mostrar link de apoio do professor (se existir)
    if (item.link_material) {
        modal.querySelector('#area-link').style.display = "block";
        modal.querySelector('#det-link').href = item.link_material;
    }

    const secaoEntrega = modal.querySelector('#secao-entrega');

    // 3. Verificar no Supabase se este aluno já entregou algo para este item do cronograma
    const { data: entregaExistente } = await _supabase
        .from('progresso_aluno')
        .select('*')
        .eq('aluno_id', getID(usuarioLogado))
        .eq('cronograma_id', item.id)
        .maybeSingle();

    if (entregaExistente) {
        // Caso já tenha entregue: Mostrar status, nota e feedback
        let statusHtml = `
            <div style="text-align: center; padding: 10px; background: #e8f4fd; border-radius: 10px;">
                <p style="color: #2980b9; font-weight: bold; margin-bottom:5px;">✓ Atividade Entregue</p>
                <a href="${entregaExistente.resposta_url}" target="_blank" style="font-size: 0.8rem; color: #2980b9;">Ver meu envio</a>
        `;

        if (entregaExistente.nota !== null) {
            statusHtml += `
                <hr style="margin: 10px 0; opacity: 0.1;">
                <p style="font-size: 1.1rem; color: #27ae60; margin-bottom:0;"><b>Nota: ${entregaExistente.nota}</b></p>
                <p style="font-style: italic; font-size: 0.85rem; color: #555; margin-top:5px;">"${entregaExistente.feedback || 'Sem feedback adicional'}"</p>
            `;
        } else {
            statusHtml += `<p style="font-size: 0.8rem; color: #666; margin-top:10px;">Aguardando correção do professor...</p>`;
        }

        statusHtml += `</div>`;
        secaoEntrega.innerHTML = statusHtml;
    } else {
        // Caso NÃO tenha entregue: Configurar o botão de envio
        const btnEnviar = modal.querySelector('#btn-enviar-estudo');
        const inputLink = modal.querySelector('#link-estudante');

        btnEnviar.onclick = async () => {
            const linkTrabalho = inputLink.value.trim();

            if (!linkTrabalho) {
                alert("Por favor, insira o link do seu trabalho.");
                return;
            }

            // Usamos UPSERT para evitar o erro de "Duplicate Key" caso o aluno tente reenviar
            const { error } = await _supabase.from('progresso_aluno').upsert([{
                aluno_id: getID(usuarioLogado),
                cronograma_id: item.id,
                resposta_url: linkTrabalho,
                concluido: true,
                data_conclusao: new Date().toISOString()
            }], { onConflict: 'aluno_id, cronograma_id' });

            if (error) {
                alert("Erro ao enviar: " + error.message);
            } else {
                alert("✅ Atividade entregue com sucesso!");
                modal.remove(); // Fecha o modal após o envio
            }
        };
    }

    // Botão Fechar Modal
    modal.querySelector('#btn-fechar-detalhes').onclick = () => modal.remove();
}
btnHome.onclick = () => { carregarTela('tpl-home'); if (usuarioLogado) btnLoginMenu.textContent = "Meu Painel"; };
btnLoginMenu.onclick = renderizarDashboard;