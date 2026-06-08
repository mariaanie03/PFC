// =========================================================
// 1. SELEÇÃO DE ELEMENTOS E VARIÁVEIS GLOBAIS
// =========================================================
const btnHome = document.getElementById('btn-home');
const btnCompliance = document.getElementById('btn-compliance');
const btnLoginMenu = document.getElementById('btn-login');
const conteudoPrincipal = document.getElementById('conteudo-principal');

// Lista Negra para o Monitor de Compliance
const BLACKLIST_COMPLIANCE = [
    'porra', 'caralho', 'merda', 'puta', 'desgraça', 'corno', 'pqp', 
    'idiota', 'imbecil', 'trouxa', 'foder', 'cacete', 'senha', 'password', '123456'
];

// Conteúdo padrão da Home
const htmlHome = `
    <div id="boas-vindas" class="fade-in">
        <h2>Bem-vindo ao Site</h2>
        <p>Selecione uma opção no menu lateral para navegar.</p>
    </div>
`;

// =========================================================
// 2. FUNÇÕES AUXILIARES
// =========================================================

// Gerar código único para professores (Ex: PROF-1234A)
function gerarCodigoProfessor() {
    const letras = "ABC";
    const num = Math.floor(1000 + Math.random() * 9000); 
    const letraAleatoria = letras.charAt(Math.floor(Math.random() * letras.length));
    return `PROF-${num}${letraAleatoria}`;
}

// =========================================================
// 3. TELAS E NAVEGAÇÃO
// =========================================================

function mostrarLogin() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Login</h2>
            <form id="form-executar">
                <div class="form-group">
                    <label>E-mail:</label>
                    <input type="email" id="l-email" required placeholder="seu@email.com">
                </div>
                <div class="form-group">
                    <label>Senha:</label>
                    <input type="password" id="l-senha" required placeholder="******">
                </div>
                <button type="submit" class="btn-enviar">Entrar</button>
            </form>
            <p class="trocar-form">Não tem conta? <a href="#" id="link-cadastrar">Cadastre-se aqui</a></p>
        </div>
    `;
    adicionarEventosForm();
}

function mostrarCadastro() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Criar Conta</h2>
            <form id="form-executar">
                <div class="form-group">
                    <label>Nome Completo:</label>
                    <input type="text" id="c-nome" required placeholder="Seu nome">
                </div>
                <div class="form-group">
                    <label>E-mail:</label>
                    <input type="email" id="c-email" required placeholder="seu@email.com">
                </div>
                <div class="form-group">
                    <label>Senha:</label>
                    <input type="password" id="c-senha" required placeholder="Crie uma senha">
                </div>
                
                <div class="form-group">
                    <label>Você é:</label>
                    <select id="tipo-usuario" required>
                        <option value="aluno">Aluno</option>
                        <option value="professor">Professor</option>
                    </select>
                </div>

                <div id="campo-professor" class="form-group" style="display: none;">
                    <label>Código de Identificação:</label>
                    <input type="text" id="cod-id" readonly placeholder="Gerado automaticamente">
                </div>

                <button type="submit" class="btn-enviar">Finalizar Cadastro</button>
            </form>
            <p class="trocar-form">Já é cadastrado? <a href="#" id="link-login">Faça Login</a></p>
        </div>
    `;
    adicionarEventosForm();
}

function mostrarCompliance() {
    conteudoPrincipal.innerHTML = `
        <div class="compliance-container fade-in">
            <h2>🛡️ Monitor de Compliance IA</h2>
            <p>Análise em tempo real de comunicações para detecção de riscos.</p>
            
            <div class="drop-zone" id="upload-area">
                <p>Cole textos abaixo para análise de segurança</p>
                <textarea id="text-monitor" placeholder="Ex: 'Minha senha é 123...'" style="width:100%; height:100px; margin-top:10px; padding:10px; border-radius:5px; border:1px solid #ccc; font-family: sans-serif;"></textarea>
                <button onclick="analisarTexto()" class="btn-enviar" style="margin-top:10px; background-color: #3498db;">Analisar Agora</button>
            </div>

            <div class="status-panel" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div>
                    <h3>Logs de Varredura</h3>
                    <div id="logs" class="log-box" style="background: #1e1e1e; color: #00ff00; padding: 15px; height: 180px; overflow-y: auto; font-family: monospace; border-radius: 5px; font-size: 13px;">
                        > Sistema pronto...<br>
                        > Aguardando entrada de dados...
                    </div>
                </div>
                <div>
                    <h3>Alertas de Segurança</h3>
                    <div id="alertas"></div>
                </div>
            </div>
        </div>
    `;
}

// =========================================================
// 4. LÓGICA DE BANCO DE DADOS (SUPABASE) E FORMULÁRIOS
// =========================================================

