// =========================================================
// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// =========================================================
const btnHome = document.getElementById('btn-home');
const btnCompliance = document.getElementById('btn-compliance');
const btnLoginMenu = document.getElementById('btn-login');
const conteudoPrincipal = document.getElementById('conteudo-principal');

const SERVICE_ID = "service_6gq5cku";
const TEMPLATE_ID = "template_ryqja5c";
const BLACKLIST_COMPLIANCE = ['porra', 'caralho', 'merda', 'puta', 'idiota', 'pqp'];

let usuarioLogado = null; 

const htmlHome = `
    <div id="boas-vindas" class="fade-in">
        <h2>Bem-vindo ao Portal Educacional</h2>
        <p>Utilize o menu lateral para gerenciar suas turmas, atividades e conteúdos com segurança.</p>
    </div>
`;

// =========================================================
// 2. FUNÇÕES DE APOIO (CÓDIGOS E EMAIL)
// =========================================================

function gerarCodigoProfessor() {
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const num = Math.floor(1000 + Math.random() * 9000); 
    const letra = letras.charAt(Math.floor(Math.random() * letras.length));
    return `PROF-${num}${letra}`;
}

function gerarCodigoConvite() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function gerarPinVerificacao() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function enviarEmailReal(nome, emailDestino, pin) {
    const params = { nome: nome, pin: pin, email_to: emailDestino.toLowerCase().trim() };
    try {
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
        alert(`Código enviado com sucesso para ${emailDestino}`);
        return true;
    } catch (error) {
        alert("Erro ao enviar o e-mail de verificação.");
        return false;
    }
}

function fazerLogout() {
    if (confirm("Deseja encerrar sua sessão atual?")) {
        usuarioLogado = null;
        btnLoginMenu.textContent = "Login/Cadastro";
        conteudoPrincipal.innerHTML = htmlHome;
    }
}

// =========================================================
// 3. DASHBOARD GERAL (ROTEAMENTO)
// =========================================================

function renderizarDashboard() {
    if (!usuarioLogado) return mostrarLogin();
    btnLoginMenu.textContent = "Meu Painel";

    if (usuarioLogado.tipo === 'professor') {
        renderizarProfessor();
    } else {
        renderizarAluno();
    }
}

// =========================================================
// 4. MÓDULO DO PROFESSOR
// =========================================================

