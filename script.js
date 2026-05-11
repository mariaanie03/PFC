// Seleciona os elementos principais
const btnLoginMenu = document.getElementById('btn-login');
const btnHome = document.getElementById('btn-home');
const conteudoPrincipal = document.getElementById('conteudo-principal');

// Conteúdo padrão da Home
const htmlHome = `
    <div id="boas-vindas" class="fade-in">
        <h2>Bem-vindo ao Site</h2>
        <p>Selecione uma opção no menu lateral para navegar.</p>
    </div>
`;

// Função para mostrar o formulário de LOGIN
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

// Função para mostrar o formulário de CADASTRO
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

// Função para gerenciar a lógica dos formulários
function adicionarEventosForm() {
    const form = document.getElementById('form-executar');
    const tipoUsuario = document.getElementById('tipo-usuario');
    const campoProfessor = document.getElementById('campo-professor');
    const inputCod = document.getElementById('cod-id');

    // Lógica para mostrar/esconder código de professor
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

    // Evento de envio
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Dados processados com sucesso!');
        conteudoPrincipal.innerHTML = htmlHome;
    });

    // Alternar entre Login e Cadastro
    const linkCad = document.getElementById('link-cadastrar');
    if(linkCad) linkCad.addEventListener('click', (e) => { e.preventDefault(); mostrarCadastro(); });

    const linkLog = document.getElementById('link-login');
    if(linkLog) linkLog.addEventListener('click', (e) => { e.preventDefault(); mostrarLogin(); });
}

// Eventos do Menu Lateral
btnLoginMenu.addEventListener('click', (e) => { e.preventDefault(); mostrarLogin(); });
btnHome.addEventListener('click', (e) => { e.preventDefault(); conteudoPrincipal.innerHTML = htmlHome; });