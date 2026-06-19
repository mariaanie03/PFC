// =========================================================
// 1. CONFIGURAÇÕES E INICIALIZAÇÃO
// =========================================================
const conteudoPrincipal = document.getElementById('conteudo-principal');
const btnHome = document.getElementById('btn-home');
const btnCompliance = document.getElementById('btn-compliance');
const btnLoginMenu = document.getElementById('btn-login');

const SERVICE_ID = "service_6gq5cku";
const TEMPLATE_ID = "template_ryqja5c";
const BLACKLIST = ['porra', 'caralho', 'merda', 'puta', 'idiota', 'pqp'];

let usuarioLogado = JSON.parse(localStorage.getItem('usuarioSessao')) || null;

function carregarTela(templateId) {
    const template = document.getElementById(templateId);
    if (!template) return;
    const clone = template.content.cloneNode(true);
    conteudoPrincipal.innerHTML = "";
    conteudoPrincipal.appendChild(clone);
}

document.addEventListener('DOMContentLoaded', () => {
    if (usuarioLogado) renderizarDashboard();
    else { carregarTela('tpl-home'); btnLoginMenu.textContent = "Login/Cadastro"; }
});

// =========================================================
// 2. NAVEGAÇÃO E AUTENTICAÇÃO
// =========================================================
function renderizarDashboard() {
    if (!usuarioLogado) { mostrarLogin(); return; }
    btnLoginMenu.textContent = "Meu Painel";
    usuarioLogado.tipo === 'professor' ? renderizarProfessor() : renderizarAluno();
}

function mostrarLogin() {
    carregarTela('tpl-login');
    document.getElementById('link-cadastrar').onclick = (e) => { e.preventDefault(); mostrarCadastro(); };
    document.getElementById('form-login').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('l-email').value.toLowerCase().trim();
        const senha = document.getElementById('l-senha').value;
        const { data } = await _supabase.from('usuarios').select('*').eq('email', email).eq('senha', senha).single();
        if (data) { 
            usuarioLogado = data; 
            localStorage.setItem('usuarioSessao', JSON.stringify(data)); 
            renderizarDashboard(); 
        } else alert("Acesso Negado.");
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
        if (tipo === 'professor' && !email.includes('ifpr.edu.br')) return alert("Use @ifpr.edu.br");
        
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, { nome, pin, email_to: email });
        
        carregarTela('tpl-pin');
        document.getElementById('msg-pin').innerText = `Código enviado para ${email}`;
        document.getElementById('btn-v-pin').onclick = async () => {
            if (document.getElementById('input-pin').value === pin) {
                await _supabase.from('usuarios').insert([{ nome, email, senha: document.getElementById('c-senha').value, tipo, email_validado: true }]);
                mostrarLogin();
            } else alert("Código Errado.");
        };
    };
}

// =========================================================
// 3. MÓDULO DO PROFESSOR
// =========================================================
async function renderizarProfessor() {
    carregarTela('tpl-dash-professor');
    document.getElementById('txt-n-prof').innerText = `Docente: ${usuarioLogado.nome}`;
    document.getElementById('btn-logout').onclick = fazerLogout;
    document.getElementById('btn-m-cronograma-prof').onclick = renderizarCronogramaPessoal;
    document.getElementById('btn-n-turma').onclick = () => {
        const n = prompt("Nome da Turma:");
        if(n) _supabase.from('turmas').insert([{ nome: n, codigo_convite: Math.random().toString(36).substring(7).toUpperCase(), professor_id: usuarioLogado.id }]).then(() => renderizarProfessor());
    };

    const { data: turmas } = await _supabase.from('turmas').select('*').eq('professor_id', usuarioLogado.id);
    const container = document.getElementById('lista-turmas');
    container.innerHTML = turmas?.map(t => `<div class="card-item"><h3>${t.nome}</h3><div class="info-tag">Código: ${t.codigo_convite}</div><br><button onclick="gerenciarTurma(${t.id}, '${t.nome}')" class="btn-pequeno">Gerenciar</button></div>`).join('') || "Sem turmas.";
}

async function gerenciarTurma(id, nome) {
    carregarTela('tpl-gestao-turma');
    document.getElementById('txt-g-nome').innerText = `Gestão: ${nome}`;
    document.getElementById('btn-v-prof').onclick = renderizarProfessor;
    document.getElementById('btn-add-c').onclick = () => abrirModalConteudo(id);
    document.getElementById('btn-agendar').onclick = () => abrirModalAgendar(id);
    carregarDadosGestao(id);
}

