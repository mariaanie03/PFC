// =========================================================
// 1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// =========================================================
const btnHome = document.getElementById('btn-home');
const btnCompliance = document.getElementById('btn-compliance');
const btnLoginMenu = document.getElementById('btn-login');
const conteudoPrincipal = document.getElementById('conteudo-principal');

// IDs do seu EmailJS (service_6gq5cku e template_ryqja5c)
const SERVICE_ID = "service_6gq5cku";
const TEMPLATE_ID = "template_ryqja5c";

const BLACKLIST_COMPLIANCE = ['porra', 'caralho', 'merda', 'puta', 'idiota', 'senha123', 'pqp', 'foder'];

const htmlHome = `
    <div id="boas-vindas" class="fade-in">
        <h2>Bem-vindo ao Site</h2>
        <p>Selecione uma opção no menu lateral para navegar.</p>
    </div>
`;

// =========================================================
// 2. FUNÇÕES AUXILIARES (LÓGICA E ENVIO)
// =========================================================

function gerarCodigoProfessor() {
    const letras = "ABC";
    const num = Math.floor(1000 + Math.random() * 9000); 
    return `PROF-${num}${letras.charAt(Math.floor(Math.random() * 3))}`;
}

function gerarPinVerificacao() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// FUNÇÃO DE ENVIO REAL VIA EMAILJS
async function enviarEmailReal(nome, emailDestino, pin) {
    const params = {
        nome: nome,       
        pin: pin,         
        email_to: emailDestino.toLowerCase().trim() 
    };

    try {
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
        alert(`Código enviado com sucesso para ${emailDestino}!`);
        return true;
    } catch (error) {
        console.error("Erro detalhado do EmailJS:", error);
        alert("Falha técnica: Não foi possível entregar o e-mail. Verifique sua conexão.");
        return false;
    }
}

// =========================================================
// 3. TELAS E NAVEGAÇÃO
// =========================================================

function mostrarLogin() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Login</h2>
            <form id="form-executar">
                <div class="form-group"><label>E-mail:</label><input type="email" id="l-email" required placeholder="seu@email.com"></div>
                <div class="form-group"><label>Senha:</label><input type="password" id="l-senha" required placeholder="******"></div>
                <button type="submit" class="btn-enviar">Entrar</button>
            </form>
            <p class="trocar-form">Novo por aqui? <a href="#" id="link-cadastrar">Cadastre-se</a></p>
            <p class="trocar-form"><a href="#" id="link-recuperar" style="font-size:0.85rem; color:#888;">Esqueci minha senha</a></p>
        </div>
    `;
    adicionarEventosForm();
}

function mostrarCadastro() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Criar Conta</h2>
            <form id="form-executar">
                <div class="form-group"><label>Nome:</label><input type="text" id="c-nome" required placeholder="Nome completo"></div>
                <div class="form-group"><label>E-mail:</label><input type="email" id="c-email" required placeholder="Ex: joao@ifpr.edu.br"></div>
                <div class="form-group"><label>Senha:</label><input type="password" id="c-senha" required placeholder="Mínimo 6 caracteres"></div>
                <div class="form-group">
                    <label>Tipo:</label>
                    <select id="tipo-usuario">
                        <option value="aluno">Aluno</option>
                        <option value="professor">Professor (Obrigatório @ifpr.edu.br)</option>
                    </select>
                </div>
                <button type="submit" class="btn-enviar">Solicitar Código</button>
            </form>
            <p class="trocar-form"><a href="#" id="link-login">Voltar ao Login</a></p>
        </div>
    `;
    adicionarEventosForm();
}

function mostrarTelaValidacao(email, pinCorreto, nome, tipo, senha, codigoProf) {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Validar Acesso</h2>
            <p style="text-align:center;">Verifique o código de 6 dígitos enviado para <strong>${email}</strong></p>
            <div class="form-group">
                <input type="text" id="input-pin" maxlength="6" style="text-align:center; font-size:2rem; letter-spacing:8px; margin:20px 0;">
            </div>
            <button id="btn-confirmar-pin" class="btn-enviar">Confirmar E-mail</button>
        </div>
    `;

    document.getElementById('btn-confirmar-pin').onclick = async () => {
        const digitado = document.getElementById('input-pin').value;
        if (digitado === pinCorreto) {
            const { error } = await _supabase.from('usuarios').insert([{ 
                nome, 
                email: email.toLowerCase().trim(), 
                senha, 
                tipo, 
                codigo_identificacao: codigoProf, 
                email_validado: true 
            }]);
            
            if (!error) {
                alert("Conta validada e criada com sucesso!");
                mostrarLogin();
            } else {
                alert("Erro ao salvar cadastro: " + error.message);
            }
        } else {
            alert("Código incorreto! Verifique seu e-mail novamente.");
        }
    };
}

function mostrarRecuperarSenha() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Recuperação</h2>
            <p style="text-align:center; font-size:0.9rem; margin-bottom:15px;">Digite o e-mail da sua conta para receber um novo código.</p>
            <div class="form-group">
                <input type="email" id="rec-email" required placeholder="seu@email.com">
            </div>
            <button id="btn-enviar-codigo-rec" class="btn-enviar">Enviar Código de Resgate</button>
            <p class="trocar-form"><a href="#" onclick="mostrarLogin()">Voltar</a></p>
        </div>
    `;

    document.getElementById('btn-enviar-codigo-rec').onclick = async () => {
        const emailOriginal = document.getElementById('rec-email').value;
        const emailBusca = emailOriginal.toLowerCase().trim();

        if(!emailBusca) return alert("Por favor, digite o seu e-mail.");

        const { data } = await _supabase.from('usuarios').select('nome').eq('email', emailBusca).single();

        if (data) {
            const pin = gerarPinVerificacao();
            const ok = await enviarEmailReal(data.nome, emailBusca, pin);
            if (ok) mostrarTelaNovaSenha(emailBusca, pin);
        } else {
            alert("E-mail inválido: Este endereço de e-mail não consta no nosso sistema.");
        }
    };
}