async function renderizarProfessor() {
    conteudoPrincipal.innerHTML = `
        <div class="dashboard fade-in">
            <div class="dash-header">
                <div>
                    <h2>Painel do Professor</h2>
                    <p>Docente: <strong>${usuarioLogado.nome}</strong></p>
                    <span class="badge-id">SUA IDENTIFICAÇÃO: ${usuarioLogado.codigo_identificacao}</span>
                </div>
                <div class="dash-nav-btns">
                    <button onclick="abrirModalCriarTurma()" class="btn-acao">+ Criar Nova Turma</button>
                    <button onclick="fazerLogout()" class="btn-logout">Sair</button>
                </div>
            </div>
            <h3 style="margin-bottom:15px; color:var(--dark-green);">Suas Turmas Ativas</h3>
            <div id="lista-turmas" class="grid-cards">Carregando...</div>
        </div>
    `;
    
    const { data: turmas } = await _supabase.from('turmas').select('*').eq('professor_id', usuarioLogado.id);
    const container = document.getElementById('lista-turmas');
    
    if (turmas && turmas.length > 0) {
        container.innerHTML = turmas.map(t => `
            <div class="card-item">
                <h3>${t.nome}</h3>
                <p class="desc-texto">${t.descricao || 'Sem descrição.'}</p>
                <div class="info-tag">Convite: <strong>${t.codigo_convite}</strong></div>
                <button onclick="gerenciarTurma(${t.id}, '${t.nome}')" class="btn-pequeno">Gerenciar Turma</button>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<p class="aviso-vazio">Você ainda não criou turmas.</p>`;
    }
}

function abrirModalCriarTurma() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in" style="max-width: 550px;">
            <div class="form-header">
                <h2>Nova Turma</h2>
                <p>Preencha os detalhes para gerar o código de convite.</p>
            </div>
            <form id="form-criar-turma">
                <div class="form-group">
                    <label>Nome da Turma / Disciplina:</label>
                    <input type="text" id="t-nome" required placeholder="Ex: Programação I">
                </div>
                <div class="form-group">
                    <label>Descrição:</label>
                    <textarea id="t-desc" rows="3" placeholder="Informações gerais sobre a turma..."></textarea>
                </div>
                <div class="form-row" style="display:flex; gap:10px;">
                    <div class="form-group" style="flex:1;">
                        <label>Cód. Convite:</label>
                        <input type="text" id="t-convite" value="${gerarCodigoConvite()}" readonly>
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Confirme seu ID Prof:</label>
                        <input type="text" id="t-id-prof" placeholder="${usuarioLogado.codigo_identificacao}" required>
                    </div>
                </div>
                <button type="submit" class="btn-enviar">Gravar e Publicar Turma</button>
                <button type="button" onclick="renderizarProfessor()" class="btn-logout" style="background:#888; width:100%; margin-top:10px;">Cancelar</button>
            </form>
        </div>
    `;

    document.getElementById('form-criar-turma').onsubmit = async (e) => {
        e.preventDefault();
        if (document.getElementById('t-id-prof').value.trim() !== usuarioLogado.codigo_identificacao) {
            return alert("Erro: ID de Professor não confere!");
        }

        const { error } = await _supabase.from('turmas').insert([{
            nome: document.getElementById('t-nome').value,
            descricao: document.getElementById('t-desc').value,
            codigo_convite: document.getElementById('t-convite').value,
            professor_id: usuarioLogado.id
        }]);

        if (error) alert("Erro ao salvar: " + error.message);
        else { alert("Turma criada!"); renderizarProfessor(); }
    };
}

// =========================================================
// 5. MÓDULO DO ALUNO
// =========================================================

async function renderizarAluno() {
    conteudoPrincipal.innerHTML = `
        <div class="dashboard fade-in">
            <div class="dash-header">
                <div>
                    <h2>Painel do Aluno</h2>
                    <p>Aluno(a): <strong>${usuarioLogado.nome}</strong></p>
                </div>
                <div class="dash-nav-btns">
                    <button onclick="abrirModalEntrarTurma()" class="btn-acao" style="background:#2980b9;">+ Entrar em Turma</button>
                    <button onclick="fazerLogout()" class="btn-logout">Sair</button>
                </div>
            </div>
            <h3 style="margin-bottom:15px; color:#2980b9;">Minhas Matrículas</h3>
            <div id="lista-turmas-aluno" class="grid-cards">Carregando...</div>
        </div>
    `;

    // 1. Busca os IDs das turmas vinculadas ao aluno
    const { data: vinculos, error: errV } = await _supabase.from('turma_alunos').select('turma_id').eq('aluno_id', usuarioLogado.id);

    const container = document.getElementById('lista-turmas-aluno');
    if (errV) return container.innerHTML = "Erro ao buscar vínculos.";
    if (!vinculos || vinculos.length === 0) {
        return container.innerHTML = `<p class="aviso-vazio">Você ainda não está em nenhuma turma. Utilize o código de convite do professor.</p>`;
    }

    // 2. Busca os detalhes dessas turmas
    const ids = vinculos.map(v => v.turma_id);
    const { data: turmas, error: errT } = await _supabase.from('turmas').select('*').in('id', ids);

    if (errT) return container.innerHTML = "Erro ao buscar detalhes das turmas.";

    container.innerHTML = turmas.map(t => `
        <div class="card-item" style="border-top-color:#2980b9;">
            <h3>${t.nome}</h3>
            <p class="desc-texto">${t.descricao || 'Sem descrição.'}</p>
            <button onclick="verAtividadesAluno(${t.id}, '${t.nome}')" class="btn-pequeno" style="background:#2980b9;">Ver Atividades</button>
        </div>
    `).join('');
}

function abrirModalEntrarTurma() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in" style="max-width: 500px;">
            <div class="form-header">
                <h2>Participar de uma Turma</h2>
                <p>Insira o código de convite de 6 dígitos.</p>
            </div>
            <form id="form-entrar-turma">
                <div class="form-group">
                    <label>Código da Turma:</label>
                    <input type="text" id="t-codigo-busca" required placeholder="Ex: A1B2C3" maxlength="6" style="text-align:center; font-size:1.8rem; text-transform: uppercase;">
                </div>
                <button type="submit" class="btn-enviar" style="background:#2980b9;">Confirmar Matrícula</button>
                <button type="button" onclick="renderizarAluno()" class="btn-cancelar">Cancelar</button>
            </form>
        </div>
    `;

    document.getElementById('form-entrar-turma').onsubmit = async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('t-codigo-busca').value.toUpperCase().trim();

        // Verificar se turma existe
        const { data: turma } = await _supabase.from('turmas').select('id, nome').eq('codigo_convite', codigo).maybeSingle();

        if (!turma) return alert("Código inválido! Nenhuma turma encontrada.");

        // Verificar se já está matriculado
        const { data: existe } = await _supabase.from('turma_alunos').select('id').eq('turma_id', turma.id).eq('aluno_id', usuarioLogado.id).maybeSingle();

        if (existe) {
            alert("Você já faz parte desta turma!");
            renderizarAluno();
            return;
        }

        // Criar vínculo
        const { error } = await _supabase.from('turma_alunos').insert([{ turma_id: turma.id, aluno_id: usuarioLogado.id }]);

        if (error) alert("Erro: " + error.message);
        else { alert(`Bem-vindo à turma: ${turma.nome}`); renderizarAluno(); }
    };
}