// =========================================================
// 4. MÓDULO DO ALUNO (ACESSO CORRIGIDO)
// =========================================================
async function renderizarAluno() {
    carregarTela('tpl-dash-aluno');
    document.getElementById('txt-n-aluno').innerText = `Estudante: ${usuarioLogado.nome}`;
    document.getElementById('btn-l-aluno').onclick = fazerLogout;
    document.getElementById('btn-e-turma').onclick = async () => {
        const c = prompt("Código:");
        if(!c) return;
        const { data: t } = await _supabase.from('turmas').select('id').eq('codigo_convite', c.toUpperCase()).single();
        if(t) await _supabase.from('turma_alunos').insert([{ turma_id: t.id, aluno_id: usuarioLogado.id }]).then(() => renderizarAluno());
    };

    const { data: v } = await _supabase.from('turma_alunos').select('turma_id').eq('aluno_id', usuarioLogado.id);
    const container = document.getElementById('lista-turmas-aluno');
    if(!v || v.length === 0) return container.innerHTML = "Você ainda não está em turmas.";

    const { data: turmas } = await _supabase.from('turmas').select('*').in('id', v.map(i => i.turma_id));
    container.innerHTML = turmas.map(t => `<div class="card-item" style="border-top-color:#2980b9;"><h3>${t.nome}</h3><button onclick="verMateriaisAluno(${t.id}, '${t.nome}')" class="btn-pequeno" style="background:#2980b9;">Acessar</button></div>`).join('');
}

async function verMateriaisAluno(id, nome) {
    carregarTela('tpl-materiais-aluno');
    document.getElementById('txt-m-nome').innerText = nome;
    document.getElementById('btn-v-est').onclick = renderizarAluno;

    const { data: agenda } = await _supabase.from('cronograma_professor').select('*').eq('turma_id', id).or(`aluno_id.is.null,aluno_id.eq.${usuarioLogado.id}`);
    const { data: ativ } = await _supabase.from('atividades').select('*').eq('turma_id', id);

    document.getElementById('l-ag-prof').innerHTML = agenda?.map(a => `<div class="item-cronograma"><strong>${a.data}</strong>: ${a.titulo}</div>`).join('') || "Nada agendado.";
    document.getElementById('l-mt-prof').innerHTML = ativ?.map(a => `<div class="item-cronograma"><strong>${a.titulo}</strong> ${a.url_midia ? `<a href="${a.url_midia}" target="_blank">Abrir</a>`:''}</div>`).join('') || "Vazio.";
}

// =========================================================
// 5. CRONOGRAMA PESSOAL (EDIÇÃO PELO PROFESSOR)
// =========================================================
function renderizarCronogramaPessoal() {
    carregarTela('tpl-cronograma-pessoal');
    document.getElementById('btn-v-crono').onclick = renderizarDashboard;
    document.getElementById('btn-s-crono').onclick = salvarCronograma;
    const area = document.getElementById('area-dias');
    area.innerHTML = ['S','T','Q','Q','S','S','D'].map((d, i) => `<div><input type="checkbox" id="dia-${i}" class="dia-check"><label for="dia-${i}">${d}</label></div>`).join('');

    _supabase.from('cronograma_pessoal').select('*').eq('aluno_id', usuarioLogado.id).maybeSingle().then(({data}) => {
        if(data) {
            document.getElementById('c-inicio').value = data.horario_inicio;
            document.getElementById('c-fim').value = data.horario_fim;
            document.getElementById('c-materias').value = data.materias;
            data.dias.split(',').forEach(d => { if(document.getElementById(`dia-${d}`)) document.getElementById(`dia-${d}`).checked = true; });
        }
    });
}

async function salvarCronograma() {
    const dias = [];
    document.querySelectorAll('.dia-check:checked').forEach(el => dias.push(el.id.split('-')[1]));
    await _supabase.from('cronograma_pessoal').upsert({ aluno_id: usuarioLogado.id, dias: dias.join(','), horario_inicio: document.getElementById('c-inicio').value, horario_fim: document.getElementById('c-fim').value, materias: document.getElementById('c-materias').value });
    alert("Salvo!");
}

// =========================================================
// 6. FUNÇÕES GERAIS E EXTRAS
// =========================================================
function fazerLogout() { localStorage.removeItem('usuarioSessao'); usuarioLogado = null; location.reload(); }

