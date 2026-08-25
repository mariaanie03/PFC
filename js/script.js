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
    const { data: al } = await _supabase.from('turma_alunos').select('aluno_id, usuarios(nome)').eq('turma_id', turmaId);
    document.getElementById('res-alunos').innerHTML = al?.map(a => `<div style="padding:6px; border-bottom:1px solid #eee; font-size:0.8rem;">👤 ${a.usuarios.nome}</div>`).join('') || "Vazio";
    const { data: ag } = await _supabase.from('cronograma').select('*').eq('turma_id', turmaId).order('data', {ascending:true});
    const { data: it } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);
    document.getElementById('res-cronograma').innerHTML = ag?.map(a => `<div class="item-cronograma"><span>${a.dados} - ${a.titulo}</span><button onclick="excluirItem(${a.id}, 'ag', ${turmaId})">🗑️</button></div>`).join('') || "---";
    const render = (i) => `<div class="item-cronograma"><span>${i.titulo}</span><div><button onclick='editarItem(${JSON.stringify(i)})'>✏️</button><button onclick="excluirItem(${i.id}, 'at', ${turmaId})">🗑️</button></div></div>`;
    document.getElementById('res-atividades').innerHTML = it?.filter(x => x.tipo === 'tarefa').map(render).join('') || "---";
    document.getElementById('res-materiais').innerHTML = it?.filter(x => x.tipo !== 'tarefa').map(render).join('') || "---";
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
async function abrirModalAgendar(turmaId) {
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

    // 2. Carregar Atividades existentes para vincular
    const { data: atividades } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);
    const selAtividades = clone.querySelector('#ag-vinc-ativ');
    if (atividades && selAtividades) {
        atividades.forEach(ativ => {
            const o = document.createElement('option');
            o.value = ativ['eu ia'] || ativ.id; 
            o.textContent = ativ.titulo;
            selAtividades.appendChild(o);
        });
    }

    document.body.appendChild(clone);
    const modal = document.querySelector('.modal-overlay');
    const formulario = document.getElementById('form-ag');

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
            // NOVOS CAMPOS ABAIXO:
            conteudo_estudo: document.getElementById('ag-conteudo').value,
            link_material: document.getElementById('ag-link').value,
            atividades_descricao: document.getElementById('ag-ativ-desc').value
        };

        const { error } = await _supabase.from('cronograma').insert([payload]);
        
        if (error) {
            alert("Erro ao gravar: " + error.message);
        } else {
            alert("Agendamento finalizado com sucesso!");
            modal.remove(); 
            carregarDadosGestao(turmaId);
        }
    };

    document.getElementById('btn-f-agenda').onclick = () => modal.remove();
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
    
    // Aluno vê itens "gerais" (null) ou específicos dele
    const { data: ag } = await _supabase.from('cronograma').select('*').eq('turma_id', id).or(`aluno_id.is.null,aluno_id.eq.${getID(usuarioLogado)}`);
    const { data: it } = await _supabase.from('atividades').select('*').eq('turma_id', id);
    
    document.getElementById('l-ag-prof').innerHTML = ag?.map(a => `<div class="item-cronograma"><strong>${a.data}</strong>: ${a.titulo}</div>`).join('') || "Vazio";
    document.getElementById('l-mt-prof').innerHTML = it?.map(a => `<div class="item-cronograma"><span>${a.titulo}</span> ${a.url_midia ? `<a href="${a.url_midia}" target="_blank" style="color:#2980b9; font-weight:bold; text-decoration:none;">Abrir</a>` : ''}</div>`).join('') || "Vazio";
}

async function excluirItem(id, tipo, tId) {
    if(!confirm("Excluir?")) return;
    await _supabase.from(tipo==='ag'?'cronograma':'atividades').delete().eq('id', id);
    carregarDadosGestao(tId);
}

btnHome.onclick = () => { carregarTela('tpl-home'); if (usuarioLogado) btnLoginMenu.textContent = "Meu Painel"; };
btnLoginMenu.onclick = renderizarDashboard;