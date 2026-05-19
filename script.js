// =========================================================
// 1. SELEÇÃO DE ELEMENTOS E VARIÁVEIS GLOBAIS
// =========================================================
const btnHome = document.getElementById('btn-home');
const btnCompliance = document.getElementById('btn-compliance');
const btnLoginMenu = document.getElementById('btn-login');
const conteudoPrincipal = document.getElementById('conteudo-principal');

// Lista Negra de termos (Baixo calão e Segurança)
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
// 2. FUNÇÕES DE NAVEGAÇÃO E TELAS
// =========================================================

// Exibir Tela de Login
function mostrarLogin() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Login</h2>
            <form id="form-executar">
                <div class="form-group">
                    <label>E-mail:</label>
                    <input type="email" required placeholder="seu@email.com">
                </div>
                <div class="form-group">
                    <label>Senha:</label>
                    <input type="password" required placeholder="******">
                </div>
                <button type="submit" class="btn-enviar">Entrar</button>
            </form>
            <p class="trocar-form">Não tem conta? <a href="#" id="link-cadastrar">Cadastre-se aqui</a></p>
        </div>
    `;
    adicionarEventosForm();
}

// Exibir Tela de Cadastro
function mostrarCadastro() {
    conteudoPrincipal.innerHTML = `
        <div class="login-card fade-in">
            <h2>Criar Conta</h2>
            <form id="form-executar">
                <div class="form-group">
                    <label>Nome Completo:</label>
                    <input type="text" required placeholder="Seu nome">
                </div>
                <div class="form-group">
                    <label>E-mail:</label>
                    <input type="email" required placeholder="seu@email.com">
                </div>
                <div class="form-group">
                    <label>Senha:</label>
                    <input type="password" required placeholder="Crie uma senha">
                </div>
                
                <div class="form-group">
                    <label>Você é:</label>
                    <select id="tipo-usuario" required>
                        <option value="aluno">Aluno</option>
                        <option value="professor">Professor</option>
                    </select>
                </div>

                <!-- Campo condicional para Professor -->
                <div id="campo-professor" class="form-group" style="display: none;">
                    <label>Código de Identificação:</label>
                    <input type="text" id="cod-id" placeholder="Ex: PROF-1234">
                </div>

                <button type="submit" class="btn-enviar">Finalizar Cadastro</button>
            </form>
            <p class="trocar-form">Já é cadastrado? <a href="#" id="link-login">Faça Login</a></p>
        </div>
    `;
    adicionarEventosForm();
}

// Exibir Tela de Compliance IA
function mostrarCompliance() {
    conteudoPrincipal.innerHTML = `
        <div class="compliance-container fade-in">
            <h2>🛡️ Monitor de Compliance IA</h2>
            <p>Análise em tempo real de comunicações e arquivos para detecção de riscos.</p>
            
            <div class="drop-zone" id="upload-area">
                <p>Arraste arquivos ou cole textos aqui para análise imediata</p>
                <textarea id="text-monitor" placeholder="Ex: 'Minha senha é 123...'" style="width:100%; height:100px; margin-top:10px; padding:10px; border-radius:5px; border:1px solid #ccc;"></textarea>
                <button onclick="analisarTexto()" class="btn-enviar" style="margin-top:10px; background-color: #3498db;">Analisar Agora</button>
            </div>

            <div class="status-panel" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h3>Logs de Varredura</h3>
                    <div id="logs" class="log-box" style="background: #1e1e1e; color: #00ff00; padding: 15px; height: 200px; overflow-y: auto; font-family: monospace; border-radius: 5px;">
                        > Sistema pronto...<br>
                        > Aguardando entrada de dados...
                    </div>
                </div>
                <div>
                    <h3>Alertas de Segurança</h3>
                    <div id="alertas">
                        <!-- Alertas aparecerão aqui -->
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =========================================================
// 3. LÓGICA DE NEGÓCIO (FORMULÁRIOS E IA)
// =========================================================

