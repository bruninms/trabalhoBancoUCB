// PAGINA INDEX - CLIENTE

document.addEventListener('DOMContentLoaded', () => {
  // seu código já existente aqui...

  const btnPerfil = document.getElementById('btn-perfil');
  const menuPerfil = document.getElementById('menu-perfil');
  const btnSair = document.getElementById('btn-sair');

  btnPerfil.addEventListener('click', (e) => {
    e.stopPropagation(); // evita fechar menu ao clicar no botão
    if (menuPerfil.style.display === 'block') {
      menuPerfil.style.display = 'none';
    } else {
      menuPerfil.style.display = 'block';
    }
  });

  // Fecha o menu se clicar fora dele
  document.addEventListener('click', () => {
    menuPerfil.style.display = 'none';
  });

  // Evento sair
  btnSair.addEventListener('click', () => {
    window.location.href = 'login.html';
  });
});

    const saldos = {
      'corrente': 1540.75,
      'poupanca': 8750.20,
      'investimento': 20235.00
    };

    const acoes = {
      'Extrato': 'Veja o histórico das suas movimentações bancárias.',
      'Depositar': 'Gere boletos ou utilize Pix para adicionar saldo.',
      'Saque': 'Retire dinheiro em caixas eletrônicos ou lojas parceiras.',
      'Transferência': 'Transfira valores para outras contas ou bancos.',
      'Cartões': 'Gerencie seus cartões físicos e virtuais.',
      'Pagamentos': 'Pague boletos e contas de consumo rapidamente.'
    };

    function atualizarSaldo() {
      const tipoConta = document.getElementById('select-conta').value;
      const valorSaldo = saldos[tipoConta];
      document.getElementById('valor-saldo').innerText = 'R$ ' + valorSaldo.toFixed(2).replace('.', ',');
    }

    function abrirModal(titulo) {
      document.getElementById('modal-acao').style.display = 'block';
      document.getElementById('titulo-modal').innerText = titulo;
      document.getElementById('descricao-modal').innerText = acoes[titulo] || 'Informações sobre esta ação não disponíveis.';
    }

    function fecharModal() {
      document.getElementById('modal-acao').style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', () => {
      atualizarSaldo();

      document.getElementById('select-conta').addEventListener('change', atualizarSaldo);

      document.querySelectorAll('.acao').forEach(botao => {
        botao.addEventListener('click', () => {
          abrirModal(botao.getAttribute('data-titulo'));
        });
      });
    });

    // FIM PAGINA INDEX - CLIENTE