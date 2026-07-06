// =========================================================
// 1. CONFIGURAÇÕES E ESTADO GLOBAL
// =========================================================
const principal = document.getElementById('conteudo-principal');
const btnHome = document.getElementById('btn-home');
const btnLoginMenu = document.getElementById('btn-login');

let usuarioLogado = JSON.parse(localStorage.getItem('usuarioSessao')) || null;
const getID = (obj) => obj ? obj.id : null;

const SERVICE_ID = "service_6gq5cku";
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
        if (tipo === 'professor' && !email.includes('ifpr.edu.br')) return alert("Use @ifpr.edu.br");
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, { nome, pin, email_to: email });
            mostrarValidacaoPin(email, pin, nome, tipo, senha);
        } catch (e) { alert("Erro e-mail."); }
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

    const { data: turmas } = await _supabase.from('turmas').select('*').eq('professor_id', getID(usuarioLogado));
    const container = document.getElementById('lista-turmas');
    if (turmas) {
        container.innerHTML = turmas.map(t => `
            <div class="card-item">
                <h3>${t.nome}</h3>
                <span class="info-tag">Código: ${t.codigo_convite}</span>
                <button onclick="gerenciarTurma(${t.id}, '${t.nome}')" class="btn-pequeno">Gerenciar</button>
            </div>`).join('');
    }
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
    const { data: ag } = await _supabase.from('cronograma_professor').select('*').eq('turma_id', turmaId).order('data', {ascending:true});
    const { data: it } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);
    document.getElementById('res-cronograma').innerHTML = ag?.map(a => `<div class="item-cronograma"><span>${a.data} - ${a.titulo}</span><button onclick="excluirItem(${a.id}, 'ag', ${turmaId})">🗑️</button></div>`).join('') || "---";
    const render = (i) => `<div class="item-cronograma"><span>${i.titulo}</span><div><button onclick='editarItem(${JSON.stringify(i)})'>✏️</button><button onclick="excluirItem(${i.id}, 'at', ${turmaId})">🗑️</button></div></div>`;
    document.getElementById('res-atividades').innerHTML = it?.filter(x => x.tipo === 'tarefa').map(render).join('') || "---";
    document.getElementById('res-materiais').innerHTML = it?.filter(x => x.tipo !== 'tarefa').map(render).join('') || "---";
}

function abrirModalConteudo(turmaId, modo, item = null) {
    document.body.appendChild(document.getElementById('tpl-modal-conteudo').content.cloneNode(true));
    const modal = document.querySelector('.modal-overlay');
    const sel = document.getElementById('at-tp');
    if(modo==='atividade') { sel.innerHTML=`<option value="tarefa">Tarefa</option>`; document.getElementById('grp-prazo').style.display="block"; }
    else { sel.innerHTML=`<option value="link">Link</option><option value="video">Vídeo</option><option value="pdf">PDF</option>`; document.getElementById('grp-prazo').style.display="none"; }
    if(item){ document.getElementById('at-t').value=item.titulo; document.getElementById('at-u').value=item.url_midia||""; sel.value=item.tipo; }
    document.getElementById('form-c').onsubmit = async (e) => {
        e.preventDefault();
        const p = { turma_id: turmaId, titulo: document.getElementById('at-t').value, tipo: sel.value, url_midia: document.getElementById('at-u').value, data_entrega: document.getElementById('at-d').value || null };
        item ? await _supabase.from('atividades').update(p).eq('id', item.id) : await _supabase.from('atividades').insert([p]);
        modal.remove(); carregarDadosGestao(turmaId);
    };
    document.getElementById('btn-f-modal').onclick = () => modal.remove();
}

function editarItem(item) { abrirModalConteudo(item.turma_id, item.tipo==='tarefa'?'atividade':'material', item); }

// =========================================================
// AGENDAR (ROBUSTO COM SELEÇÃO DE ALUNO)
// =========================================================
async function abrirModalAgendar(turmaId) {
    const clone = document.getElementById('tpl-modal-agendar').content.cloneNode(true);
    
    // 1. Carregar Atividades para vínculo
    const { data: at } = await _supabase.from('atividades').select('id, titulo').eq('turma_id', turmaId);
    const selVinc = clone.querySelector('#ag-vinc-ativ');
    at?.forEach(a => { const o = document.createElement('option'); o.value=a.id; o.textContent=a.titulo; selVinc.appendChild(o); });

    // 2. Carregar Alunos da Turma para o seletor de destino
    const { data: alunos } = await _supabase.from('turma_alunos').select('aluno_id, usuarios(nome)').eq('turma_id', turmaId);
    const selAlunos = clone.querySelector('#ag-sel-aluno');
    alunos?.forEach(a => {
        const o = document.createElement('option');
        o.value = a.aluno_id;
        o.textContent = `Apenas para: ${a.usuarios.nome}`;
        selAlunos.appendChild(o);
    });

    document.body.appendChild(clone);
    const modal = document.querySelector('.modal-overlay');

    document.getElementById('form-ag').onsubmit = async (e) => {
        e.preventDefault();
        const destino = document.getElementById('ag-sel-aluno').value;
        const payload = { 
            turma_id: turmaId, 
            titulo: document.getElementById('ag-t').value, 
            data: document.getElementById('ag-d-ini').value, 
            data_fim: document.getElementById('ag-d-fim').value, 
            hora_inicio: document.getElementById('ag-h1').value, 
            hora_fim: document.getElementById('ag-h2').value, 
            atividade_vinculada_id: document.getElementById('ag-vinc-ativ').value || null,
            aluno_id: destino === 'geral' ? null : destino
        };
        await _supabase.from('cronograma_professor').insert([payload]);
        modal.remove(); carregarDadosGestao(turmaId);
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
    const { data: ag } = await _supabase.from('cronograma_professor').select('*').eq('turma_id', id).or(`aluno_id.is.null,aluno_id.eq.${getID(usuarioLogado)}`);
    const { data: it } = await _supabase.from('atividades').select('*').eq('turma_id', id);
    
    document.getElementById('l-ag-prof').innerHTML = ag?.map(a => `<div class="item-cronograma"><strong>${a.data}</strong>: ${a.titulo}</div>`).join('') || "Vazio";
    document.getElementById('l-mt-prof').innerHTML = it?.map(a => `<div class="item-cronograma"><span>${a.titulo}</span> ${a.url_midia ? `<a href="${a.url_midia}" target="_blank" style="color:#2980b9; font-weight:bold; text-decoration:none;">Abrir</a>` : ''}</div>`).join('') || "Vazio";
}

async function excluirItem(id, tipo, tId) {
    if(!confirm("Excluir?")) return;
    await _supabase.from(tipo==='ag'?'cronograma_professor':'atividades').delete().eq('id', id);
    carregarDadosGestao(tId);
}

btnHome.onclick = () => { carregarTela('tpl-home'); if (usuarioLogado) btnLoginMenu.textContent = "Meu Painel"; };
btnLoginMenu.onclick = renderizarDashboard;