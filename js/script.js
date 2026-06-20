// =========================================================
// 1. CONFIGURAÇÕES E ESTADO GLOBAL
// =========================================================
const conteudoPrincipal = document.getElementById('conteudo-principal');
const btnHome = document.getElementById('btn-home');
const btnCompliance = document.getElementById('btn-compliance');
const btnLoginMenu = document.getElementById('btn-login');

const SERVICE_ID = "service_6gq5cku";
const TEMPLATE_ID = "template_ryqja5c";
const BLACKLIST = ['porra', 'caralho', 'merda', 'puta', 'idiota', 'pqp', 'foder'];

// PERSISTÊNCIA: Recupera usuário salvo no navegador
let usuarioLogado = JSON.parse(localStorage.getItem('usuarioSessao')) || null;

// Função para pegar o ID (ajustado para 'id' conforme o diagrama)
const getID = (obj) => obj ? (obj.id || obj['eu ia']) : null;

// Função Mestre para trocar de tela usando os Templates do HTML
function carregarTela(templateId) {
    const template = document.getElementById(templateId);
    if (!template) return console.error("Template não encontrado:", templateId);
    const clone = template.content.cloneNode(true);
    conteudoPrincipal.innerHTML = "";
    conteudoPrincipal.appendChild(clone);
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
    if (usuarioLogado) {
        renderizarDashboard();
    } else {
        carregarTela('tpl-home');
        btnLoginMenu.textContent = "Login/Cadastro";
    }
});

// =========================================================
// 2. NAVEGAÇÃO PRINCIPAL (LOGIN / DASHBOARD)
// =========================================================

function renderizarDashboard() {
    if (!usuarioLogado) {
        btnLoginMenu.textContent = "Login/Cadastro";
        mostrarLogin();
        return;
    }
    btnLoginMenu.textContent = "Meu Painel";
    usuarioLogado.tipo === 'professor' ? renderizarProfessor() : renderizarAluno();
}

function mostrarLogin() {
    carregarTela('tpl-login');
    const formLogin = document.getElementById('form-login');
    const linkCad = document.getElementById('link-cadastrar');
    const linkRec = document.getElementById('link-recuperar');

    if (linkCad) linkCad.onclick = (e) => { e.preventDefault(); mostrarCadastro(); };
    if (linkRec) linkRec.onclick = (e) => { e.preventDefault(); alert("Função em desenvolvimento."); };

    if (formLogin) {
        formLogin.onsubmit = async (e) => {
            e.preventDefault();
            const emailDigitado = document.getElementById('l-email').value.toLowerCase().trim();
            const senhaDigitada = document.getElementById('l-senha').value;

            // BUSCA NA TABELA 'usuarios' E COLUNA 'email' (AJUSTADO AO DIAGRAMA)
            const { data, error } = await _supabase
                .from('usuarios')
                .select('*')
                .eq('email', emailDigitado) 
                .eq('senha', senhaDigitada)
                .maybeSingle();

            if (error) {
                console.error("Erro Supabase:", error.message);
                alert("Erro ao conectar: " + error.message);
                return;
            }

            if (data) {
                usuarioLogado = data;
                localStorage.setItem('usuarioSessao', JSON.stringify(data));
                renderizarDashboard();
            } else {
                alert("E-mail ou senha incorretos.");
            }
        };
    }
}

function mostrarCadastro() {
    carregarTela('tpl-cadastro');
    const formCad = document.getElementById('form-cadastro');
    const linkVoltar = document.getElementById('link-v-login');

    if (linkVoltar) linkVoltar.onclick = (e) => { e.preventDefault(); mostrarLogin(); };

    if (formCad) {
        formCad.onsubmit = async (e) => {
            e.preventDefault();
            const nome = document.getElementById('c-nome').value;
            const email = document.getElementById('c-email').value.toLowerCase().trim();
            const tipo = document.getElementById('tipo-usuario').value;
            const senha = document.getElementById('c-senha').value;

            if (tipo === 'professor' && !email.includes('ifpr.edu.br')) {
                return alert("Erro: Professores devem usar e-mail @ifpr.edu.br");
            }

            const pinGerado = Math.floor(100000 + Math.random() * 900000).toString();
            const enviado = await enviarEmailReal(nome, email, pinGerado);
            
            if (enviado) {
                mostrarValidacaoPin(email, pinGerado, nome, tipo, senha);
            }
        };
    }
}

