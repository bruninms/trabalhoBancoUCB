// PAGINA INDEX - CLIENTE

const API_URL = 'http://localhost:3006/api'; // URL correta do seu backend

// 1. Declarar variáveis no escopo GLOBAL (topo do arquivo)
//    Isso as torna acessíveis por todas as funções do script.
let currentClientId = null;
let currentClientCPF = null;
let currentUserId = null;

let btnPerfil;
let menuPerfil;
let btnSair;
let selectConta;
let valorSaldo;
let modalAcao;
let modalTitulo;
let modalDescricao;
let modalCamposDinamicos;
let modalBtnConcluir;

document.addEventListener('DOMContentLoaded', async () => {
  // 2. ATRIBUIÇÃO DOS ELEMENTOS DO DOM AQUI, DENTRO DO DOMContentLoaded.
  //    Isso garante que os elementos HTML já existam na página quando o script tenta encontrá-los.
  btnPerfil = document.getElementById('btn-perfil');
  menuPerfil = document.getElementById('menu-perfil');
  btnSair = document.getElementById('btn-sair');
  selectConta = document.getElementById('select-conta'); 
  valorSaldo = document.getElementById('valor-saldo');
  modalAcao = document.getElementById('modal-acao'); 
  modalTitulo = document.getElementById('titulo-modal');
  modalDescricao = document.getElementById('descricao-modal');
  modalCamposDinamicos = document.getElementById('modal-campos-dinamicos');
  modalBtnConcluir = document.getElementById('modal-btn-concluir');


  // Obter id_usuario e tipo_usuario do sessionStorage
  const id_usuario = sessionStorage.getItem('id_usuario');
  const tipo_usuario = sessionStorage.getItem('tipo_usuario');
  currentClientCPF = sessionStorage.getItem('login_identifier');
  currentUserId = id_usuario;

  if (!id_usuario || tipo_usuario !== 'CLIENTE') {
    alert('Você não está logado como cliente. Redirecionando para a tela de login.');
    window.location.href = 'login.html';
    return;
  }

  // Buscar o id_cliente do id_usuario
  try {
      const clienteResponse = await fetch(`${API_URL}/consulta/cliente/${currentClientCPF}`);
      const clienteData = await clienteResponse.json();
      if (clienteResponse.ok) {
          currentClientId = clienteData.id_cliente;
          console.log("ID do Cliente:", currentClientId);
      } else {
          alert('Erro ao obter ID do cliente: ' + (clienteData.message || 'Desconhecido'));
          window.location.href = 'login.html';
          return;
      }
  } catch (error) {
      console.error('Erro ao buscar ID do cliente:', error);
      alert('Erro ao conectar com o servidor para obter dados do cliente.');
      window.location.href = 'login.html';
      return;
  }


  // --- Código existente com alterações para usar o backend ---

  // Definição do objeto 'acoes' com funções de callback
  const acoes = {
    'Extrato': {
        descricao: 'Veja o histórico das suas movimentações bancárias.',
        camposHtml: '',
        funcaoConcluir: null
    },
    'Depositar': {
        descricao: 'Gere boletos ou utilize Pix para adicionar saldo.',
        camposHtml: `
            <label>Valor do Depósito</label>
            <input type="number" id="valor-deposito" step="0.01" placeholder="R$" />
        `,
        funcaoConcluir: realizarDeposito
    },
    'Saque': {
        descricao: 'Retire dinheiro em caixas eletrônicos ou lojas parceiras.',
        camposHtml: `
            <label>Valor do Saque</label>
            <input type="number" id="valor-saque" step="0.01" placeholder="R$" />
        `,
        funcaoConcluir: realizarSaque
    },
    'Transferência': {
        descricao: 'Transfira valores para outras contas ou bancos.',
        camposHtml: `
            <label>Valor da Transferência</label>
            <input type="number" id="valor-transferencia" step="0.01" placeholder="R$" />
            <label>Número da Conta de Destino</label>
            <input type="text" id="conta-destino" placeholder="Número da conta (ex: 1234567890-0)" />
            <label>Descrição (Opcional)</label>
            <input type="text" id="descricao-transferencia" placeholder="Ex: Pagamento aluguel" />
        `,
        funcaoConcluir: realizarTransferencia
    },
    'Cartões': {
        descricao: 'Gerencie seus cartões físicos e virtuais. (Funcionalidade em desenvolvimento)',
        camposHtml: '',
        funcaoConcluir: null
    },
    'Pagamentos': {
        descricao: 'Pague boletos e contas de consumo rapidamente. (Funcionalidade em desenvolvimento)',
        camposHtml: '',
        funcaoConcluir: null
    }
  };

  // Adicionar listeners de evento APENAS SE OS ELEMENTOS FOREM ENCONTRADOS
  if (btnPerfil) {
    btnPerfil.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menuPerfil) {
        if (menuPerfil.style.display === 'block') {
          menuPerfil.style.display = 'none';
        } else {
          menuPerfil.style.display = 'block';
        }
      }
    });
  }

  if (document) { // document sempre existe
    document.addEventListener('click', () => {
      if (menuPerfil) {
        menuPerfil.style.display = 'none';
      }
    });
  }
  
  if (btnSair) {
    btnSair.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_usuario: currentUserId })
            });
            const data = await response.json();
            if (response.ok) {
                sessionStorage.clear();
                window.location.href = 'login.html';
            } else {
                alert('Erro ao fazer logout: ' + (data.message || 'Desconhecido'));
            }
        } catch (error) {
            console.error('Erro de rede ao fazer logout:', error);
            alert('Erro ao conectar com o servidor para logout.');
        }
    });
  }

  // Listener para o selectConta - este era um dos pontos de erro
  if (selectConta) {
    selectConta.addEventListener('change', atualizarSaldo);
  }

  // Mapeia os botões de ação para a função abrirModal
  document.querySelectorAll('.acao').forEach(botao => {
    if (botao) { // Verifica se o botão existe
        botao.addEventListener('click', () => {
            const titulo = botao.getAttribute('data-titulo');
            abrirModal(titulo); // Chama a função global abrirModal

            // Se for Cartões ou Pagamentos, executa a função logo após abrir o modal
            if (titulo === 'Cartões') {
                gerenciarCartoes();
            } else if (titulo === 'Pagamentos') {
                realizarPagamentos();
            }
        });
    }
  });

  // Inicializa carregando as contas do cliente
  await carregarContasDoCliente();

}); // Fim de DOMContentLoaded