function adicionarEventosForm() {
    const form = document.getElementById('form-executar');
    const tipoUsuario = document.getElementById('tipo-usuario');

    // Lógica para mostrar/esconder campo de professor
    if (tipoUsuario) {
        tipoUsuario.addEventListener('change', () => {
            const campoProf = document.getElementById('campo-professor');
            campoProf.style.display = tipoUsuario.value === 'professor' ? 'block' : 'none';
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Verifica se o campo "c-nome" existe para saber se é CADASTRO ou LOGIN
        const nomeInput = document.getElementById('c-nome');

        if (nomeInput) {
            // --- LÓGICA DE CADASTRO ---
            const nome = nomeInput.value;
            const email = document.getElementById('c-email').value;
            const senha = document.getElementById('c-senha').value;
            const tipo = tipoUsuario.value;
            let codigoParaSalvar = (tipo === 'professor') ? gerarCodigoProfessor() : null;

            const { data, error } = await _supabase
                .from('usuarios')
                .insert([
                    { nome, email, senha, tipo, codigo_identificacao: codigoParaSalvar }
                ]);

            if (error) {
                alert("Erro ao cadastrar: " + error.message);
            } else {
                if (tipo === 'professor') {
                    alert(`SUCESSO!\n\nSeu código de professor é: ${codigoParaSalvar}\nAnote este código para acessos futuros.`);
                } else {
                    alert("Aluno cadastrado com sucesso!");
                }
                conteudoPrincipal.innerHTML = htmlHome;
            }

        } else {
            // --- LÓGICA DE LOGIN ---
            const email = document.getElementById('l-email').value;
            const senha = document.getElementById('l-senha').value;

            const { data, error } = await _supabase
                .from('usuarios')
                .select('*')
                .eq('email', email)
                .eq('senha', senha)
                .single();

            if (data) {
                alert(`Olá ${data.nome}, bem-vindo de volta!`);
                conteudoPrincipal.innerHTML = htmlHome;
            } else {
                alert("E-mail ou senha incorretos.");
            }
        }
    });

    // Alternar entre telas (Login <-> Cadastro)
    const linkCad = document.getElementById('link-cadastrar');
    if(linkCad) linkCad.addEventListener('click', (e) => { e.preventDefault(); mostrarCadastro(); });

    const linkLog = document.getElementById('link-login');
    if(linkLog) linkLog.addEventListener('click', (e) => { e.preventDefault(); mostrarLogin(); });
}

// =========================================================
// 5. LÓGICA DO MONITOR DE COMPLIANCE (IA)
// =========================================================

function analisarTexto() {
    const textarea = document.getElementById('text-monitor');
    const logs = document.getElementById('logs');
    const alertas = document.getElementById('alertas');
    const texto = textarea.value.trim();
    
    if(!texto) return alert("Insira um texto para análise.");

    const agora = new Date().toLocaleTimeString();
    logs.innerHTML += `<br>> [${agora}] Iniciando análise de segurança...`;
    
    let riscosEncontrados = [];
    const textoMinusculo = texto.toLowerCase();

    // 1. Verificação de Palavras Proibidas
    BLACKLIST_COMPLIANCE.forEach(termo => {
        const regex = new RegExp(`\\b${termo}\\b`, 'gi'); 
        if(regex.test(textoMinusculo)) riscosEncontrados.push(`Linguagem Imprópria: "${termo}"`);
    });

    // 2. Verificação LGPD (E-mail e CPF)
    if(/\S+@\S+\.\S+/.test(textoMinusculo)) riscosEncontrados.push("LGPD: Exposição de E-mail.");
    if(/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(textoMinusculo)) riscosEncontrados.push("LGPD: Exposição de CPF.");

    setTimeout(() => {
        if(riscosEncontrados.length > 0) {
            logs.innerHTML += `<br><span style="color: #ff4d4d">> [BLOQUEADO] Risco crítico detectado.</span>`;
            alertas.innerHTML = riscosEncontrados.map(r => `
                <div style="padding:10px; margin-bottom:5px; border-left:5px solid #ff4d4d; background:#fff; color:#b30000; font-size:12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <strong>⚠️ ALERTA:</strong> ${r}
                </div>
            `).join('') + alertas.innerHTML;
        } else {
            logs.innerHTML += `<br><span style="color: #2ecc71">> [OK] Conteúdo Seguro.</span>`;
            alertas.innerHTML = `<div style="padding:10px; margin-bottom:5px; border-left:5px solid #2ecc71; background:#fff; color:#27ae60; font-size:12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <strong>✅ SEGURO:</strong> Nenhuma violação encontrada.
            </div>` + alertas.innerHTML;
        }
        logs.scrollTop = logs.scrollHeight;
    }, 600);
}

// =========================================================
// 6. EVENTOS INICIAIS DO MENU
// =========================================================
btnHome.addEventListener('click', (e) => { e.preventDefault(); conteudoPrincipal.innerHTML = htmlHome; });
btnLoginMenu.addEventListener('click', (e) => { e.preventDefault(); mostrarLogin(); });
btnCompliance.addEventListener('click', (e) => { e.preventDefault(); mostrarCompliance(); });