function mostrarValidacaoPin(email, pinCorreto, nome, tipo, senha) {
    carregarTela('tpl-pin');
    document.getElementById('msg-pin').innerText = `Digite o código enviado para: ${email}`;
    
    document.getElementById('btn-v-pin').onclick = async (e) => {
        e.preventDefault();
        const pinDigitado = document.getElementById('input-pin').value.trim();
        
        if (pinDigitado === pinCorreto) {
            const codProf = (tipo === 'professor') ? `PROF-${Math.floor(1000+Math.random()*9000)}` : null;
            
            // INSERÇÃO USANDO 'email' E 'codigo_identificacao' (AJUSTADO AO DIAGRAMA)
            const { error } = await _supabase.from('usuarios').insert([{ 
                nome: nome, 
                email: email, 
                senha: senha, 
                tipo: tipo, 
                codigo_identificacao: codProf, 
                email_validado: true 
            }]);

            if (!error) {
                alert("Cadastro ativado com sucesso!");
                mostrarLogin();
            } else {
                alert("Erro ao salvar: " + error.message);
            }
        } else {
            alert("Código incorreto!");
        }
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
    document.getElementById('btn-n-turma').onclick = abrirModalCriarTurma;

    const { data: turmas } = await _supabase.from('turmas').select('*').eq('professor_id', getID(usuarioLogado));
    const container = document.getElementById('lista-turmas');
    
    if (turmas) {
        container.innerHTML = turmas.map(t => `
            <div class="card-item">
                <h3>${t.nome}</h3>
                <div class="info-tag">Cod: ${t.codigo_convite}</div><br>
                <button onclick="gerenciarTurma(${t.id}, '${t.nome}')" class="btn-pequeno">Gerenciar</button>
            </div>`).join('');
    }
}

function abrirModalCriarTurma() {
    const clone = document.getElementById('tpl-modal-criar-turma').content.cloneNode(true);
    const modal = clone.querySelector('.modal-overlay');
    document.body.appendChild(clone);

    document.getElementById('btn-cancelar-turma').onclick = () => modal.remove();
    document.getElementById('form-criar-turma').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nome: document.getElementById('turma-nome').value,
            disciplina: document.getElementById('turma-disciplina').value,
            ano_letivo: document.getElementById('turma-ano').value,
            detalhes: document.getElementById('turma-desc').value,
            professor_assistente: document.getElementById('turma-coprofs').value,
            codigo_convite: Math.random().toString(36).substring(7).toUpperCase(),
            professor_id: getID(usuarioLogado)
        };
        const { error } = await _supabase.from('turmas').insert([payload]);
        if (!error) { modal.remove(); renderizarProfessor(); }
        else { alert("Erro: " + error.message); }
    };
}

async function gerenciarTurma(turmaId, nomeTurma) {
    carregarTela('tpl-gestao-turma');
    document.getElementById('txt-g-nome').innerText = `Gestão: ${nomeTurma}`;
    document.getElementById('btn-v-prof').onclick = renderizarProfessor;
    document.getElementById('btn-add-c').onclick = () => abrirModalConteudo(turmaId);
    document.getElementById('btn-agendar').onclick = () => abrirModalAgendar(turmaId);
    carregarDadosGestao(turmaId);
}