// --- Funções Auxiliares e de Interação com o Backend ---
// IMPORTANTÍSSIMO: Todas estas funções estão no escopo GLOBAL,
// tornando-as acessíveis para os event listeners e onclicks no HTML.

// Função para fechar o modal
function fecharModal() {
  if (modalAcao) { // Verifica se modalAcao existe antes de tentar manipular
    modalAcao.style.display = 'none';
  }
  document.body.classList.remove('no-scroll'); // Reativa a rolagem do body
  if (modalBtnConcluir) { // Verifica se o botão existe antes de limpar o onclick
      modalBtnConcluir.onclick = null; // Limpa o event listener do botão
  }
}

// Função para abrir o modal de ações
function abrirModal(titulo) {
  if (modalAcao && modalTitulo && modalDescricao && modalCamposDinamicos && modalBtnConcluir) { // Verifica se todos os elementos existem
    modalAcao.style.display = 'flex'; // Exibe o modal (que agora é o overlay)
    document.body.classList.add('no-scroll'); // Impede rolagem do body

    modalTitulo.innerText = titulo;
    const acaoInfo = acoes[titulo] || { descricao: 'Informações sobre esta ação não disponíveis.', camposHtml: '', funcaoConcluir: null };
    modalDescricao.innerHTML = `<p>${acaoInfo.descricao}</p>`;
    modalCamposDinamicos.innerHTML = acaoInfo.camposHtml;

    // Conecta a função de conclusão ao botão "Concluir" do modal
    if (acaoInfo.funcaoConcluir) {
        modalBtnConcluir.style.display = 'block'; // Mostra o botão
        modalBtnConcluir.onclick = () => acaoInfo.funclaoConcluir(selectConta ? selectConta.value : null); // Passa o ID da conta selecionada
    } else {
        modalBtnConcluir.style.display = 'none'; // Esconde o botão se não houver função de conclusão
        modalBtnConcluir.onclick = null; // Garante que nenhum handler antigo permaneça
    }

    // Lógica específica para Extrato
    if (titulo === 'Extrato') {
        const selectedAccountId = selectConta ? selectConta.value : null; // Verifica selectConta
        if (selectedAccountId) {
            carregarExtrato(selectedAccountId);
        } else {
            modalDescricao.innerHTML = '<p style="color: red;">Selecione uma conta para ver o extrato.</p>';
        }
    }
    // Lógica para Cartões e Pagamentos - apenas mostra a descrição e fecha o modal
    if (titulo === 'Cartões' || titulo === 'Pagamentos') {
        modalBtnConcluir.style.display = 'none'; // Não há botão de concluir para estas ações
    }
  } else {
    console.error("Erro: Um ou mais elementos do modal não foram encontrados no DOM.");
    alert("Erro ao abrir modal. Recarregue a página ou contate o suporte.");
  }
}


