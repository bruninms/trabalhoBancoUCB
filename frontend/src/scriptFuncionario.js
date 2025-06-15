// frontend/src/scriptFuncionario.js

const API_URL = 'http://localhost:3006/api'; // CRÍTICO: URL correta do seu backend
let currentEmployeeId = null; // ID do funcionário logado
let currentEmployeeCode = null; // Código do funcionário logado (do login)

document.addEventListener('DOMContentLoaded', () => {
    // Obter id_usuario e tipo_usuario do sessionStorage
    const id_usuario = sessionStorage.getItem('id_usuario');
    const tipo_usuario = sessionStorage.getItem('tipo_usuario');
    currentEmployeeCode = sessionStorage.getItem('login_identifier');

    if (!id_usuario || tipo_usuario !== 'FUNCIONARIO') {
        alert('Você não está logado como funcionário. Redirecionando para a tela de login.');
        window.location.href = 'login.html';
        return;
    }
    currentEmployeeId = id_usuario;

    // Lógica para mostrar/esconder modais e campos de conta
    const items = document.querySelectorAll(".item-menu");
    // Selecionamos agora todos os overlays dos modais
    const modalOverlays = document.querySelectorAll(".modal-overlay"); 

    items.forEach(item => {
        item.addEventListener("click", () => {
            // Obter o ID do modal alvo (ex: 'modal1', 'modal2') do novo atributo data-modal-target
            const modalId = item.getAttribute("data-modal-target"); 
            
            // Esconder todos os overlays de modais primeiro
            modalOverlays.forEach(overlay => overlay.style.display = "none");
            
            // Encontrar o overlay específico e exibi-lo
            const selectedOverlay = document.getElementById(`${modalId}-overlay`);
            if (selectedOverlay) {
                selectedOverlay.style.display = "flex"; // Exibe o overlay (com flex para centralizar o modal)
                document.body.classList.add('no-scroll'); // Adiciona classe para impedir rolagem do body
            }
        });
    });

    const tipoConta = document.getElementById("tipo-conta");
    const camposContainer = document.getElementById("campos-conta");

    if (tipoConta) {
        tipoConta.addEventListener("change", () => {
            const tipo = tipoConta.value;
            camposContainer.innerHTML = "";

            if (tipo === "POUPANCA") {
                camposContainer.innerHTML = `
                    <label>Taxa de Rendimento Mensal (%)</label>
                    <input type="number" id="taxa-rendimento-cp" step="0.01" placeholder="Ex: 0.6" />
                `;
            }

            if (tipo === "CORRENTE") {
                camposContainer.innerHTML = `
                    <label>Limite do Cheque Especial</label>
                    <input type="number" id="limite-cc" step="0.01" placeholder="Ex: 2000.00" />
                    <label>Data de Vencimento (Fatura)</label>
                    <input type="date" id="data-vencimento-cc" />
                    <label>Tarifa Mensal</label>
                    <input type="number" id="taxa-manutencao-cc" step="0.01" placeholder="Ex: 25.00" />
                `;
            }

            if (tipo === "INVESTIMENTO") {
                camposContainer.innerHTML = `
                    <label>Perfil de Risco</label>
                    <select id="perfil-risco-ci">
                        <option value="BAIXO">BAIXO</option>
                        <option value="MEDIO">MEDIO</option>
                        <option value="ALTO">ALTO</option>
                    </select>
                    <label>Valor Mínimo para Investimento</label>
                    <input type="number" id="valor-minimo-ci" step="0.01" placeholder="Ex: 5000.00" />
                    <label>Taxa de Rendimento Base (%)</label>
                    <input type="number" id="taxa-rendimento-base-ci" step="0.01" placeholder="Ex: 1.2" />
                `;
            }
        });
    }
});

// A função fecharModal agora esconde o overlay e reativa a rolagem do body
function fecharModal(modalId) {
    document.getElementById(`${modalId}-overlay`).style.display = 'none';
    document.body.classList.remove('no-scroll'); // Remove a classe para reativar a rolagem
}