async function carregarDadosGestao(turmaId) {
    const { data: alunos } = await _supabase.from('turma_alunos').select('usuarios(nome)').eq('turma_id', turmaId);
    document.getElementById('res-alunos').innerHTML = alunos?.map(a => `<div style="padding:4px; font-size:0.85rem; border-bottom:1px solid #eee;">${a.usuarios.nome}</div>`).join('') || "Vazio.";

    const { data: agenda } = await _supabase.from('cronograma_professor').select('*').eq('turma_id', turmaId).order('dados', {ascending:true});
    const { data: ativ } = await _supabase.from('atividades').select('*').eq('turma_id', turmaId);

    const renderItem = (item, type) => `
        <div class="item-cronograma">
            <span>${item.titulo}</span>
            <div>
                <button onclick='editarConteudo(${JSON.stringify(item)})'>✏️</button>
                <button onclick="excluirItem(${item.id}, '${type}', ${turmaId})">🗑️</button>
            </div>
        </div>`;

    document.getElementById('res-cronograma').innerHTML = agenda?.map(a => `<div class="item-cronograma" style="background:#fff9e6"><span>${a.dados} - ${a.titulo}</span><button onclick="excluirItem(${a.id}, 'ag', ${turmaId})">🗑️</button></div>`).join('') || "---";
    document.getElementById('res-atividades').innerHTML = ativ?.filter(a => a.tipo === 'tarefa').map(a => renderItem(a, 'at')).join('') || "---";
    document.getElementById('res-materiais').innerHTML = ativ?.filter(a => a.tipo !== 'tarefa').map(a => renderItem(a, 'at')).join('') || "---";
}

// =========================================================
// 4. MÓDULO DO ALUNO
// =========================================================

async function renderizarAluno() {
    carregarTela('tpl-dash-aluno');
    document.getElementById('txt-n-aluno').innerText = `Estudante: ${usuarioLogado.nome}`;
    document.getElementById('btn-l-aluno').onclick = fazerLogout;
    document.getElementById('btn-e-turma').onclick = abrirModalEntrarTurma;

    const { data: v } = await _supabase.from('turma_alunos').select('turma_id').eq('aluno_id', getID(usuarioLogado));
    const container = document.getElementById('lista-turmas-aluno');
    if (v && v.length > 0) {
        const { data: turmas } = await _supabase.from('turmas').select('*').in('id', v.map(i => i.turma_id));
        container.innerHTML = turmas?.map(t => `
            <div class="card-item" style="border-top-color:#2980b9;">
                <h3>${t.nome}</h3>
                <button onclick="verMateriaisAluno(${t.id}, '${t.nome}')" class="btn-pequeno" style="background:#2980b9;">Acessar</button>
            </div>`).join('');
    } else { container.innerHTML = "Sem turmas."; }
}

async function verMateriaisAluno(id, nome) {
    carregarTela('tpl-materiais-aluno');
    document.getElementById('txt-m-nome').innerText = nome;
    document.getElementById('btn-v-est').onclick = renderizarAluno;

    const { data: agenda } = await _supabase.from('cronograma_professor').select('*').eq('turma_id', id).or(`aluno_id.is.null,aluno_id.eq.${getID(usuarioLogado)}`);
    const { data: ativ } = await _supabase.from('atividades').select('*').eq('turma_id', id);

    document.getElementById('l-ag-prof').innerHTML = agenda?.map(a => `<div class="item-cronograma"><strong>${a.dados}</strong>: ${a.titulo}</div>`).join('') || "Sem horários.";
    document.getElementById('l-mt-prof').innerHTML = ativ?.map(a => `<div class="item-cronograma"><strong>${a.titulo}</strong> ${a.url_midia ? `<a href="${a.url_midia}" target="_blank">Abrir</a>` : ''}</div>`).join('') || "Vazio.";
}

function renderizarCronogramaPessoal() {
    carregarTela('tpl-cronograma-pessoal');
    document.getElementById('btn-v-crono').onclick = renderizarDashboard;
    document.getElementById('btn-s-crono').onclick = salvarCronograma;
    
    const area = document.getElementById('area-dias');
    area.innerHTML = ['S','T','Q','Q','S','S','D'].map((d, i) => `<div><input type="checkbox" id="dia-${i}" class="dia-check"><label for="dia-${i}">${d}</label></div>`).join('');

    _supabase.from('cronogramas').select('*').eq('aluno_id', getID(usuarioLogado)).maybeSingle().then(({data}) => {
        if(data) {
            document.getElementById('c-inicio').value = data.horario_inicio || "";
            document.getElementById('c-fim').value = data.horario_fim || "";
            document.getElementById('c-materias').value = data.materias || "";
            data.dias?.split(',').forEach(d => { if(document.getElementById(`dia-${d}`)) document.getElementById(`dia-${d}`).checked = true; });
        }
    });
}