// Função para carregar as contas do cliente
async function carregarContasDoCliente() {
    try {
        const response = await fetch(`${API_URL}/cliente/${currentUserId}/contas`);
        const contas = await response.json();

        if (selectConta) { // Verifica se selectConta existe
            selectConta.innerHTML = '';
            if (contas && contas.length > 0) {
                contas.forEach(conta => {
                    const option = document.createElement('option');
                    option.value = conta.id_conta;
                    option.textContent = `Conta ${conta.tipo_conta}`;
                    selectConta.appendChild(option);
                });
                atualizarSaldo();
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Nenhuma conta encontrada';
                selectConta.appendChild(option);
                if (valorSaldo) valorSaldo.innerText = 'R$ 0,00';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar contas do cliente:', error);
        alert('Erro ao carregar suas contas: ' + (error.message || 'Verifique o console do servidor para mais detalhes.'));
        if (valorSaldo) valorSaldo.innerText = 'R$ 0,00';
    }
}

// Função para atualizar o saldo
async function atualizarSaldo() {
  const selectedAccountId = selectConta ? selectConta.value : null;
  if (!selectedAccountId) {
      if (valorSaldo) valorSaldo.innerText = 'R$ 0,00';
      return;
  }

  try {
      const response = await fetch(`${API_URL}/conta/${selectedAccountId}/saldo`);
      const data = await response.json();

      if (response.ok) {
          if (valorSaldo) valorSaldo.innerText = 'R$ ' + parseFloat(data.saldo).toFixed(2).replace('.', ',');
      } else {
          alert('Erro ao buscar saldo: ' + (data.message || 'Desconhecido'));
          if (valorSaldo) valorSaldo.innerText = 'R$ 0,00';
      }
  } catch (error) {
      console.error('Erro ao conectar com o servidor para buscar saldo:', error);
      alert('Erro ao buscar saldo. Verifique sua conexão ou o console do servidor.');
      if (valorSaldo) valorSaldo.innerText = 'R$ 0,00';
  }
}

// Função para carregar o extrato
async function carregarExtrato(accountId) {
    try {
        const response = await fetch(`${API_URL}/conta/${accountId}/extrato?limite=50&periodo=90d`);
        const transacoes = await response.json();

        let extratoHtml = '<h4>Últimas Transações:</h4>';
        if (transacoes && transacoes.length > 0) {
            extratoHtml += '<ul>';
            transacoes.forEach(t => {
                const valorFormatado = parseFloat(t.valor).toFixed(2).replace('.', ',');
                const dataFormatada = new Date(t.data_hora).toLocaleDateString('pt-BR');
                const tipoTransacao = t.tipo_transacao.charAt(0).toUpperCase() + t.tipo_transacao.slice(1).toLowerCase();
                const descricao = t.descricao || '';
                const contaOrigem = t.numero_conta_origem;
                const contaDestino = t.numero_conta_destino;

                let detalhesAdicionais = [];
                if (t.tipo_transacao === 'SAQUE' && contaOrigem) detalhesAdicionais.push(`Conta: ${contaOrigem}`);
                if (t.tipo_transacao === 'DEPOSITO' && contaOrigem) detalhesAdicionais.push(`Conta: ${contaOrigem}`);
                if (t.tipo_transacao === 'TRANSFERENCIA') {
                    if (t.id_conta_origem == accountId) {
                        detalhesAdicionais.push(`Para: ${contaDestino}`);
                    } else if (t.id_conta_destino == accountId) {
                        detalhesAdicionais.push(`De: ${contaOrigem}`);
                    }
                }
                if (descricao) detalhesAdicionais.push(descricao);

                extratoHtml += `<li>${dataFormatada} - ${tipoTransacao}: R$ ${valorFormatado}`;
                if (detalhesAdicionais.length > 0) {
                    extratoHtml += ` (${detalhesAdicionais.join('; ')})`;
                }
                extratoHtml += `</li>`;
            });
            extratoHtml += '</ul>';
        } else {
            extratoHtml += '<p>Nenhuma transação recente.</p>';
        }
        if (modalDescricao) modalDescricao.innerHTML = extratoHtml;
    } catch (error) {
        console.error('Erro ao carregar extrato:', error);
        if (modalDescricao) modalDescricao.innerHTML = '<p style="color: red;">Erro ao carregar extrato: ' + (error.message || 'Verifique sua conexão.') + '</p>';
    }
}

// --- Funções para ações de Depositar, Saque, Transferência ---

async function realizarDeposito(accountId) {
    const valorInput = document.getElementById('valor-deposito');
    const valor = parseFloat(valorInput ? valorInput.value : 0);

    if (isNaN(valor) || valor <= 0) {
        alert('Por favor, digite um valor de depósito válido.');
        return;
    }
    if (!accountId) {
        alert('Por favor, selecione uma conta.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/transacao/deposito`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_conta: accountId, valor: valor, id_usuario_acao: currentUserId })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Depósito realizado com sucesso! ' + (data.message || ''));
            fecharModal();
            await atualizarSaldo();
        } else {
            alert('Erro ao realizar depósito: ' + (data.message || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Erro na requisição de depósito:', error);
        alert('Erro ao conectar com o servidor para depósito.');
    }
}

async function realizarSaque(accountId) {
    const valorInput = document.getElementById('valor-saque');
    const valor = parseFloat(valorInput ? valorInput.value : 0);

    if (isNaN(valor) || valor <= 0) {
        alert('Por favor, digite um valor de saque válido.');
        return;
    }
    if (!accountId) {
        alert('Por favor, selecione uma conta.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/transacao/saque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_conta: accountId, valor: valor, id_usuario_acao: currentUserId })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Saque realizado com sucesso! ' + (data.message || ''));
            fecharModal();
            await atualizarSaldo();
        } else {
            alert('Erro ao realizar saque: ' + (data.message || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Erro na requisição de saque:', error);
        alert('Erro ao conectar com o servidor para saque.');
    }
}

async function realizarTransferencia(accountId) {
    const valorInput = document.getElementById('valor-transferencia');
    const contaDestinoInput = document.getElementById('conta-destino');
    const descricaoInput = document.getElementById('descricao-transferencia');

    const valor = parseFloat(valorInput ? valorInput.value : 0);
    const contaDestinoNumero = contaDestinoInput ? contaDestinoInput.value : '';
    const descricao = descricaoInput ? descricaoInput.value : '';

    if (isNaN(valor) || valor <= 0 || !contaDestinoNumero) {
        alert('Por favor, preencha o valor e o número da conta de destino.');
        return;
    }
    if (!accountId) {
        alert('Por favor, selecione uma conta de origem.');
        return;
    }
    if (accountId == contaDestinoNumero) {
        alert('Não é possível transferir para a mesma conta de origem.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/transacao/transferencia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_conta_origem: accountId,
                numero_conta_destino: contaDestinoNumero,
                valor: valor,
                descricao: descricao,
                id_usuario_acao: currentUserId
            })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Transferência realizada com sucesso! ' + (data.message || ''));
            fecharModal();
            await atualizarSaldo();
        } else {
            alert('Erro ao realizar transferência: ' + (data.message || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Erro na requisição de transferência:', error);
        alert('Erro ao conectar com o servidor para transferência.');
    }
}

// --- Funções para Cartões e Pagamentos (placeholder) ---
function gerenciarCartoes() {
    alert(acoes['Cartões'].descricao);
    fecharModal();
}

function realizarPagamentos() {
    alert(acoes['Pagamentos'].descricao);
    fecharModal();
}

// Event Listeners
// Estes listeners já são adicionados dentro do DOMContentLoaded no bloco principal.
// Não é necessário declará-los novamente aqui.
// selectConta.addEventListener('change', atualizarSaldo); // Removido: já está no DOMContentLoaded

// Mapeia os botões de ação para a função abrirModal
// Estes listeners já são adicionados dentro do DOMContentLoaded
// (Já estão lá no DOMContentLoaded do código que eu forneci anteriormente)