// =========================================================
// 6. LOGIN E CADASTRO
// =========================================================

function mostrarLogin() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Acessar Portal</h2>
            <form id="form-executar">
                <div class="form-group"><label>E-mail:</label><input type="email" id="l-email" required></div>
                <div class="form-group"><label>Senha:</label><input type="password" id="l-senha" required></div>
                <button type="submit" class="btn-enviar">Entrar</button>
            </form>
            <p class="trocar-form">Não tem conta? <a href="#" id="link-cadastrar">Cadastre-se</a></p>
        </div>
    `;
    adicionarEventosForm();
}

function mostrarCadastro() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Criar Cadastro</h2>
            <form id="form-executar">
                <div class="form-group"><label>Nome Completo:</label><input type="text" id="c-nome" required></div>
                <div class="form-group"><label>E-mail:</label><input type="email" id="c-email" required placeholder="professor@ifpr.edu.br"></div>
                <div class="form-group"><label>Senha:</label><input type="password" id="c-senha" required></div>
                <div class="form-group">
                    <label>Perfil:</label>
                    <select id="tipo-usuario">
                        <option value="aluno">Aluno</option>
                        <option value="professor">Professor (E-mail @ifpr.edu.br)</option>
                    </select>
                </div>
                <button type="submit" class="btn-enviar">Solicitar Código de Ativação</button>
            </form>
            <p class="trocar-form"><a href="#" id="link-login">Já tenho conta</a></p>
        </div>
    `;
    adicionarEventosForm();
}

function adicionarEventosForm() {
    const form = document.getElementById('form-executar');
    if (!form) return;

    document.getElementById('link-cadastrar')?.addEventListener('click', (e) => { e.preventDefault(); mostrarCadastro(); });
    document.getElementById('link-login')?.addEventListener('click', (e) => { e.preventDefault(); mostrarLogin(); });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const nomeInput = document.getElementById('c-nome');

        if (nomeInput) { // CADASTRO
            const email = document.getElementById('c-email').value.toLowerCase().trim();
            const tipo = document.getElementById('tipo-usuario').value;
            const senha = document.getElementById('c-senha').value;

            if (tipo === 'professor' && !email.includes('ifpr.edu.br')) {
                return alert("Erro: Professores devem usar e-mail institucional @ifpr.edu.br");
            }

            const pin = gerarPinVerificacao();
            const codProf = (tipo === 'professor') ? gerarCodigoProfessor() : null;
            
            if (await enviarEmailReal(nomeInput.value, email, pin)) {
                mostrarTelaValidacao(email, pin, nomeInput.value, tipo, senha, codProf);
            }
        } else { // LOGIN
            const email = document.getElementById('l-email').value.toLowerCase().trim();
            const senha = document.getElementById('l-senha').value;
            const { data } = await _supabase.from('usuarios').select('*').eq('email', email).eq('senha', senha).single();
            if (data) { usuarioLogado = data; renderizarDashboard(); }
            else alert("Credenciais incorretas.");
        }
    };
}

