
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

    if (error) {
        throw error;
    }

    return data;
}

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
            await cadastrarUsuario(name, email, password);

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
