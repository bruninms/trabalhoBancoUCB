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

    // INDEX FUNCIONARIO

    function fecharModal(id) {
      document.getElementById(id).style.display = 'none';
    }

    window.addEventListener('DOMContentLoaded', () => {
      const items = document.querySelectorAll(".item-menu");
      const modais = document.querySelectorAll(".modal-funcionario");

      items.forEach(item => {
        item.addEventListener("click", () => {
          const id = item.getAttribute("data-modal");
          modais.forEach(modal => modal.style.display = "none");
          const selectedModal = document.getElementById(id);
          if (selectedModal) selectedModal.style.display = "block";
        });
      });

      const tipoConta = document.getElementById("tipo-conta");
      const camposContainer = document.getElementById("campos-conta");

      if (tipoConta) {
        tipoConta.addEventListener("change", () => {
          const tipo = tipoConta.value;
          camposContainer.innerHTML = "";

          if (tipo === "CP") {
            camposContainer.innerHTML = `
              <label>Rendimento Mensal (%)</label>
              <input type="number" placeholder="Ex: 0.6" />

              <label>Data de Aniversário da Conta</label>
              <input type="number" placeholder="Dia do mês (Ex: 15)" min="1" max="31" />

              <label>Limite de Saque Diário</label>
              <input type="number" placeholder="Ex: 1000.00" />
            `;
          }

          if (tipo === "CC") {
            camposContainer.innerHTML = `
              <label>Limite do Cheque Especial</label>
              <input type="number" placeholder="Ex: 2000.00" />

              <label>Tarifa Mensal</label>
              <input type="number" placeholder="Ex: 25.00" />

              <label>Possui Cartão de Crédito?</label>
              <select>
                <option>Sim</option>
                <option>Não</option>
              </select>
            `;
          }

          if (tipo === "CI") {
            camposContainer.innerHTML = `
              <label>Tipo de Investimento</label>
              <select>
                <option>CDB</option>
                <option>LCI</option>
                <option>Tesouro Direto</option>
                <option>LC</option>
                <option>LCA</option>
              </select>

              <label>Valor Inicial Investido</label>
              <input type="number" placeholder="Ex: 5000.00" />

              <label>Rentabilidade (%)</label>
              <input type="number" placeholder="Ex: 1.2" />

              <label>Prazo de Vencimento</label>
              <input type="date" />
            `;
          }
        });
      }
    });

    // FIM INDEX FUNCIONARIO

    //LOGIN
    let tipoUsuario = null; // cliente ou funcionario

    function verificarSenha() {
      const cpf = document.getElementById('cpf').value;
      const senha = document.getElementById('senha').value;
  
      if (cpf === '123.123.123-12' && senha === '123') {
        tipoUsuario = 'cliente';
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('otp-box').style.display = 'block';
      } else if (cpf !== '123.123.123-12') {
        alert('CPF incorreto');
      } else {
        alert('Senha incorreta');
      }
    }

    function verificarFuncionario() {
      const codigo = document.getElementById('codigo').value;
      const senhaFunc = document.getElementById('senha-func').value;

      if (codigo === 'FUNC123' && senhaFunc === 'senha123') {
        tipoUsuario = 'funcionario';
        document.getElementById('login-funcionario-box').style.display = 'none';
        document.getElementById('otp-box').style.display = 'block';
      } else {
        alert('Código ou senha de funcionário incorretos.');
      }
    }

    function validarOTP() {
      const otp = document.getElementById('otp').value;
      if (otp === '000000') {
        if (tipoUsuario === 'cliente') {
          window.location.href = 'index.html';
        } else if (tipoUsuario === 'funcionario') {
          window.location.href = 'indexFuncionario.html';
        }
      } else {
        alert('OTP inválido');
      }
    }

    function mostrarLoginFuncionario() {
      document.getElementById('login-box').style.display = 'none';
      document.getElementById('login-funcionario-box').style.display = 'block';
    }

    function mostrarCliente() {
      document.getElementById('login-funcionario-box').style.display = 'none';
      document.getElementById('login-box').style.display = 'block';
    }
    // FIM LOGIN