async function carregarDadosGestao(turmaId) {
    const { data: alunos } = await _supabase.from('turma_alunos').select('usuarios(id, nome)').eq('turma_id', turmaId);
    document.getElementById('res-alunos').innerHTML = alunos?.map(a => `<div>${a.usuarios.nome}</div>`).join('') || "Vazio.";

    const { data: ativ } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);
    const { data: agenda } = await _supabase.from('cronograma_professor').select('*, usuarios(nome)').eq('turma_id', turmaId);

    const rAt = (at) => `<div class="item-cronograma"><span>${at.titulo}</span><div><button onclick='editarAtiv(${JSON.stringify(at)})'>✏️</button><button onclick="excluir(${at.id}, 'at', ${turmaId})">🗑️</button></div></div>`;
    document.getElementById('res-cronograma').innerHTML = agenda?.map(a => `<div class="item-cronograma" style="background:#fff9e6"><span>${a.data} | ${a.titulo}</span><button onclick="excluir(${a.id}, 'ag', ${turmaId})">🗑️</button></div>`).join('') || "---";
    document.getElementById('res-atividades').innerHTML = ativ?.filter(a => a.tipo==='tarefa').map(rAt).join('') || "---";
    document.getElementById('res-materiais').innerHTML = ativ?.filter(a => a.tipo!=='tarefa').map(rAt).join('') || "---";
}

function abrirModalConteudo(turmaId, at = null) {
    document.body.appendChild(document.getElementById('tpl-modal-conteudo').content.cloneNode(true));
    const modal = document.querySelector('.modal-overlay');
    if(at) { document.getElementById('mod-c-titulo').innerText = "Editar"; document.getElementById('at-t').value = at.titulo; document.getElementById('at-tp').value = at.tipo; document.getElementById('at-u').value = at.url_midia; }
    document.getElementById('form-c').onsubmit = async (e) => {
        e.preventDefault();
        const obj = { turma_id: turmaId, titulo: document.getElementById('at-t').value, tipo: document.getElementById('at-tp').value, url_midia: document.getElementById('at-u').value, data_entrega: document.getElementById('at-d').value || null };
        if(at) await _supabase.from('atividades').update(obj).eq('id', at.id);
        else await _supabase.from('atividades').insert([obj]);
        modal.remove(); carregarDadosGestao(turmaId);
    };
    document.getElementById('btn-f-modal').onclick = () => modal.remove();
}

async function abrirModalAgendar(turmaId) {
    const clone = document.getElementById('tpl-modal-agendar').content.cloneNode(true);
    const { data: alunos } = await _supabase.from('turma_alunos').select('usuarios(id, nome)').eq('turma_id', turmaId);
    const sel = clone.querySelector('#ag-sel-aluno');
    alunos?.forEach(a => { const o = document.createElement('option'); o.value=a.usuarios.id; o.textContent=a.usuarios.nome; sel.appendChild(o); });
    document.body.appendChild(clone);
    const modal = document.querySelector('.modal-overlay');
    document.getElementById('form-ag').onsubmit = async (e) => {
        e.preventDefault();
        const aId = document.getElementById('ag-sel-aluno').value;
        await _supabase.from('cronograma_professor').insert([{ turma_id: turmaId, titulo: document.getElementById('ag-t').value, data: document.getElementById('ag-d').value, hora_inicio: document.getElementById('ag-h1').value, hora_fim: document.getElementById('ag-h2').value, aluno_id: aId==='geral'?null:aId }]);
        modal.remove(); carregarDadosGestao(turmaId);
    };
    document.getElementById('btn-f-agenda').onclick = () => modal.remove();
}

const editarAtiv = (at) => abrirModalConteudo(at.turma_id, at);
async function excluir(id, t, turmaId) { await _supabase.from(t==='ag'?'cronograma_professor':'atividades').delete().eq('id', id); carregarDadosGestao(turmaId); }

btnHome.onclick = () => { carregarTela('tpl-home'); btnLoginMenu.textContent = usuarioLogado ? "Meu Painel" : "Login/Cadastro"; };
btnLoginMenu.onclick = renderizarDashboard;
btnCompliance.onclick = () => {
    carregarTela('tpl-compliance');
    document.getElementById('btn-anls').onclick = () => {
        const erro = BLACKLIST.some(p => document.getElementById('tx-c').value.toLowerCase().includes(p));
        document.getElementById('rs-c').innerHTML = erro ? "<div class='alerta-perigo'>Inadequado</div>" : "<div class='alerta-sucesso'>Seguro</div>";
    };
};