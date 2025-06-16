# Projeto Banco Malvader

Este é um projeto que simula um sistema bancário simples, com interfaces para clientes e funcionários, e um backend que gerencia as operações financeiras e dados de usuários através de um banco de dados MySQL.

## Visão Geral

O sistema **Banco Malvader** é composto por um frontend em HTML, CSS e JavaScript e um backend em Node.js com Express e MySQL. Ele foi desenvolvido com o objetivo de demonstrar as funcionalidades básicas de um sistema bancário, incluindo autenticação, gerenciamento de contas e transações, e funcionalidades específicas para clientes e funcionários.

> **Estado Atual do Projeto:**  
> O projeto está em desenvolvimento e algumas funcionalidades ainda não estão 100% operacionais, especialmente as ações nas páginas de cliente e funcionário.

---

## Funcionalidades (Implementadas e em Desenvolvimento)

### Funcionalidades Gerais

#### Autenticação de Usuário (RF1.1 & RF1.2)
- Tela de login com opções para "Funcionário" e "Cliente".
- Login com CPF/Código e senha.
- Exige autenticação OTP (One-Time Password) gerado pelo banco e válido por 5 minutos após a primeira etapa do login.
- Tentativas de login (sucesso/falha) são registradas na tabela de auditoria.

#### Encerramento de Sessão (Logout) (RF3.2)
- Permite que o usuário encerre sua sessão, com registro em auditoria.

---

### Funcionalidades do Lado do Cliente (RF3.X)

- **Visualização de Contas:** Clientes podem visualizar as contas associadas ao seu perfil.
- **Saldo e Projeção (RF3.1):** Exibição do saldo atual da conta selecionada e uma projeção de rendimento para contas poupança e investimento.
- **Extrato (Movimentações Recentes) (RF3.1):** Visualiza as últimas transações (últimos 90 dias, limitado a 50 transações por padrão).

#### Operações Transacionais
- **Depósito:** Funcionalidade para depositar valores em uma conta.
- **Saque:** Funcionalidade para sacar valores de uma conta.
- **Transferência:** Permite transferir valores entre contas (com validação de saldo e limite, e aplicação de taxas para saques excessivos).

#### Funcionalidades em Desenvolvimento (Placeholders)
- Cartões
- Pagamentos

---

### Funcionalidades do Lado do Funcionário (RF2.X)

- **Abertura de Conta (RF2.1):** Funcionários podem abrir novas contas para clientes, incluindo dados pessoais, endereço e tipo de conta.
- **Encerramento de Conta (RF2.2):** Permite o encerramento de contas, com validações de saldo e permissão de administrador. Requer senha e OTP do funcionário administrador.
- **Consulta de Dados (RF2.3):**
  - Consulta de clientes por CPF: nome, CPF, data de nascimento, telefone e score de crédito.
  - Consulta de contas por ID do cliente: número da conta, saldo, tipo e status.
- **Alteração de Dados (RF2.4):** Permite alteração de dados como telefone por funcionários com permissão de administrador. A alteração é registrada em auditoria.

#### Funcionalidades em Desenvolvimento (Placeholders)
- Cadastro de Funcionários
- Geração de Relatórios

---

## Tecnologias Utilizadas

### Backend
- Node.js
- Express.js
- MySQL2
- Dotenv

### Frontend
- HTML5
- CSS3
- JavaScript

### Banco de Dados
- MySQL

---

## Configuração e Execução do Projeto

### 1. Pré-requisitos
- Node.js (versão 14 ou superior)
- MySQL Server (versão 8.0 ou superior)

---

### 2. Configuração do Banco de Dados

Crie o banco de dados executando o seguinte comando:

```bash
mysql -u seu_usuario -p < caminho/para/banco_malvader.sql
```

(Substitua `seu_usuario` pelo seu usuário MySQL e `caminho/para/banco_malvader.sql` pelo caminho do arquivo `.sql`).

---

### 3. Configuração do Backend

Acesse a pasta do backend:

```bash
cd trabalhoBancoUCB/backend
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env`:

```
DB_HOST=localhost  
DB_USER=root  
DB_PASSWORD=sua_senha_mysql  
DB_DATABASE=banco_malvader  
DB_PORT=3306
```

Inicie o servidor backend:

```bash
node server.js
```

A aplicação estará disponível em `http://localhost:3006`.

---

### 4. Configuração do Frontend

Navegue até a pasta do frontend:

```bash
cd ../frontend
```

Ou a partir da raiz do projeto:

```bash
cd trabalhoBancoUCB/frontend
```

Abra os arquivos HTML diretamente no navegador:

- `login.html`: Página de login
- `index.html`: Área do cliente
- `indexFuncionario.html`: Área do funcionário

---

## Problemas Conhecidos e Próximos Passos (To-Do)

### Frontend

- Funcionalidades de **Cartões** e **Pagamentos** são placeholders.
- **Cadastro de Funcionários** e **Geração de Relatórios** também são placeholders.
- Melhorar validações de entrada (CPF, telefone, etc.).

### Backend

- A rota `/api/consulta/contas-cliente/:id_cliente` foi re-adicionada apenas para compatibilidade. O ideal é usar `id_usuario` como nas outras rotas.
- Melhorar mensagens de erro e feedbacks.
- Substituir o hash MD5 por `bcrypt` com salting.
- Implementar autenticação com JWT ou sessões seguras.
- Validar e sanitizar inputs para evitar SQL Injection.
- Finalizar lógicas de cadastro de funcionários e geração de relatórios.

### Banco de Dados

- O `numero_conta` gerado na `procedure abrir_conta` precisa de uma lógica mais robusta.
- O trigger `validar_senha` só verifica formato MD5. Validações de força devem ocorrer no frontend/backend antes do envio ao banco.

---

## Licença

Este projeto foi desenvolvido como parte de uma atividade acadêmica e não está licenciado para uso comercial.