async function logoutFuncionario() {
    try {
        const response = await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id_usuario: currentEmployeeId })
        });
        const data = await response.json();
        if (response.ok) {
            sessionStorage.clear(); // Limpa a sessão
            window.location.href = 'login.html'; // Redireciona para o login
        } else {
            alert('Erro ao fazer logout: ' + (data.message || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Erro de rede ao fazer logout:', error);
        alert('Erro ao conectar com o servidor para logout.');
    }
}

// RF2.1 - Função para abrir nova conta
async function abrirNovaConta() {
    const nome = document.getElementById('novo-nome').value;
    const cpf = document.getElementById('novo-cpf').value;
    const data_nascimento = document.getElementById('nova-data-nascimento').value;
    const telefone = document.getElementById('novo-telefone').value;
    const senha_clara = document.getElementById('nova-senha').value;
    const cep = document.getElementById('novo-cep').value;
    const local = document.getElementById('novo-local').value;
    const numero_casa = document.getElementById('novo-numero-casa').value;
    const bairro = document.getElementById('novo-bairro').value;
    const cidade = document.getElementById('novo-cidade').value;
    const estado = document.getElementById('novo-estado').value;
    const complemento = document.getElementById('novo-complemento').value;
    const id_agencia = document.getElementById('nova-agencia-id').value;
    const tipo_conta = document.getElementById('tipo-conta').value;

    // Campos específicos da conta
    let dadosContaEspecifica = {};
    if (tipo_conta === 'POUPANCA') {
        dadosContaEspecifica.taxa_rendimento = parseFloat(document.getElementById('taxa-rendimento-cp').value);
    } else if (tipo_conta === 'CORRENTE') {
        dadosContaEspecifica.limite = parseFloat(document.getElementById('limite-cc').value);
        dadosContaEspecifica.data_vencimento = document.getElementById('data-vencimento-cc').value;
        dadosContaEspecifica.taxa_manutencao = parseFloat(document.getElementById('taxa-manutencao-cc').value);
    } else if (tipo_conta === 'INVESTIMENTO') {
        dadosContaEspecifica.perfil_risco = document.getElementById('perfil-risco-ci').value;
        dadosContaEspecifica.valor_minimo = parseFloat(document.getElementById('valor-minimo-ci').value);
        dadosContaEspecifica.taxa_rendimento_base = parseFloat(document.getElementById('taxa-rendimento-base-ci').value);
    }

    // Validação básica
    if (!nome || !cpf || !data_nascimento || !telefone || !senha_clara || !cep || !local || !numero_casa || !bairro || !cidade || !estado || !id_agencia || !tipo_conta) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/conta/abrir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome, cpf, data_nascimento, telefone, senha_clara,
                tipo_usuario: 'CLIENTE', // Abrindo conta para um novo cliente
                cep, local, numero_casa, bairro, cidade, estado, complemento,
                id_agencia: parseInt(id_agencia),
                tipo_conta,
                ...dadosContaEspecifica
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message + (data.numero_conta ? ` Número da conta: ${data.numero_conta}` : ''));
            fecharModal('modal1');
            // Limpar formulário (opcional)
        } else {
            alert('Erro ao abrir conta: ' + (data.message || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Erro na requisição de abertura de conta:', error);
        alert('Erro ao conectar com o servidor para abrir conta.');
    }
}

// RF2.2 - Função para encerrar conta
async function encerrarConta() {
    const numero_conta = document.getElementById('encerrar-numero-conta').value;
    const motivo = document.getElementById('encerrar-motivo').value;
    const senha_admin = document.getElementById('encerrar-senha-admin').value;
    const otp_admin = document.getElementById('encerrar-otp-admin').value;

    if (!numero_conta || !motivo || !senha_admin || !otp_admin) {
        alert('Por favor, preencha todos os campos para encerrar a conta.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/conta/encerrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numero_conta,
                motivo,
                id_funcionario_acao: currentEmployeeId, // Usar o ID do funcionário logado
                senha_admin,
                otp_admin
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            fecharModal('modal2');
        } else {
            alert('Erro ao encerrar conta: ' + (data.message || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Erro na requisição de encerramento de conta:', error);
        alert('Erro ao conectar com o servidor para encerrar conta.');
    }
}

// RF2.3 - Função para consultar cliente por CPF
async function consultarCliente() {
    const cpf = document.getElementById('consulta-cpf-cliente').value;
    if (!cpf) {
        alert('Por favor, digite o CPF do cliente.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/consulta/cliente/${cpf}`);
        const data = await response.json();
        const resultadoDiv = document.getElementById('resultado-consulta-cliente');
        resultadoDiv.innerHTML = ''; // Limpa resultados anteriores

        if (response.ok) {
            let html = `<h4>Dados do Cliente:</h4>`;
            html += `<p><strong>Nome:</strong> ${data.nome}</p>`;
            html += `<p><strong>CPF:</strong> ${data.cpf}</p>`;
            html += `<p><strong>Data Nasc.:</strong> ${new Date(data.data_nascimento).toLocaleDateString()}</p>`;
            html += `<p><strong>Telefone:</strong> ${data.telefone}</p>`;
            html += `<p><strong>Score Crédito:</strong> ${data.score_credito || 'N/A'}</p>`;
            resultadoDiv.innerHTML = html;
        } else {
            resultadoDiv.innerHTML = `<p style="color: red;">${data.message || 'Erro desconhecido.'}</p>`;
        }
    } catch (error) {
        console.error('Erro na consulta de cliente:', error);
        document.getElementById('resultado-consulta-cliente').innerHTML = '<p style="color: red;">Erro ao conectar com o servidor.</p>';
    }
}

// RF2.3 - Função para consultar contas por ID do Cliente
async function consultarContasPorCliente() {
    const id_cliente_contas = document.getElementById('consulta-id-cliente-contas').value;
    if (!id_cliente_contas) {
        alert('Por favor, digite o ID do cliente.');
        return;
    }

    try {
        // CRÍTICO: Esta rota (/api/consulta/contas-cliente/:id_cliente)
        // foi removida/alterada no backend para /api/cliente/:id_usuario/contas.
        // Para que esta função funcione, a rota antiga foi RE-ADICIONADA ao backend.
        // O backend agora espera o ID do cliente para esta consulta.
        const response = await fetch(`${API_URL}/consulta/contas-cliente/${id_cliente_contas}`);
        const data = await response.json();
        const resultadoDiv = document.getElementById('resultado-consulta-contas');
        resultadoDiv.innerHTML = '';

        if (response.ok) {
            if (data.length > 0) {
                let html = `<h4>Contas do Cliente (ID: ${id_cliente_contas}):</h4>`;
                html += `<ul>`;
                data.forEach(conta => {
                    // Estas propriedades vêm diretamente da vw_resumo_contas no backend
                    html += `<li>Conta ID: ${conta.id_conta} | Número: ${conta.numero_conta} | Tipo: ${conta.tipo_conta} | Saldo: R$ ${parseFloat(conta.saldo).toFixed(2).replace('.', ',')} | Status: ${conta.status}</li>`;
                });
                html += `</ul>`;
                resultadoDiv.innerHTML = html;
            } else {
                resultadoDiv.innerHTML = `<p>Nenhuma conta encontrada para o cliente ID ${id_cliente_contas}.</p>`;
            }
        } else {
            resultadoDiv.innerHTML = `<p style="color: red;">${data.message || 'Erro desconhecido.'}</p>`;
        }
    } catch (error) {
        console.error('Erro na consulta de contas por cliente:', error);
        document.getElementById('resultado-consulta-contas').innerHTML = '<p style="color: red;">Erro ao conectar com o servidor.</p>';
    }
}

// RF2.4 - Função para alterar dados
async function alterarDados() {
    const id_usuario_alterar = document.getElementById('alterar-id-usuario').value;
    const campo_a_alterar = document.getElementById('campo-a-alterar').value;
    const novo_valor = document.getElementById('novo-valor-alteracao').value;
    const senha_admin = document.getElementById('alterar-senha-admin').value;
    const otp_admin = document.getElementById('alterar-otp-admin').value;

    if (!id_usuario_alterar || !campo_a_alterar || !novo_valor || !senha_admin || !otp_admin) {
        alert('Por favor, preencha todos os campos para alteração.');
        return;
    }

    let endpoint;
    let bodyData = {
        senha_admin,
        otp_admin,
        id_funcionario_acao: currentEmployeeId // ID do funcionário que está fazendo a ação
    };

    if (campo_a_alterar === 'telefone') {
        endpoint = `${API_URL}/cliente/${id_usuario_alterar}/alterar-telefone`;
        bodyData.novo_telefone = novo_valor;
    } else if (campo_a_alterar === 'senha') {
        alert('Alteração de senha deve ser feita por uma rota específica para garantir a criptografia e validação de força da senha.');
        return;
    } else {
        alert('Campo a alterar não implementado neste exemplo.');
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            fecharModal('modal4');
        } else {
            alert('Erro ao alterar dados: ' + (data.message || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Erro na requisição de alteração de dados:', error);
        alert('Erro ao conectar com o servidor para alterar dados.');
    }
}