// Gerencia eventos de formulários (Cadastro/Login)
function adicionarEventosForm() {
    const form = document.getElementById('form-executar');
    const tipoUsuario = document.getElementById('tipo-usuario');
    const campoProfessor = document.getElementById('campo-professor');
    const inputCod = document.getElementById('cod-id');

    // Lógica Professor/Aluno
    if (tipoUsuario) {
        tipoUsuario.addEventListener('change', () => {
            if (tipoUsuario.value === 'professor') {
                campoProfessor.style.display = 'block';
                inputCod.setAttribute('required', 'true');
            } else {
                campoProfessor.style.display = 'none';
                inputCod.removeAttribute('required');
            }
        });
    }

    // Submit do formulário
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Dados processados com sucesso!');
        conteudoPrincipal.innerHTML = htmlHome;
    });

    // Alternar entre formulários
    const linkCad = document.getElementById('link-cadastrar');
    if(linkCad) linkCad.addEventListener('click', (e) => { e.preventDefault(); mostrarCadastro(); });

    const linkLog = document.getElementById('link-login');
    if(linkLog) linkLog.addEventListener('click', (e) => { e.preventDefault(); mostrarLogin(); });
}

// Lógica de Detecção da IA (BAIXO CALÃO E LGPD)
function analisarTexto() {
    const textarea = document.getElementById('text-monitor');
    const texto = textarea.value.trim();
    const logs = document.getElementById('logs');
    const alertas = document.getElementById('alertas');
    
    if(!texto) {
        alert("Por favor, insira um texto para análise.");
        return;
    }

    const agora = new Date().toLocaleTimeString();
    logs.innerHTML += `<br>> [${agora}] Iniciando análise de segurança...`;
    
    let riscosEncontrados = [];
    const textoMinusculo = texto.toLowerCase();

    // 1. Verificação de Baixo Calão (Usando Regex para palavra exata)
    BLACKLIST_COMPLIANCE.forEach(termo => {
        const regex = new RegExp(`\\b${termo}\\b`, 'gi'); 
        if(regex.test(textoMinusculo)) {
            riscosEncontrados.push(`Linguagem Imprópria detectada: "${termo}"`);
        }
    });

    // 2. Verificação de Dados Sensíveis (LGPD)
    const regexEmail = /\S+@\S+\.\S+/;
    const regexCPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/;

    if(regexEmail.test(textoMinusculo)) riscosEncontrados.push("LGPD: Vazamento de e-mail detectado.");
    if(regexCPF.test(textoMinusculo)) riscosEncontrados.push("LGPD: Número de CPF identificado.");

    // Simular processamento em nuvem
    setTimeout(() => {
        if(riscosEncontrados.length > 0) {
            logs.innerHTML += `<br><span style="color: #ff4d4d">> [BLOQUEADO] Riscos críticos encontrados!</span>`;
            
            // Gerar HTML dos alertas
            const novosAlertas = riscosEncontrados.map(r => `
                <div class="alerta-item alerta-perigo" style="padding:10px; margin-bottom:5px; border-left:5px solid #ff4d4d; background:#fff; color:#b30000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <strong>⚠️ VIOLAÇÃO:</strong> ${r}
                </div>
            `).join('');
            
            alertas.innerHTML = novosAlertas + alertas.innerHTML;
        } else {
            logs.innerHTML += `<br><span style="color: #2ecc71">> [OK] Conteúdo seguro para upload.</span>`;
            alertas.innerHTML = `
                <div class="alerta-item alerta-sucesso" style="padding:10px; margin-bottom:5px; border-left:5px solid #2ecc71; background:#fff; color:#27ae60; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <strong>✅ SEGURO:</strong> Nenhuma violação encontrada.
                </div>
            ` + alertas.innerHTML;
        }
        
        // Auto-scroll do log
        logs.scrollTop = logs.scrollHeight;
    }, 600);
}

// =========================================================
// 4. EVENTOS DO MENU LATERAL
// =========================================================
btnHome.addEventListener('click', (e) => { 
    e.preventDefault(); 
    conteudoPrincipal.innerHTML = htmlHome; 
});

btnLoginMenu.addEventListener('click', (e) => { 
    e.preventDefault(); 
    mostrarLogin(); 
});

btnCompliance.addEventListener('click', (e) => { 
    e.preventDefault(); 
    mostrarCompliance(); 
});