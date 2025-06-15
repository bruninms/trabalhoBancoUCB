// PAGINA INDEX - CLIENTE

const API_URL = 'http://localhost:3006/api'; // URL do seu backend
let currentClientId = null; // ID do cliente logado
let currentClientCPF = null; // CPF do cliente logado

document.addEventListener('DOMContentLoaded', async () => {
  // Obter id_usuario e tipo_usuario do sessionStorage
  const id_usuario = sessionStorage.getItem('id_usuario');
  const tipo_usuario = sessionStorage.getItem('tipo_usuario');
  currentClientCPF = sessionStorage.getItem('login_identifier'); // O CPF do cliente

  if (!id_usuario || tipo_usuario !== 'CLIENTE') {
    // Se não houver usuário logado ou não for cliente, redirecionar para o login
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
          window.location.href = 'login.html'; // Redireciona se não conseguir o ID do cliente
          return;
      }
  } catch (error) {
      console.error('Erro ao buscar ID do cliente:', error);
      alert('Erro ao conectar com o servidor para obter dados do cliente.');
      window.location.href = 'login.html';
      return;
  }


  // --- Código existente com alterações para usar o backend ---

  const btnPerfil = document.getElementById('btn-perfil');
  const menuPerfil = document.getElementById('menu-perfil');
  const btnSair = document.getElementById('btn-sair');
  const selectConta = document.getElementById('select-conta');
  const valorSaldo = document.getElementById('valor-saldo');
  const acoes = {
    'Extrato': 'Veja o histórico das suas movimentações bancárias.',
    'Depositar': 'Gere boletos ou utilize Pix para adicionar saldo.',
    'Saque': 'Retire dinheiro em caixas eletrônicos ou lojas parceiras.',
    'Transferência': 'Transfira valores para outras contas ou bancos.',
    'Cartões': 'Gerencie seus cartões físicos e virtuais.',
    'Pagamentos': 'Pague boletos e contas de consumo rapidamente.'
  };

  btnPerfil.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menuPerfil.style.display === 'block') {
      menuPerfil.style.display = 'none';
    } else {
      menuPerfil.style.display = 'block';
    }
  });

  document.addEventListener('click', () => {
    menuPerfil.style.display = 'none';
  });

  // Evento sair (logout)
  btnSair.addEventListener('click', async () => {
      try {
          const response = await fetch(`${API_URL}/logout`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ id_usuario: id_usuario })
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
  });


  // Função para carregar as contas do cliente
  async function carregarContasDoCliente() {
      try {
          // *** ALTERADO: Usar o endpoint correto que espera id_usuario ***
          const response = await fetch(`${API_URL}/cliente/${id_usuario}/contas`);
          const contas = await response.json();

          selectConta.innerHTML = ''; // Limpa as opções existentes
          if (contas && contas.length > 0) {
              contas.forEach(conta => {
                  const option = document.createElement('option');
                  option.value = conta.id_conta; // id_conta ou numero_conta, dependendo de como você quer identificar
                  option.textContent = `Conta ${conta.tipo_conta}`;
                  selectConta.appendChild(option);
              });
              // Atualiza o saldo para a primeira conta carregada
              atualizarSaldo();
          } else {
              const option = document.createElement('option');
              option.value = '';
              option.textContent = 'Nenhuma conta encontrada';
              selectConta.appendChild(option);
              valorSaldo.innerText = 'R$ 0,00';
          }
      } catch (error) {
          console.error('Erro ao carregar contas do cliente:', error);
          // A mensagem de erro detalhada do backend deve aparecer aqui se o frontend mostrar o error.message
          alert('Erro ao carregar suas contas: ' + (error.message || 'Verifique o console do servidor para mais detalhes.'));
          valorSaldo.innerText = 'R$ 0,00';
      }
  }

  // Função para atualizar o saldo
  async function atualizarSaldo() {
    const selectedAccountId = selectConta.value;
    if (!selectedAccountId) {
        valorSaldo.innerText = 'R$ 0,00';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/conta/${selectedAccountId}/saldo`);
        const data = await response.json();

        if (response.ok) {
            valorSaldo.innerText = 'R$ ' + parseFloat(data.saldo).toFixed(2).replace('.', ',');
            // Você também pode exibir a projeção de rendimentos se quiser
            // console.log("Projeção de Rendimento:", data.projecao_rendimento);
        } else {
            alert('Erro ao buscar saldo: ' + (data.message || 'Desconhecido')); // Adicionado fallback para message
            valorSaldo.innerText = 'R$ 0,00';
        }
    } catch (error) {
        console.error('Erro ao conectar com o servidor para buscar saldo:', error);
        alert('Erro ao buscar saldo. Verifique sua conexão ou o console do servidor.');
        valorSaldo.innerText = 'R$ 0,00';
    }
  }

  function abrirModal(titulo) {
    document.getElementById('modal-acao').style.display = 'block';
    document.getElementById('titulo-modal').innerText = titulo;
    document.getElementById('descricao-modal').innerText = acoes[titulo] || 'Informações sobre esta ação não disponíveis.';

    // Aqui você pode adicionar lógica para carregar dados específicos do modal
    if (titulo === 'Extrato') {
        const selectedAccountId = selectConta.value;
        if (selectedAccountId) {
            carregarExtrato(selectedAccountId);
        } else {
            document.getElementById('descricao-modal').innerText = 'Selecione uma conta para ver o extrato.';
        }
    }
    // Outras lógicas para Depositar, Saque, Transferência, etc.
  }

  async function carregarExtrato(accountId) {
      try {
          const response = await fetch(`${API_URL}/conta/${accountId}/extrato?limite=50&periodo=90d`); // Últimas 50 transações dos últimos 90 dias
          const transacoes = await response.json();

          let extratoHtml = '<h4>Últimas Transações:</h4>';
          if (transacoes && transacoes.length > 0) {
              extratoHtml += '<ul>';
              transacoes.forEach(t => {
                  extratoHtml += `<li>${new Date(t.data_hora).toLocaleDateString()} - ${t.tipo_transacao}: R$ ${parseFloat(t.valor).toFixed(2).replace('.', ',')} (${t.descricao || 'N/A'})</li>`;
              });
              extratoHtml += '</ul>';
          } else {
              extratoHtml += '<p>Nenhuma transação recente.</p>';
          }
          document.getElementById('descricao-modal').innerHTML = extratoHtml;

      } catch (error) {
          console.error('Erro ao carregar extrato:', error);
          document.getElementById('descricao-modal').innerText = 'Erro ao carregar extrato: ' + (error.message || 'Verifique sua conexão.');
      }
  }


  function fecharModal() {
    document.getElementById('modal-acao').style.display = 'none';
  }

  // Event Listeners
  selectConta.addEventListener('change', atualizarSaldo);

  document.querySelectorAll('.acao').forEach(botao => {
    botao.addEventListener('click', () => {
      abrirModal(botao.getAttribute('data-titulo'));
    });
  });

  // Inicializa carregando as contas do cliente
  await carregarContasDoCliente();
});

// FIM PAGINA INDEX - CLIENTE