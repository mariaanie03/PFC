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
            return;
        }

        if (tipo === 'professor' && !email.includes('ifpr.edu.br')) {
            return alert("Use @ifpr.edu.br");
        }

        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        try {
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

    const { data: turmas } = await _supabase.from('turmas').select('*').eq('professor_id', getID(usuarioLogado));

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

    desenharTurmas(turmas);

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
    const { data: al } = await _supabase.from('turma_alunos').select('aluno_id, usuarios(nome)').eq('turma_id', turmaId);
    const containerAlunos = document.getElementById('res-alunos');
    if (containerAlunos) containerAlunos.innerHTML = al?.map(a => `<div style="padding:6px; border-bottom:1px solid #eee; font-size:0.8rem;">👤 ${a.usuarios.nome}</div>`).join('') || "Vazio";

    const corGeral = "#6a8239"; 
    const paletaCores = ['#2196f3', '#9c27b0', '#ff9800', '#e91e63', '#00bcd4', '#f44336', '#673ab7', '#3f51b5', '#009688'];
    const nomesMap = {};
    const coresPorAluno = {};

    al?.forEach((aluno, index) => {
        nomesMap[aluno.aluno_id] = aluno.usuarios.nome;
        coresPorAluno[aluno.aluno_id] = paletaCores[index % paletaCores.length];
    });

    const { data: ag } = await _supabase.from('cronograma').select('*').eq('turma_id', turmaId).order('data', {ascending:true});
    const { data: it } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);

    const containerCronograma = document.getElementById('res-cronograma');
    if (containerCronograma) {
        containerCronograma.innerHTML = ag?.map(a => {
            const corFinal = a.aluno_id ? coresPorAluno[a.aluno_id] : corGeral;
            const labelDestino = a.aluno_id ? `👤 ${nomesMap[a.aluno_id] || 'Aluno'}` : "👥 Geral";
            return `
                <div class="item-cronograma" style="display:flex; flex-direction:column; align-items:flex-start; gap:5px; padding:12px; border-left: 8px solid ${corFinal}; margin-bottom:10px; background:#fff; border-radius:8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.7rem; font-weight:bold; color:white; background:${corFinal}; padding:3px 10px; border-radius:20px; text-transform: uppercase;">${labelDestino}</span>
                        <div style="display:flex; gap:8px;">
                            <button onclick='editarAgendamento(${JSON.stringify(a)})' style="border:none; background:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                            <button onclick="excluirItem(${a.id}, 'cronograma', ${turmaId})" style="border:none; background:none; cursor:pointer; font-size:1.1rem;">🗑️</button>
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

    const renderPadrao = (i) => `
        <div class="item-cronograma">
            <span>${i.titulo}</span>
            <div style="display:flex; gap:5px;">
                <button onclick='editarItem(${JSON.stringify(i)})' style="border:none; background:none; cursor:pointer;">✏️</button>
                <button onclick="excluirItem(${i.id || i['eu ia']}, 'atividades', ${turmaId})" style="border:none; background:none; cursor:pointer;">🗑️</button>
            </div>
        </div>`;

    document.getElementById('res-atividades').innerHTML = it?.filter(x => x.tipo === 'tarefa').map(renderPadrao).join('') || "---";
    document.getElementById('res-materiais').innerHTML = it?.filter(x => x.tipo !== 'tarefa').map(renderPadrao).join('') || "---";

// --- LÓGICA DE SEPARAÇÃO: PENDENTES VS CORRIGIDAS ---
    const { data: entregas } = await _supabase.from('progresso_aluno')
        .select(`id, resposta_url, nota, feedback, usuarios!inner(nome), cronograma(titulo, turma_id)`)
        .eq('cronograma.turma_id', turmaId);

    const containerPendentes = document.getElementById('res-pendentes');
    const containerCorrigidas = document.getElementById('res-corrigidas');

    if (containerPendentes && containerCorrigidas) {
        // Filtramos em dois grupos
        const listaPendentes = entregas?.filter(e => e.nota === null) || [];
        const listaCorrigidas = entregas?.filter(e => e.nota !== null) || [];

        // 1. Renderiza Pendentes (Fundo cinza para trabalho, botões de ação)
        containerPendentes.innerHTML = listaPendentes.map(e => `
            <div class="card-item" style="border-top-color: #f39c12; font-size: 0.8rem;">
                <strong style="color: var(--dark-green);">${e.usuarios?.nome}</strong>
                <p>📌 Entrega: <b>${e.cronograma?.titulo}</b></p>
                <a href="${e.resposta_url}" target="_blank" style="display:block; margin:8px 0; color:#2980b9; font-weight:bold;">🔗 Abrir Trabalho do Aluno</a>
                
                <div style="background: #f9f9f9; padding: 10px; border-radius: 10px; border: 1px solid #eee;">
                    <div class="form-group">
                        <label>Nota (0-10):</label>
                        <input type="number" id="n-${e.id}" style="width:100%; padding:5px;">
                    </div>
                    <div class="form-group">
                        <label>Feedback:</label>
                        <textarea id="f-${e.id}" style="width:100%; font-size:0.75rem; height: 40px;"></textarea>
                    </div>
                    <button onclick="salvarCorrecao(${e.id})" class="btn-enviar" style="padding:8px; font-size:0.8rem; background:#27ae60;">Salvar Correção</button>
                </div>
            </div>`).join('') || "<p style='font-size:0.8rem;'>Nenhuma atividade pendente.</p>";

        // 2. Renderiza Corrigidas (O design "Card Verde" que você pediu)
        containerCorrigidas.innerHTML = listaCorrigidas.map(e => `
            <div class="card-item" style="border-top: 5px solid #27ae60; background: #fafffa; padding: 15px; border-radius: 12px; font-size: 0.8rem;">
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                    <span>✅</span>
                    <strong style="color: #27ae60;">Corrigido: ${e.usuarios?.nome}</strong>
                </div>
                <p>Atividade: <b>${e.cronograma?.titulo}</b></p>
                <div style="margin-top: 10px;">
                    <label style="font-size: 0.65rem; font-weight: bold; color: #555; display: block;">NOTA ATRIBUÍDA:</label>
                    <div style="background: white; padding: 5px; border-radius: 5px; border: 1px solid #eee; font-size: 1rem; font-weight: bold; color: #27ae60;">${e.nota}</div>
                </div>
                <div style="margin-top: 10px;">
                    <label style="font-size: 0.65rem; font-weight: bold; color: #555; display: block;">FEEDBACK ENVIADO:</label>
                    <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #eee; font-size: 0.8rem; color: #333; font-style: italic;">${e.feedback || "Sem comentários."}</div>
                </div>
                <button onclick="recorrigir(${e.id}, ${e.nota}, '${e.feedback || ''}')" class="btn-acao-micro" style="width:100%; margin-top:10px; background:#555;">Alterar Nota</button>
            </div>`).join('') || "<p style='font-size:0.8rem;'>Nenhuma atividade corrigida ainda.</p>";
    }
    }
       

async function salvarCorrecao(progressoId) {
    const nota = document.getElementById(`n-${progressoId}`).value;
    const feedback = document.getElementById(`f-${progressoId}`).value;
    if(!nota) return alert("Insira uma nota!");

    const { error } = await _supabase.from('progresso_aluno').update({ nota, feedback }).eq('id', progressoId);
    
    if (error) alert("Erro: " + error.message);
    else {
        alert("✅ Nota Salva!");
        // Pega o ID da turma que está na tela no momento para atualizar as listas
        const tituloGestao = document.getElementById('txt-g-nome').innerText;
        carregarDadosGestao(usuarioLogado.turma_atual_id); 
    }
}

function abrirModalConteudo(turmaId, modo, item = null) {
    const clone = document.getElementById('tpl-modal-conteudo').content.cloneNode(true);
    document.body.appendChild(clone);
    const modal = document.querySelector('.modal-overlay');
    const formulario = modal.querySelector('#form-c');
    const sel = modal.querySelector('#at-tp');
    const tituloModal = modal.querySelector('#mod-c-titulo');

    if(modo === 'atividade') { 
        tituloModal.innerText = "Nova Atividade";
        sel.innerHTML = `<option value="tarefa">Tarefa</option>`; 
        modal.querySelector('#grp-prazo').style.display = "block"; 
    } else { 
        tituloModal.innerText = "Novo Material";
        sel.innerHTML = `<option value="link">Link</option><option value="pdf">PDF</option>`; 
        modal.querySelector('#grp-prazo').style.display = "none"; 
    }

    if(item) { 
        tituloModal.innerText = "Editar Item";
        modal.querySelector('#at-t').value = item.titulo; 
        modal.querySelector('#at-desc').value = item.descricao || ""; 
        modal.querySelector('#at-u').value = item.url_midia || ""; 
        sel.value = item.tipo; 
        if(item.data_entrega) modal.querySelector('#at-d').value = item.data_entrega;
    }

    modal.querySelector('#btn-f-modal').onclick = () => modal.remove();
    formulario.onsubmit = async (e) => {
        e.preventDefault();
        const p = { turma_id: turmaId, titulo: modal.querySelector('#at-t').value, descricao: modal.querySelector('#at-desc').value, tipo: sel.value, url_midia: modal.querySelector('#at-u').value, data_entrega: modal.querySelector('#at-d').value || null };
        const idKey = item && item.id ? 'id' : 'eu ia';
        const idValue = item ? (item.id || item['eu ia']) : null;
        if(item) await _supabase.from('atividades').update(p).eq(idKey, idValue);
        else await _supabase.from('atividades').insert([p]);
        modal.remove(); carregarDadosGestao(turmaId);
    };
}

function editarItem(item) { abrirModalConteudo(item.turma_id, item.tipo==='tarefa'?'atividade':'material', item); }

async function abrirModalAgendar(turmaId, item = null) {
    const clone = document.getElementById('tpl-modal-agendar').content.cloneNode(true);
    const { data: alunos } = await _supabase.from('turma_alunos').select('aluno_id, usuarios(nome)').eq('turma_id', turmaId);
    const selAlunos = clone.querySelector('#ag-sel-aluno');
    alunos?.forEach(a => { const o = document.createElement('option'); o.value = a.aluno_id; o.textContent = `Individual: ${a.usuarios.nome}`; selAlunos.appendChild(o); });

    const { data: atividades } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);
    const selAtividades = clone.querySelector('#ag-vinc-ativ');
    atividades?.forEach(ativ => { const o = document.createElement('option'); o.value = ativ.id || ativ['eu ia']; o.textContent = ativ.titulo; selAtividades.appendChild(o); });

    document.body.appendChild(clone);
    const modal = document.querySelector('.modal-overlay');
    if (item) {
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

    document.getElementById('form-ag').onsubmit = async (e) => {
        e.preventDefault();
        const payload = { turma_id: turmaId, titulo: document.getElementById('ag-t').value, data: document.getElementById('ag-d-ini').value, data_fim: document.getElementById('ag-d-fim').value, hora_inicio: document.getElementById('ag-h1').value, hora_fim: document.getElementById('ag-h2').value, aluno_id: document.getElementById('ag-sel-aluno').value === 'geral' ? null : document.getElementById('ag-sel-aluno').value, atividade_vinculada_id: document.getElementById('ag-vinc-ativ').value || null, conteudo_estudo: document.getElementById('ag-conteudo').value, link_material: document.getElementById('ag-link').value, atividades_descricao: document.getElementById('ag-ativ-desc').value };
        if (item) await _supabase.from('cronograma').update(payload).eq('id', item.id);
        else await _supabase.from('cronograma').insert([payload]);
        modal.remove(); carregarDadosGestao(turmaId);
    };
    document.getElementById('btn-f-agenda').onclick = () => modal.remove();
}

function editarAgendamento(item) { abrirModalAgendar(item.turma_id, item); }

// =========================================================
// 4. MÓDULO ALUNO
// =========================================================
async function renderizarAluno() {
    carregarTela('tpl-dash-aluno');
    document.getElementById('txt-n-aluno').innerText = `Estudante: ${usuarioLogado.nome}`;
    document.getElementById('btn-l-aluno').onclick = () => { localStorage.removeItem('usuarioSessao'); location.reload(); };
    document.getElementById('btn-e-turma').onclick = async () => {
        const cod = prompt("Código:");
        if(cod) {
            const {data} = await _supabase.from('turmas').select('id').eq('codigo_convite', cod.toUpperCase()).single();
            if(data) { await _supabase.from('turma_alunos').insert([{ turma_id: data.id, aluno_id: getID(usuarioLogado) }]); renderizarAluno(); }
        }
    };
    const { data: v } = await _supabase.from('turma_alunos').select('turma_id, turmas(nome)').eq('aluno_id', getID(usuarioLogado));
    document.getElementById('lista-turmas-aluno').innerHTML = v?.map(x => `
        <div class="card-item" style="border-top-color:#2980b9;">
            <h3>${x.turmas.nome}</h3>
            <button onclick="verMateriaisAluno(${x.turma_id}, '${x.turmas.nome}')" class="btn-pequeno" style="background:#2980b9;">Acessar</button>
        </div>`).join('');
}

async function verMateriaisAluno(id, nome) {
    carregarTela('tpl-materiais-aluno');
    document.getElementById('txt-m-nome').innerText = nome;
    document.getElementById('btn-v-est').onclick = renderizarAluno;
    
    // 1. Busca cronograma e atividades
    const { data: ag } = await _supabase.from('cronograma').select('*').eq('turma_id', id).or(`aluno_id.is.null,aluno_id.eq.${getID(usuarioLogado)}`).order('data', {ascending: true});
    const { data: it } = await _supabase.from('atividades').select('*').eq('turma_id', id);
    
    // 2. Busca todo o progresso do aluno nesta turma (Notas e Entregas)
    const { data: progresso } = await _supabase.from('progresso_aluno').select('*').eq('aluno_id', getID(usuarioLogado));

    // Função auxiliar para achar a nota de um item específico
    const acharNota = (idItem, tipo) => {
        const p = progresso?.find(x => tipo === 'crono' ? x.cronograma_id === idItem : x.atividade_id === idItem);
        if (!p) return "";
        return p.nota !== null ? `<span style="background:#27ae60; color:white; padding:2px 6px; border-radius:5px; font-size:0.7rem; margin-left:10px;">Nota: ${p.nota}</span>` : `<span style="background:#f39c12; color:white; padding:2px 6px; border-radius:5px; font-size:0.7rem; margin-left:10px;">Pendente</span>`;
    };

    // Renderizar Cronograma
    document.getElementById('l-ag-prof').innerHTML = ag?.map(a => `
        <div class="item-cronograma">
            <div style="flex:1"><small>${a.data}</small><br><strong>${a.titulo}</strong> ${acharNota(a.id, 'crono')}</div>
            <button id="btn-ver-${a.id}" class="btn-acao-micro">Ver tudo</button>
        </div>`).join('') || "Vazio";

    ag?.forEach(a => { const btn = document.getElementById(`btn-ver-${a.id}`); if(btn) btn.onclick = () => abrirDetalhesAluno(a); });

    // Renderizar Materiais
    document.getElementById('l-mt-prof').innerHTML = it?.filter(x => x.tipo !== 'tarefa').map(a => `
        <div class="item-cronograma"><span>${a.titulo}</span>${a.url_midia ? `<a href="${a.url_midia}" target="_blank" class="btn-acao-micro">Abrir</a>` : ''}</div>
    `).join('') || "Vazio";

    // Renderizar Atividades (Com nota na lista)
    document.getElementById('l-at-prof').innerHTML = it?.filter(x => x.tipo === 'tarefa').map(a => `
        <div class="item-cronograma">
            <div style="flex:1"><strong>${a.titulo}</strong> ${acharNota(a.id || a['eu ia'], 'ativ')}</div>
            <button onclick='abrirModalEnvio(${JSON.stringify(a)})' class="btn-acao-micro" style="background: #27ae60;">📤 Enviar</button>
        </div>
    `).join('') || "Vazio";
}

async function abrirDetalhesAluno(item) {
    const clone = document.getElementById('tpl-modal-detalhes-agendamento').content.cloneNode(true);
    document.body.appendChild(clone);
    const modal = document.querySelector('.modal-overlay');
    
    // Preenche os dados básicos do cronograma
    modal.querySelector('#det-titulo').innerText = item.titulo;
    modal.querySelector('#det-data').innerText = `📅 Dia: ${item.data} | ⏰ Horário: ${item.hora_inicio} às ${item.hora_fim}`;
    modal.querySelector('#det-conteudo').innerText = item.conteudo_estudo || "O professor não descreveu o conteúdo.";
    modal.querySelector('#det-atividades').innerText = item.atividades_descricao || "Não há atividades específicas descritas.";

    if (item.link_material) { 
        modal.querySelector('#area-link').style.display = "block"; 
        modal.querySelector('#det-link').href = item.link_material; 
    }

    const secaoEntrega = modal.querySelector('#secao-entrega');

    // Busca se já existe entrega do aluno
    const { data: entrega } = await _supabase.from('progresso_aluno')
        .select('*')
        .eq('aluno_id', getID(usuarioLogado))
        .eq('cronograma_id', item.id)
        .maybeSingle();

    if (entrega) {
        // DESIGN SEGUINDO A FOTO (Card com borda superior verde)
        let htmlStatus = `
            <div class="card-item" style="border-top: 5px solid #27ae60; background: #fafffa; padding: 20px; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-top: 15px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                    <span style="font-size: 1.2rem;">✅</span>
                    <strong style="color: #27ae60; font-size: 1rem;">Atividade Corrigida</strong>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 0.75rem; font-weight: bold; color: #555; text-transform: uppercase; display: block; margin-bottom: 5px;">Sua Nota (0-10):</label>
                    <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #eee; font-size: 1.3rem; font-weight: bold; color: #27ae60;">
                        ${entrega.nota !== null ? entrega.nota : '--'}
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 0.75rem; font-weight: bold; color: #555; text-transform: uppercase; display: block; margin-bottom: 5px;">Feedback / Comentário do Professor:</label>
                    <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #eee; font-size: 0.9rem; color: #333; line-height: 1.4; font-style: italic;">
                        ${entrega.feedback ? `"${entrega.feedback}"` : "O professor não deixou comentários adicionais."}
                    </div>
                </div>

                <div style="text-align: right; border-top: 1px solid #eee; padding-top: 10px;">
                    <a href="${entrega.resposta_url}" target="_blank" style="font-size: 0.8rem; color: #2980b9; text-decoration: none; font-weight: bold; display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
                        🔗 Ver o arquivo que eu enviei
                    </a>
                </div>
            </div>
        `;

        // Se ainda não houver nota, ajustamos o texto do status
        if (entrega.nota === null) {
            htmlStatus = htmlStatus.replace('Atividade Corrigida', 'Aguardando Correção');
            htmlStatus = htmlStatus.replace('border-top: 5px solid #27ae60', 'border-top: 5px solid #f39c12'); // Laranja se pendente
            htmlStatus = htmlStatus.replace('✅', '⏳');
        }

        secaoEntrega.innerHTML = htmlStatus;
        secaoEntrega.style.background = "transparent";
        secaoEntrega.style.border = "none";
        secaoEntrega.style.padding = "0";

    } else {
        // Caso não tenha entregue, mantém o formulário original (pontilhado)
        modal.querySelector('#btn-enviar-estudo').onclick = async () => {
            const url = modal.querySelector('#link-estudante').value;
            if(!url) return alert("Insira o link!");
            
            const { error } = await _supabase.from('progresso_aluno').upsert([{ 
                aluno_id: getID(usuarioLogado), 
                cronograma_id: item.id, 
                resposta_url: url, 
                concluido: true, 
                data_conclusao: new Date().toISOString() 
            }], { onConflict: 'aluno_id, cronograma_id' });
            
            if(error) alert("Erro: " + error.message); 
            else { alert("Enviado com sucesso!"); modal.remove(); }
        };
    }
    modal.querySelector('#btn-fechar-detalhes').onclick = () => modal.remove();
}

async function abrirModalEnvio(atividade) {
    const idAtiv = atividade.id || atividade['eu ia'];
    
    // Verifica se já existe entrega
    const { data: entrega } = await _supabase.from('progresso_aluno')
        .select('*')
        .eq('aluno_id', getID(usuarioLogado))
        .eq('atividade_id', idAtiv)
        .maybeSingle();

    const clone = document.getElementById('tpl-modal-enviar-atividade').content.cloneNode(true);
    document.body.appendChild(clone);
    const modal = document.querySelector('.modal-overlay');
    modal.querySelector('#env-nome-at').innerText = atividade.titulo;
    
    const form = document.getElementById('form-envio-aluno');

    if (entrega) {
        // Se já entregou, esconde o formulário e mostra a nota/feedback
        form.innerHTML = `
            <div style="text-align:center; padding: 15px; background: #f0f7f0; border-radius: 10px; border: 1px solid #27ae60;">
                <p style="color:#27ae60; font-weight:bold;">✓ Atividade Entregue</p>
                <a href="${entrega.resposta_url}" target="_blank" style="font-size:0.85rem; color:#2980b9;">Ver meu envio</a>
                <hr style="margin:10px 0; opacity:0.1;">
                ${entrega.nota !== null ? `
                    <p style="font-size:1.2rem; color:#27ae60;"><b>Nota: ${entrega.nota}</b></p>
                    <p style="font-style:italic; font-size:0.85rem; color:#555;">"${entrega.feedback || 'Sem feedback adicional'}"</p>
                ` : `<p style="font-size:0.85rem; color:#666;">Aguardando correção do professor...</p>`}
            </div>
            <button type="button" id="btn-f-envio-2" class="btn-cancelar" style="margin-top:10px;">Fechar</button>
        `;
        document.getElementById('btn-f-envio-2').onclick = () => modal.remove();
    } else {
        // Se não entregou, mantém o formulário original
        document.getElementById('btn-f-envio').onclick = () => modal.remove();
        form.onsubmit = async (e) => {
            e.preventDefault();
            const url = document.getElementById('env-url').value;
            const { error } = await _supabase.from('progresso_aluno').upsert([{ 
                atividade_id: idAtiv, 
                aluno_id: getID(usuarioLogado), 
                concluido: true, 
                data_conclusao: new Date().toISOString(), 
                resposta_url: url 
            }], { onConflict: 'aluno_id, atividade_id' });

            if(error) alert("Erro: " + error.message);
            else { alert("Enviado com sucesso!"); modal.remove(); verMateriaisAluno(atividade.turma_id, ""); }
        };
    }
}

// =========================================================
// 5. FUNÇÕES AUXILIARES
// =========================================================
async function excluirItem(id, tabela, turmaId) {
    if(confirm("Deseja excluir este item?")) {
        await _supabase.from(tabela).delete().eq('id', id);
        carregarDadosGestao(turmaId);
    }
}

btnHome.onclick = () => { carregarTela('tpl-home'); if (usuarioLogado) btnLoginMenu.textContent = "Meu Painel"; };
btnLoginMenu.onclick = renderizarDashboard;