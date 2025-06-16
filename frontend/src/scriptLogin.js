const API_URL = 'http://localhost:3006/api'; // URL do seu backend
    let currentUserId = null;
    let currentUserType = null;
    let currentLoginIdentifier = null; // CPF ou Código do funcionário

    async function handleLogin(userType) {
        let identifier, password;
        if (userType === 'CLIENTE') {
            identifier = document.getElementById('cpf').value;
            password = document.getElementById('senha').value;
        } else { // FUNCIONARIO
            identifier = document.getElementById('codigo').value;
            password = document.getElementById('senha-func').value;
        }

        if (!identifier || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cpf_ou_codigo: identifier,
                    senha: password,
                    tipo_usuario: userType
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                currentUserId = data.id_usuario;
                currentUserType = userType;
                currentLoginIdentifier = identifier;

                // Mostra a caixa do OTP 
                document.getElementById('login-box').style.display = 'none';
                document.getElementById('login-funcionario-box').style.display = 'none';
                document.getElementById('otp-box').style.display = 'block';
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Erro na requisição de login:', error);
            alert('Erro ao conectar com o servidor.');
        }
    }

    async function validarOTP() {
        const otp_digitado = document.getElementById('otp').value;

        if (!otp_digitado) {
            alert('Por favor, digite o código OTP.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/validate-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_usuario: currentUserId,
                    otp_digitado: otp_digitado,
                    tipo_usuario: currentUserType
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                // Armazena o ID do usuário e tipo em sessionStorage para usar nas outras páginas
                sessionStorage.setItem('id_usuario', currentUserId);
                sessionStorage.setItem('tipo_usuario', currentUserType);
                sessionStorage.setItem('login_identifier', currentLoginIdentifier); // Guarda para relatórios/consultas

                if (currentUserType === 'CLIENTE') {
                    window.location.href = 'index.html';
                } else if (currentUserType === 'FUNCIONARIO') {
                    window.location.href = 'indexFuncionario.html';
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Erro na requisição de validação de OTP:', error);
            alert('Erro ao validar OTP com o servidor.');
        }
    }

    function mostrarLoginFuncionario() {
      document.getElementById('login-box').style.display = 'none';
      document.getElementById('login-funcionario-box').style.display = 'block';
      document.getElementById('otp-box').style.display = 'none'; // Esconde OTP se voltar ao login
    }

    function mostrarCliente() {
      document.getElementById('login-funcionario-box').style.display = 'none';
      document.getElementById('login-box').style.display = 'block';
      document.getElementById('otp-box').style.display = 'none'; // Esconde OTP se voltar ao login
    }