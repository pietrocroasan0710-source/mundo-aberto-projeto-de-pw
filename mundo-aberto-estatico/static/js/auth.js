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

    return data;
}

async function entrarComGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: new URL('index.html', window.location.href).href
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

    const registerLink = nav.querySelector('a.nav-register, a[href="cadastro.html"]');

    if (session) {
        link.textContent = 'Sair';
        link.href = '#';
        link.setAttribute('aria-label', 'Sair da conta');
        link.onclick = async (e) => {
            e.preventDefault();
            link.textContent = 'Saindo...';
            try {
                await sairDaConta();
            } catch {
                link.textContent = 'Sair';
            }
        };
        if (registerLink) registerLink.hidden = true;
    } else {
        link.textContent = 'Entrar';
        link.href = 'login.html';
        link.onclick = null;
        link.setAttribute('aria-label', 'Entrar na conta');
        if (registerLink) registerLink.hidden = false;
    }
}

async function verificarSessao() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        atualizarNavbar(data.session);
        return data.session;
    } catch {
        atualizarNavbar(null);
        return null;
    }
}

// Busca os IDs dos pacotes favoritados pelo usuário
async function buscarFavoritos() {
    const { data: { user }, error: erroUsuario } =
        await supabaseClient.auth.getUser();

    if (erroUsuario) throw erroUsuario;
    if (!user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabaseClient
        .from("favoritos")
        .select("roteiro_id")
        .eq("user_id", user.id);

    if (error) throw error;

    return data.map(favorito => favorito.roteiro_id);
}


// Adiciona um pacote aos favoritos
async function adicionarFavorito(pacoteId) {
    const { data: { user }, error: erroUsuario } =
        await supabaseClient.auth.getUser();

    if (erroUsuario) throw erroUsuario;
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabaseClient
        .from("favoritos")
        .upsert(
            {
                user_id: user.id,
                roteiro_id: String(pacoteId)
            },
            {
                onConflict: "user_id,roteiro_id",
                ignoreDuplicates: true
            }
        );

    if (error) throw error;
}


// Remove um pacote dos favoritos
async function removerFavorito(pacoteId) {
    const { data: { user }, error: erroUsuario } =
        await supabaseClient.auth.getUser();

    if (erroUsuario) throw erroUsuario;
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabaseClient
        .from("favoritos")
        .delete()
        .eq("user_id", user.id)
        .eq("roteiro_id", String(pacoteId));

    if (error) throw error;
}

async function carregarPacotesFavoritos() {
    try {
        // Busca os IDs salvos no Supabase
        const idsFavoritos = await buscarFavoritos();

        // Carrega os pacotes do JSON
        const resposta = await fetch("static/json/pacotes.json");
        const dados = await resposta.json();

        // Mantém somente os pacotes favoritados
        const pacotesFavoritos = dados.pacotes.filter(pacote =>
            idsFavoritos.includes(`pacote:${pacote.destino}:${pacote.id}`)
        );

        return pacotesFavoritos;

    } catch (erro) {
        console.error("Erro ao carregar favoritos:", erro);
        return [];
    }
}
supabaseClient.auth.onAuthStateChange((_event, session) => atualizarNavbar(session));
verificarSessao();
