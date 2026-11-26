// ---------- FUNÇÕES ----------
async function cadastrarUsuario(nome, email, senha) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: senha,
        options: {
            data: {
                nome: nome,
                full_name: nome,
                display_name: nome
            }
        }
    });

    if (error) throw error;
    return data;
}

async function entrarUsuario(email, senha) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) throw error;

    console.log("Login realizado com sucesso!");
    console.log("Usuário:", data.user);
    console.log("Sessão ativa:", !!data.session);

    return data;
}

async function entrarComGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/index.html'
        }
    });

    if (error) throw error;
}

async function sairDaConta() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

// Use em páginas que exigem login (ex.: roteiro.html, favoritos.html)
async function exigirLogin() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
        window.location.href = 'login.html';
    }
    return data.session;
}

// ---------- CADASTRO ----------
const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        const message = document.getElementById('register-message');
        const button = registerForm.querySelector('button[type="submit"]');

        if (password !== confirmPassword) {
            message.textContent = 'As senhas não coincidem.';
            return;
        }

        button.disabled = true;
        message.textContent = 'Criando sua conta...';

        try {
            const data = await cadastrarUsuario(name, email, password);

            // Com confirmação de e-mail ligada, não vem sessão ainda
            if (!data.session) {
                message.textContent = 'Conta criada! Confirme seu e-mail para entrar.';
                return;
            }

            message.textContent = 'Conta criada com sucesso! Redirecionando...';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1200);

        } catch (error) {
            message.textContent = error.message || 'Erro ao criar conta.';
        } finally {
            button.disabled = false;
        }
    });
}

// ---------- LOGIN ----------
const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const message = document.getElementById('login-message');
        const button = loginForm.querySelector('button[type="submit"]');

        button.disabled = true;
        message.textContent = 'Entrando...';

        try {
            await entrarUsuario(email, password);
            window.location.href = 'index.html';
        } catch (error) {
            message.textContent = 'E-mail ou senha incorretos.';
        } finally {
            button.disabled = false;
        }
    });
}

// ---------- GOOGLE ----------
const googleBtn = document.getElementById('google-btn');

if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            await entrarComGoogle();
        } catch (error) {
            const message = document.getElementById('login-message')
                || document.getElementById('register-message');
            if (message) message.textContent = error.message || 'Erro ao entrar com Google.';
        }
    });
}

// ---------- SESSÃO / NAVBAR ----------


function atualizarNavbar(session) {
    const nav = document.querySelector('.navbar nav');
    if (!nav) return;

    // Usa o link "Entrar" que já existe; se não houver, cria um
    let link = nav.querySelector('a.nav-login, a[href="login.html"]');
    if (!link) {
        link = document.createElement('a');
        nav.appendChild(link);
    }
    link.classList.add('nav-login'); // garante que será achado de novo depois

    // Remove o menu com nome do usuário, se existir de antes
    const menuAntigo = document.getElementById('user-menu');
    if (menuAntigo) menuAntigo.remove();

    if (session) {
        link.textContent = 'Sair';
        link.href = '#';
        link.onclick = (e) => {
            e.preventDefault();
            sairDaConta();
        };
    } else {
        link.textContent = 'Entrar';
        link.href = 'login.html';
        link.onclick = null;
    }
}
// ---------- TESTE DE SESSÃO ----------
async function verificarSessao() {
    const { data, error } = await supabaseClient.auth.getSession();

    console.log("Sessão continua ativa?", !!data.session);

    if (data.session) {
        console.log("Usuário logado:", data.session.user.email);
    } else {
        console.log("Nenhum usuário logado.");
    }

    if (error) console.error("Erro:", error);
}

verificarSessao();