// =========================================================
// 5. APOIO E UTILITÁRIOS
// =========================================================

async function enviarEmailReal(nome, email, pin) {
    try {
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, { nome, pin, email_to: email.toLowerCase().trim() });
        alert("Código enviado para " + email); return true;
    } catch (e) { alert("Erro e-mail."); return false; }
}

function fazerLogout() { localStorage.removeItem('usuarioSessao'); usuarioLogado = null; location.reload(); }

async function excluirItem(id, type, tId) {
    if(!confirm("Excluir?")) return;
    const table = type === 'ag' ? 'cronograma_professor' : 'atividades';
    await _supabase.from(table).delete().eq('id', id); 
    carregarDadosGestao(tId);
}

function abrirModalEntrarTurma() {
    const cod = prompt("Código da Turma:");
    if(cod) {
        _supabase.from('turmas').select('id').eq('codigo_convite', cod.toUpperCase()).single().then(({data}) => {
            if(data) _supabase.from('turma_alunos').insert([{ turma_id: data.id, aluno_id: getID(usuarioLogado) }]).then(() => renderizarAluno());
            else alert("Código Inválido");
        });
    }
}

async function salvarCronograma() {
    const dias = [];
    document.querySelectorAll('.dia-check:checked').forEach(el => dias.push(el.id.split('-')[1]));
    await _supabase.from('cronogramas').upsert({ aluno_id: getID(usuarioLogado), dias: dias.join(','), horario_inicio: document.getElementById('c-inicio').value, horario_fim: document.getElementById('c-fim').value, materias: document.getElementById('c-materias').value });
    alert("Salvo!");
}

function abrirModalConteudo(turmaId, at = null) {
    document.body.appendChild(document.getElementById('tpl-modal-conteudo').content.cloneNode(true));
    const modal = document.querySelector('.modal-overlay');
    if(at) { document.getElementById('at-t').value = at.titulo; document.getElementById('at-u').value = at.url_midia; }
    document.getElementById('form-c').onsubmit = async (e) => {
        e.preventDefault();
        const obj = { turma_id: turmaId, titulo: document.getElementById('at-t').value, tipo: document.getElementById('at-tp').value, url_midia: document.getElementById('at-u').value, data_entrega: document.getElementById('at-d').value || null };
        at ? await _supabase.from('atividades').update(obj).eq('id', at.id) : await _supabase.from('atividades').insert([obj]);
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
        await _supabase.from('cronograma_professor').insert([{ turma_id: turmaId, titulo: document.getElementById('ag-t').value, dados: document.getElementById('ag-d').value, 'hora_início': document.getElementById('ag-h1').value, hora_fim: document.getElementById('ag-h2').value, aluno_id: aId==='geral'?null:aId }]);
        modal.remove(); carregarDadosGestao(turmaId);
    };
    document.getElementById('btn-f-agenda').onclick = () => modal.remove();
}

const editarConteudo = (at) => abrirModalConteudo(at.turma_id, at);

// Menu lateral
btnHome.onclick = () => { carregarTela('tpl-home'); btnLoginMenu.textContent = usuarioLogado ? "Meu Painel" : "Login/Cadastro"; };
btnLoginMenu.onclick = renderizarDashboard;
btnCompliance.onclick = () => {
    carregarTela('tpl-compliance');
    document.getElementById('btn-anls').onclick = () => {
        const txt = document.getElementById('tx-c').value.toLowerCase();
        const erro = BLACKLIST.some(p => txt.includes(p));
        document.getElementById('rs-c').innerHTML = erro ? "<div class='alerta-perigo'>⚠️ Inadequado</div>" : "<div class='alerta-sucesso'>✅ Seguro</div>";
    };
};