function mostrarTelaNovaSenha(email, pinCorreto) {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Redefinir Senha</h2>
            <div class="form-group">
                <label>Código do E-mail:</label>
                <input type="text" id="pin-rec" placeholder="000000" style="text-align:center; font-weight:bold;">
            </div>
            <div class="form-group">
                <label>Nova Senha:</label>
                <input type="password" id="nova-senha" placeholder="Mínimo 6 dígitos">
            </div>
            <button id="btn-salvar" class="btn-enviar">Salvar Nova Senha</button>
        </div>
    `;

    document.getElementById('btn-salvar').onclick = async () => {
        const pinDig = document.getElementById('pin-rec').value;
        const nova = document.getElementById('nova-senha').value;

        if (pinDig !== pinCorreto) return alert("Código de segurança incorreto!");
        if (nova.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");

        // ATUALIZAÇÃO COM VALIDAÇÃO REAL
        const { data, error } = await _supabase
            .from('usuarios')
            .update({ senha: nova })
            .eq('email', email.toLowerCase().trim())
            .select(); // Força o retorno dos dados para confirmar alteração

        if (error) {
            alert("Erro ao atualizar no banco de dados: " + error.message);
        } else if (data && data.length > 0) {
            alert("Sua senha foi atualizada com sucesso!");
            mostrarLogin();
        } else {
            alert("Erro: O sistema não conseguiu gravar a nova senha. Verifique as permissões.");
        }
    };
}

// =========================================================
// 4. LÓGICA DE FORMULÁRIOS
// =========================================================

function adicionarEventosForm() {
    const form = document.getElementById('form-executar');
    if (!form) return;

    const linkCad = document.getElementById('link-cadastrar');
    if(linkCad) linkCad.onclick = (e) => { e.preventDefault(); mostrarCadastro(); };
    const linkLog = document.getElementById('link-login');
    if(linkLog) linkLog.onclick = (e) => { e.preventDefault(); mostrarLogin(); };
    const linkRec = document.getElementById('link-recuperar');
    if(linkRec) linkRec.onclick = (e) => { e.preventDefault(); mostrarRecuperarSenha(); };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const nomeInput = document.getElementById('c-nome');

        if (nomeInput) {
            const nome = nomeInput.value;
            const email = document.getElementById('c-email').value.toLowerCase().trim();
            const senha = document.getElementById('c-senha').value;
            const tipo = document.getElementById('tipo-usuario').value;

            if (tipo === 'professor' && !email.endsWith('@ifpr.edu.br')) {
                alert("Erro: O cadastro de professor exige e-mail institucional @ifpr.edu.br");
                return;
            }

            const pin = gerarPinVerificacao();
            const codProf = (tipo === 'professor') ? gerarCodigoProfessor() : null;
            
            const ok = await enviarEmailReal(nome, email, pin);
            if (ok) mostrarTelaValidacao(email, pin, nome, tipo, senha, codProf);
        } else {
            const email = document.getElementById('l-email').value.toLowerCase().trim();
            const senha = document.getElementById('l-senha').value;
            
            const { data } = await _supabase.from('usuarios').select('*').eq('email', email).eq('senha', senha).single();

            if (data) {
                alert(`Olá ${data.nome}, login realizado com sucesso!`);
                conteudoPrincipal.innerHTML = htmlHome;
            } else {
                alert("Credenciais inválidas ou e-mail não cadastrado.");
            }
        }
    };
}

// =========================================================
// 5. MONITOR DE COMPLIANCE E MENU
// =========================================================

function mostrarCompliance() {
    conteudoPrincipal.innerHTML = `
        <div class="compliance-container fade-in">
            <h2>🛡️ Monitor de Compliance IA</h2>
            <textarea id="text-monitor" placeholder="Insira o conteúdo para análise..." style="width:100%; height:120px; margin-top:15px; padding:10px;"></textarea>
            <button onclick="analisarTexto()" class="btn-enviar" style="background-color:#3498db;">Analisar Segurança</button>
            <div id="alertas-resultado" style="margin-top:20px;"></div>
        </div>
    `;
}

function analisarTexto() {
    const t = document.getElementById('text-monitor').value;
    const res = document.getElementById('alertas-resultado');
    if(!t) return;

    let erros = [];
    const min = t.toLowerCase();

    BLACKLIST_COMPLIANCE.forEach(p => { if(min.includes(p)) erros.push(`Palavra imprópria: ${p}`); });
    if(/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(t)) erros.push("Risco LGPD: CPF detectado.");

    res.innerHTML = erros.length > 0 
        ? erros.map(e => `<div class="alerta-item alerta-perigo">⚠️ ${e}</div>`).join('')
        : `<div class="alerta-item alerta-sucesso">✅ Nenhum risco detectado.</div>`;
}

btnHome.onclick = (e) => { e.preventDefault(); conteudoPrincipal.innerHTML = htmlHome; };
btnLoginMenu.onclick = (e) => { e.preventDefault(); mostrarLogin(); };
btnCompliance.onclick = (e) => { e.preventDefault(); mostrarCompliance(); };