function mostrarTelaValidacao(email, pinCorreto, nome, tipo, senha, codProf) {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Verificar E-mail</h2>
            <p style="text-align:center">Código enviado para: <strong>${email}</strong></p>
            <input type="text" id="input-pin" maxlength="6" style="text-align:center; font-size:2rem; width:100%; margin: 20px 0;">
            <button id="btn-confirmar-pin" class="btn-enviar">Ativar Minha Conta</button>
        </div>
    `;
    document.getElementById('btn-confirmar-pin').onclick = async () => {
        if (document.getElementById('input-pin').value === pinCorreto) {
            const { error } = await _supabase.from('usuarios').insert([{ nome, email, senha, tipo, codigo_identificacao: codProf, email_validado: true }]);
            if (!error) { alert("Sucesso! Conta ativada."); mostrarLogin(); }
            else alert("Erro ao salvar: " + error.message);
        } else alert("Código inválido!");
    };
}

// =========================================================
// 7. GESTÃO DE CONTEÚDO E COMPLIANCE
// =========================================================

function gerenciarTurma(id, nome) {
    conteudoPrincipal.innerHTML = `
        <div class="dashboard fade-in">
            <button onclick="renderizarProfessor()" class="btn-voltar">⬅ Voltar</button>
            <h2>Gestão: ${nome}</h2>
            <div class="gestao-container" style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;">
                <section class="card-gestao" style="border:1px solid #ddd; padding:15px; border-radius:8px;">
                    <h3>Lista de Alunos</h3>
                    <div id="res-alunos">Buscando alunos...</div>
                </section>
                <section class="card-gestao" style="border:1px solid #ddd; padding:15px; border-radius:8px;">
                    <h3>Cronograma / Atividades</h3>
                    <p>Em breve: gerenciamento de datas.</p>
                </section>
            </div>
        </div>
    `;
    carregarAlunosProfessor(id);
}

async function carregarAlunosProfessor(idTurma) {
    const { data } = await _supabase.from('turma_alunos').select('usuarios(nome, email)').eq('turma_id', idTurma);
    const res = document.getElementById('res-alunos');
    if (data && data.length > 0) {
        res.innerHTML = data.map(item => `<div style="padding:5px; border-bottom:1px solid #eee;">${item.usuarios.nome} <small>(${item.usuarios.email})</small></div>`).join('');
    } else {
        res.innerHTML = "Nenhum aluno matriculado.";
    }
}

function verAtividadesAluno(id, nome) {
    alert("Funcionalidade de Atividades em breve para a turma: " + nome);
}

btnHome.onclick = (e) => { e.preventDefault(); conteudoPrincipal.innerHTML = htmlHome; };
btnLoginMenu.onclick = (e) => { e.preventDefault(); usuarioLogado ? renderizarDashboard() : mostrarLogin(); };
btnCompliance.onclick = (e) => { e.preventDefault(); mostrarCompliance(); };

function mostrarCompliance() {
    conteudoPrincipal.innerHTML = `
        <div class="dashboard fade-in">
            <h2>🛡️ Monitor de Compliance AI</h2>
            <textarea id="text-monitor" placeholder="Insira o texto para analisar..." style="width:100%; height:120px; padding:15px; margin:15px 0; border-radius:8px;"></textarea>
            <button onclick="analisarTexto()" class="btn-enviar">Verificar Segurança</button>
            <div id="res-c" style="margin-top:20px;"></div>
        </div>
    `;
}
function analisarTexto() {
    const t = document.getElementById('text-monitor').value.toLowerCase();
    const res = document.getElementById('res-c');
    const erro = BLACKLIST_COMPLIANCE.some(p => t.includes(p));
    res.innerHTML = erro ? `<div class="alerta-perigo" style="background:#f8d7da; color:#721c24; padding:15px; border-radius:8px;">⚠️ Risco Detectado: Linguagem imprópria.</div>` : `<div class="alerta-sucesso" style="background:#d4edda; color:#155724; padding:15px; border-radius:8px;">✅ Conteúdo Seguro.</div>`;
}