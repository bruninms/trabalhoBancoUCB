-- Define o delimitador para comandos que contêm ';', como gatilhos e procedures.
DELIMITER $$

-- Remove o banco de dados se ele já existir, para garantir um início limpo.
DROP DATABASE IF EXISTS banco_malvader$$

-- Cria o banco de dados.
CREATE DATABASE banco_malvader$$

-- Seleciona o banco de dados para todas as operações subsequentes.
USE banco_malvader$$

-- ===============================================
-- Criação das Tabelas
-- ===============================================

-- Tabela usuario
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(15) NOT NULL,
    tipo_usuario ENUM('FUNCIONARIO', 'CLIENTE') NOT NULL,
    senha_hash VARCHAR(32) NOT NULL, -- Armazena hash MD5 da senha
    otp_ativo VARCHAR(6),           -- Código OTP temporário
    otp_expiracao DATETIME          -- Data/hora de expiração do OTP
)$$

-- Tabela funcionario
CREATE TABLE funcionario (
    id_funcionario INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    codigo_funcionario VARCHAR(20) UNIQUE NOT NULL, -- Gerado automaticamente
    cargo ENUM('ESTAGIARIO', 'ATENDENTE', 'GERENTE') NOT NULL,
    id_supervisor INT, -- Hierarquia
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_supervisor) REFERENCES funcionario(id_funcionario)
)$$

-- Tabela cliente
CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    score_credito DECIMAL(5,2) DEFAULT 0, -- Calculado dinamicamente
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
)$$

-- Tabela endereco
CREATE TABLE endereco (
    id_endereco INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    cep VARCHAR(10) NOT NULL,
    local VARCHAR(100) NOT NULL,
    numero_casa INT NOT NULL,
    bairro VARCHAR(50) NOT NULL,
    cidade VARCHAR(50) NOT NULL,
    estado CHAR(2) NOT NULL,
    complemento VARCHAR(50), -- Opcional
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
)$$
-- Índice em cep para buscas rápidas
CREATE INDEX idx_endereco_cep ON endereco(cep)$$

-- Tabela agencia
CREATE TABLE agencia (
    id_agencia INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    codigo_agencia VARCHAR(10) UNIQUE NOT NULL,
    endereco_id INT,
    FOREIGN KEY (endereco_id) REFERENCES endereco(id_endereco)
)$$

-- Tabela conta
CREATE TABLE conta (
    id_conta INT AUTO_INCREMENT PRIMARY KEY,
    numero_conta VARCHAR(20) UNIQUE NOT NULL, -- Inclui dígito verificador
    id_agencia INT,
    saldo DECIMAL(15,2) NOT NULL DEFAULT 0,
    tipo_conta ENUM('POUPANCA', 'CORRENTE', 'INVESTIMENTO') NOT NULL,
    id_cliente INT,
    data_abertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('ATIVA', 'ENCERRADA', 'BLOQUEADA') NOT NULL DEFAULT 'ATIVA',
    FOREIGN KEY (id_agencia) REFERENCES agencia(id_agencia),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
)$$
-- Índice em numero_conta
CREATE INDEX idx_conta_numero ON conta(numero_conta)$$

-- Tabela conta_poupanca
CREATE TABLE conta_poupanca (
    id_conta_poupanca INT AUTO_INCREMENT PRIMARY KEY,
    id_conta INT UNIQUE,
    taxa_rendimento DECIMAL(5,2) NOT NULL, -- Personalizada por conta
    ultimo_rendimento DATETIME, -- Última aplicação do rendimento
    FOREIGN KEY (id_conta) REFERENCES conta(id_conta)
)$$

-- Tabela conta_corrente
CREATE TABLE conta_corrente (
    id_conta_corrente INT AUTO_INCREMENT PRIMARY KEY,
    id_conta INT UNIQUE,
    limite DECIMAL(15,2) NOT NULL DEFAULT 0,
    data_vencimento DATE NOT NULL,
    taxa_manutencao DECIMAL(5,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (id_conta) REFERENCES conta(id_conta)
)$$

-- Tabela conta_investimento
CREATE TABLE conta_investimento (
    id_conta_investimento INT AUTO_INCREMENT PRIMARY KEY,
    id_conta INT UNIQUE,
    perfil_risco ENUM('BAIXO', 'MEDIO', 'ALTO') NOT NULL,
    valor_minimo DECIMAL(15,2) NOT NULL,
    taxa_rendimento_base DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (id_conta) REFERENCES conta(id_conta)
)$$

-- Tabela transacao
CREATE TABLE transacao (
    id_transacao INT AUTO_INCREMENT PRIMARY KEY,
    id_conta_origem INT,
    id_conta_destino INT, -- Para transferências
    tipo_transacao ENUM('DEPOSITO', 'SAQUE', 'TRANSFERENCIA', 'TAXA', 'RENDIMENTO') NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descricao VARCHAR(100), -- Detalhe da transação
    FOREIGN KEY (id_conta_origem) REFERENCES conta(id_conta),
    FOREIGN KEY (id_conta_destino) REFERENCES conta(id_conta)
)$$
-- Índice em data_hora
CREATE INDEX idx_transacao_data_hora ON transacao(data_hora)$$


-- Tabela auditoria
CREATE TABLE auditoria (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    acao VARCHAR(50) NOT NULL, -- Ex.: "LOGIN", "ALTERACAO", "ENCERRAMENTO"
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detalhes TEXT, -- JSON ou texto com valores antigos/novos
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
)$$

-- Tabela relatorio
CREATE TABLE relatorio (
    id_relatorio INT AUTO_INCREMENT PRIMARY KEY,
    id_funcionario INT,
    tipo_relatorio VARCHAR(50) NOT NULL,
    data_geracao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    conteudo TEXT NOT NULL, -- Dados em formato JSON ou CSV
    FOREIGN KEY (id_funcionario) REFERENCES funcionario(id_funcionario)
)$$

-- ===============================================
-- Gatilhos (Triggers)
-- ===============================================

-- Gatilho: Atualização de Saldo
DROP TRIGGER IF EXISTS atualizar_saldo$$
CREATE TRIGGER atualizar_saldo AFTER INSERT ON transacao
FOR EACH ROW
BEGIN
    IF NEW.tipo_transacao = 'DEPOSITO' THEN
        UPDATE conta SET saldo = saldo + NEW.valor WHERE id_conta = NEW.id_conta_origem;
    ELSEIF NEW.tipo_transacao IN ('SAQUE', 'TAXA') THEN
        UPDATE conta SET saldo = saldo - NEW.valor WHERE id_conta = NEW.id_conta_origem;
    ELSEIF NEW.tipo_transacao = 'TRANSFERENCIA' THEN
        UPDATE conta SET saldo = saldo - NEW.valor WHERE id_conta = NEW.id_conta_origem;
        UPDATE conta SET saldo = saldo + NEW.valor WHERE id_conta = NEW.id_conta_destino;
    END IF;
END$$

-- Gatilho: Validação de Senha Forte
DROP TRIGGER IF EXISTS validar_senha$$
CREATE TRIGGER validar_senha BEFORE UPDATE ON usuario
FOR EACH ROW
BEGIN
    IF NEW.senha_hash NOT REGEXP '^[0-9a-f]{32}$' THEN -- Verifica se não é um hash MD5 válido
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A senha deve ser criptografada (MD5 ou superior) antes de ser armazenada. Utilize a procedure para atualização de senha.';
    END IF;
END$$

-- Gatilho: Limite de Depósito Diário
DROP TRIGGER IF EXISTS limite_deposito$$
CREATE TRIGGER limite_deposito BEFORE INSERT ON transacao
FOR EACH ROW
BEGIN
    DECLARE total_dia DECIMAL(15,2);
    
    IF NEW.tipo_transacao = 'DEPOSITO' AND NEW.id_conta_origem IS NOT NULL THEN
        SELECT SUM(valor) INTO total_dia
        FROM transacao
        WHERE id_conta_origem = NEW.id_conta_origem
          AND tipo_transacao = 'DEPOSITO'
          AND DATE(data_hora) = CURDATE();

        SET total_dia = IFNULL(total_dia, 0);

        IF (total_dia + NEW.valor) > 10000 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Limite diário de depósito excedido (R$ 10.000,00).';
        END IF;
    END IF;
END$$

-- ===============================================
-- Procedimentos Armazenados (Stored Procedures)
-- ===============================================

-- Procedure: gerar_otp
DROP PROCEDURE IF EXISTS gerar_otp$$
CREATE PROCEDURE gerar_otp(IN p_id_usuario INT)
BEGIN
    DECLARE novo_otp VARCHAR(6);
    SET novo_otp = LPAD(FLOOR(RAND() * 1000000), 6, '0');
    UPDATE usuario SET otp_ativo = novo_otp, otp_expiracao = NOW() + INTERVAL 5 MINUTE
    WHERE id_usuario = p_id_usuario;
    SELECT novo_otp;
END$$

-- Procedure: calcular_score_credito
DROP PROCEDURE IF EXISTS calcular_score_credito$$
CREATE PROCEDURE calcular_score_credito(IN p_id_cliente INT)
BEGIN
    DECLARE total_trans DECIMAL(15,2);
    DECLARE media_trans DECIMAL(15,2);
    
    SELECT SUM(valor), AVG(valor) INTO total_trans, media_trans
    FROM transacao t
    JOIN conta c ON t.id_conta_origem = c.id_conta
    WHERE c.id_cliente = p_id_cliente AND t.tipo_transacao IN ('DEPOSITO', 'SAQUE');
    
    SET total_trans = IFNULL(total_trans, 0);
    SET media_trans = IFNULL(media_trans, 0);

    UPDATE cliente SET score_credito = LEAST(100, (total_trans / 1000) + (media_trans / 100))
    WHERE id_cliente = p_id_cliente;
END$$

-- Procedure: abrir_conta (RF2.1 - Abertura de Conta)
DROP PROCEDURE IF EXISTS abrir_conta$$
CREATE PROCEDURE abrir_conta(
    IN p_nome VARCHAR(100),
    IN p_cpf VARCHAR(11),
    IN p_data_nascimento DATE,
    IN p_telefone VARCHAR(15),
    IN p_tipo_usuario ENUM('FUNCIONARIO', 'CLIENTE'),
    IN p_senha_clara VARCHAR(255), -- Senha em texto claro para hash
    IN p_cep VARCHAR(10),
    IN p_local VARCHAR(100),
    IN p_numero_casa INT,
    IN p_bairro VARCHAR(50),
    IN p_cidade VARCHAR(50),
    IN p_estado CHAR(2),
    IN p_complemento VARCHAR(50),
    IN p_id_agencia INT,
    IN p_tipo_conta ENUM('POUPANCA', 'CORRENTE', 'INVESTIMENTO'),
    IN p_taxa_rendimento DECIMAL(5,2), -- Para Conta Poupança
    IN p_limite DECIMAL(15,2),         -- Para Conta Corrente
    IN p_data_vencimento DATE,         -- Para Conta Corrente
    IN p_taxa_manutencao DECIMAL(5,2), -- Para Conta Corrente
    IN p_perfil_risco ENUM('BAIXO', 'MEDIO', 'ALTO'), -- Para Conta Investimento
    IN p_valor_minimo DECIMAL(15,2),   -- Para Conta Investimento
    IN p_taxa_rendimento_base DECIMAL(5,2) -- Para Conta Investimento
)
BEGIN
    DECLARE v_id_usuario INT;
    DECLARE v_id_cliente INT;
    DECLARE v_id_endereco INT;
    DECLARE v_id_conta INT;
    DECLARE v_numero_conta VARCHAR(20);
    DECLARE v_senha_hash VARCHAR(32);

    -- Gerar hash MD5 da senha
    SET v_senha_hash = MD5(p_senha_clara);

    -- Inserir novo usuário
    INSERT INTO usuario (nome, cpf, data_nascimento, telefone, tipo_usuario, senha_hash)
    VALUES (p_nome, p_cpf, p_data_nascimento, p_telefone, p_tipo_usuario, v_senha_hash);
    SET v_id_usuario = LAST_INSERT_ID();

    -- Inserir cliente (se for um cliente)
    IF p_tipo_usuario = 'CLIENTE' THEN
        INSERT INTO cliente (id_usuario) VALUES (v_id_usuario);
        SET v_id_cliente = LAST_INSERT_ID();
    END IF;

    -- Inserir endereço
    INSERT INTO endereco (id_usuario, cep, local, numero_casa, bairro, cidade, estado, complemento)
    VALUES (v_id_usuario, p_cep, p_local, p_numero_casa, p_bairro, p_cidade, p_estado, p_complemento);
    SET v_id_endereco = LAST_INSERT_ID();

    -- Gerar número da conta (exemplo simples, implementar Luhn ou mais complexo para dígito verificador)
    SET v_numero_conta = CONCAT(LPAD(FLOOR(RAND() * 10000000000), 10, '0'), '-', LPAD(FLOOR(RAND() * 10), 1, '0'));

    -- Inserir conta
    INSERT INTO conta (numero_conta, id_agencia, saldo, tipo_conta, id_cliente, data_abertura, status)
    VALUES (v_numero_conta, p_id_agencia, 0, p_tipo_conta, v_id_cliente, NOW(), 'ATIVA');
    SET v_id_conta = LAST_INSERT_ID();

    -- Inserir detalhes da conta específica
    IF p_tipo_conta = 'POUPANCA' THEN
        INSERT INTO conta_poupanca (id_conta, taxa_rendimento)
        VALUES (v_id_conta, p_taxa_rendimento);
    ELSEIF p_tipo_conta = 'CORRENTE' THEN
        INSERT INTO conta_corrente (id_conta, limite, data_vencimento, taxa_manutencao)
        VALUES (v_id_conta, p_limite, p_data_vencimento, p_taxa_manutencao);
    ELSEIF p_tipo_conta = 'INVESTIMENTO' THEN
        INSERT INTO conta_investimento (id_conta, perfil_risco, valor_minimo, taxa_rendimento_base)
        VALUES (v_id_conta, p_perfil_risco, p_valor_minimo, p_taxa_rendimento_base);
    END IF;

    -- Registrar abertura na auditoria
    INSERT INTO auditoria (id_usuario, acao, detalhes)
    VALUES (v_id_usuario, 'ABERTURA_CONTA', CONCAT('Conta ', v_numero_conta, ' do tipo ', p_tipo_conta, ' aberta.'));

    SELECT 'Conta aberta com sucesso!' AS message, v_numero_conta AS numero_conta, v_id_usuario AS id_usuario_criado;

END$$

-- Procedure: encerrar_conta (RF2.2 - Encerramento de Conta)
DROP PROCEDURE IF EXISTS encerrar_conta$$
CREATE PROCEDURE encerrar_conta(
    IN p_numero_conta VARCHAR(20),
    IN p_motivo TEXT,
    IN p_id_funcionario_acao INT,
    IN p_senha_admin_hash VARCHAR(32),
    IN p_otp_admin VARCHAR(6)
)
BEGIN
    DECLARE v_id_conta INT;
    DECLARE v_saldo DECIMAL(15,2);
    DECLARE v_id_cliente INT;
    DECLARE v_id_usuario_cliente INT;
    DECLARE v_otp_expiracao DATETIME;
    DECLARE v_otp_ativo VARCHAR(6);
    DECLARE v_admin_hash_correto VARCHAR(32);
    DECLARE v_admin_cargo ENUM('ESTAGIARIO', 'ATENDENTE', 'GERENTE');

    -- Verificar autenticação do funcionário administrador (senha e OTP)
    SELECT u.senha_hash, u.otp_ativo, u.otp_expiracao, f.cargo
    INTO v_admin_hash_correto, v_otp_ativo, v_otp_expiracao, v_admin_cargo
    FROM usuario u JOIN funcionario f ON u.id_usuario = f.id_usuario
    WHERE u.id_usuario = p_id_funcionario_acao;

    IF v_admin_hash_correto IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Funcionário administrador não encontrado.';
    END IF;

    IF v_admin_hash_correto <> p_senha_admin_hash THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Senha de administrador incorreta.';
    END IF;

    IF v_otp_ativo IS NULL OR v_otp_ativo <> p_otp_admin OR v_otp_expiracao < NOW() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'OTP de administrador inválido ou expirado.';
    END IF;
    
    -- Obter dados da conta
    SELECT id_conta, saldo, id_cliente INTO v_id_conta, v_saldo, v_id_cliente
    FROM conta
    WHERE numero_conta = p_numero_conta AND status = 'ATIVA';

    IF v_id_conta IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Conta não encontrada ou já encerrada/bloqueada.';
    END IF;

    -- Bloquear se saldo < 0 ou dívidas pendentes
    IF v_saldo < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Não é possível encerrar conta com saldo negativo.';
    END IF;

    -- Atualizar status da conta para "Encerrada"
    UPDATE conta SET status = 'ENCERRADA' WHERE id_conta = v_id_conta;

    -- Registrar motivo em auditoria (ou uma tabela de histórico dedicada, se criada)
    SELECT id_usuario INTO v_id_usuario_cliente FROM cliente WHERE id_cliente = v_id_cliente;
    INSERT INTO auditoria (id_usuario, acao, detalhes)
    VALUES (p_id_funcionario_acao, 'ENCERRAMENTO_CONTA', CONCAT('Conta ', p_numero_conta, ' encerrada por funcionário ID ', p_id_funcionario_acao, '. Motivo: ', p_motivo));

    SELECT 'Conta encerrada com sucesso.' AS message;
END$$


-- Procedure: realizar_transferencia (RF3.1 - Transferência)
DROP PROCEDURE IF EXISTS realizar_transferencia$$
CREATE PROCEDURE realizar_transferencia(
    IN p_id_conta_origem INT,
    IN p_id_conta_destino INT,
    IN p_valor DECIMAL(15,2),
    IN p_descricao VARCHAR(100),
    IN p_id_usuario_acao INT -- O ID do usuário que iniciou a transação (cliente ou funcionário)
)
BEGIN
    DECLARE v_saldo_origem DECIMAL(15,2);
    DECLARE v_limite_origem DECIMAL(15,2); -- Para conta corrente
    DECLARE v_tipo_conta_origem ENUM('POUPANCA', 'CORRENTE', 'INVESTIMENTO');
    DECLARE v_taxa_saque DECIMAL(15,2) DEFAULT 0;
    DECLARE v_num_saques_mes INT DEFAULT 0;
    
    -- Inicia a transação SQL para garantir atomicidade
    START TRANSACTION; 

    -- Bloqueia as linhas das contas para evitar problemas de concorrência
    SELECT c.saldo, cc.limite, c.tipo_conta
    INTO v_saldo_origem, v_limite_origem, v_tipo_conta_origem
    FROM conta c
    LEFT JOIN conta_corrente cc ON c.id_conta = cc.id_conta
    WHERE c.id_conta = p_id_conta_origem FOR UPDATE; 

    -- Verificar se a conta de origem existe e está ativa
    IF v_saldo_origem IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Conta de origem não encontrada ou inativa.';
    END IF;

    -- Verificar se a conta de destino existe e está ativa
    SELECT saldo FROM conta WHERE id_conta = p_id_conta_destino FOR UPDATE;
    IF ROW_COUNT() = 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Conta de destino não encontrada ou inativa.';
    END IF;

    -- Lógica de taxa para saques excessivos (adaptado para transferências como "saque" lógico)
    SELECT COUNT(*) INTO v_num_saques_mes
    FROM transacao
    WHERE id_conta_origem = p_id_conta_origem
      AND tipo_transacao = 'SAQUE'
      AND data_hora >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH);

    IF v_num_saques_mes >= 5 AND v_tipo_conta_orig IN ('POUPANCA', 'CORRENTE') THEN
        SET v_taxa_saque = 5.00; -- Exemplo de taxa
    END IF;

    -- Verificar saldo suficiente (saldo + limite para CC)
    IF v_tipo_conta_origem = 'CORRENTE' THEN
        IF (v_saldo_origem + IFNULL(v_limite_origem, 0)) < (p_valor + v_taxa_saque) THEN
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente na conta de origem (incluindo limite de cheque especial).';
        END IF;
    ELSE -- Poupança ou Investimento
        IF v_saldo_origem < (p_valor + v_taxa_saque) THEN
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente na conta de origem.';
        END IF;
    END IF;

    -- Realiza a transferência
    UPDATE conta SET saldo = saldo - (p_valor + v_taxa_saque) WHERE id_conta = p_id_conta_origem;
    UPDATE conta SET saldo = saldo + p_valor WHERE id_conta = p_id_conta_destino;

    -- Registra a transação de débito na conta de origem
    INSERT INTO transacao (id_conta_origem, id_conta_destino, tipo_transacao, valor, descricao)
    VALUES (p_id_conta_origem, p_id_conta_destino, 'TRANSFERENCIA', p_valor, p_descricao);

    -- Se houve taxa, registra a transação da taxa
    IF v_taxa_saque > 0 THEN
        INSERT INTO transacao (id_conta_origem, tipo_transacao, valor, descricao)
        VALUES (p_id_conta_origem, 'TAXA', v_taxa_saque, CONCAT('Taxa por ', v_num_saques_mes + 1, 'º saque/transferência no mês.'));
    END IF;

    -- Registrar em auditoria
    INSERT INTO auditoria (id_usuario, acao, detalhes)
    VALUES (p_id_usuario_acao, 'TRANSFERENCIA', CONCAT('Transferência de R$ ', p_valor, ' de conta ', p_id_conta_origem, ' para conta ', p_id_conta_destino, '. Taxa aplicada: R$ ', v_taxa_saque));

    COMMIT; -- Confirma a transação
    SELECT 'Transferência realizada com sucesso.' AS message;

END$$

-- Procedure: atualizar_dados_usuario (RF2.4 - Alteração de Dados - Usuário)
DROP PROCEDURE IF EXISTS atualizar_dados_usuario$$
CREATE PROCEDURE atualizar_dados_usuario(
    IN p_id_usuario INT,
    IN p_novo_nome VARCHAR(100),
    IN p_novo_cpf VARCHAR(11),
    IN p_novo_data_nascimento DATE,
    IN p_novo_telefone VARCHAR(15),
    IN p_novo_cep VARCHAR(10),
    IN p_novo_local VARCHAR(100),
    IN p_novo_numero_casa INT,
    IN p_novo_bairro VARCHAR(50),
    IN p_novo_cidade VARCHAR(50),
    IN p_novo_estado CHAR(2),
    IN p_novo_complemento VARCHAR(50),
    IN p_id_funcionario_acao INT,
    IN p_senha_admin_hash VARCHAR(32),
    IN p_otp_admin VARCHAR(6)
)
BEGIN
    DECLARE v_old_nome VARCHAR(100);
    DECLARE v_old_cpf VARCHAR(11);
    DECLARE v_old_data_nascimento DATE;
    DECLARE v_old_telefone VARCHAR(15);
    DECLARE v_old_cep VARCHAR(10);
    DECLARE v_old_local VARCHAR(100);
    DECLARE v_old_numero_casa INT;
    DECLARE v_old_bairro VARCHAR(50);
    DECLARE v_old_cidade VARCHAR(50);
    DECLARE v_old_estado CHAR(2);
    DECLARE v_old_complemento VARCHAR(50);
    DECLARE v_detalhes_auditoria TEXT;
    DECLARE v_admin_hash_correto VARCHAR(32);
    DECLARE v_otp_expiracao DATETIME;
    DECLARE v_otp_ativo VARCHAR(6);

    -- Verificar autenticação do funcionário administrador
    SELECT u.senha_hash, u.otp_ativo, u.otp_expiracao
    INTO v_admin_hash_correto, v_otp_ativo, v_otp_expiracao
    FROM usuario u JOIN funcionario f ON u.id_usuario = f.id_usuario
    WHERE u.id_usuario = p_id_funcionario_acao;

    IF v_admin_hash_correto IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Funcionário administrador não encontrado.';
    END IF;

    IF v_admin_hash_correto <> p_senha_admin_hash THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Senha de administrador incorreta.';
    END IF;

    IF v_otp_ativo IS NULL OR v_otp_ativo <> p_otp_admin OR v_otp_expiracao < NOW() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'OTP de administrador inválido ou expirado.';
    END IF;

    -- Obter dados antigos do usuário
    SELECT nome, cpf, data_nascimento, telefone
    INTO v_old_nome, v_old_cpf, v_old_data_nascimento, v_old_telefone
    FROM usuario WHERE id_usuario = p_id_usuario;

    -- Obter dados antigos do endereço
    SELECT cep, local, numero_casa, bairro, cidade, estado, complemento
    INTO v_old_cep, v_old_local, v_old_numero_casa, v_old_bairro, v_old_cidade, v_old_estado, v_old_complemento
    FROM endereco WHERE id_usuario = p_id_usuario;

    SET v_detalhes_auditoria = 'Alteração de dados do usuário:';

    -- Atualizar usuário
    IF p_novo_nome IS NOT NULL AND p_novo_nome <> v_old_nome THEN
        UPDATE usuario SET nome = p_novo_nome WHERE id_usuario = p_id_usuario;
        SET v_detalhes_auditoria = CONCAT(v_detalhes_auditoria, ' Nome: ', v_old_nome, ' -> ', p_novo_nome, ';');
    END IF;
    IF p_novo_cpf IS NOT NULL AND p_novo_cpf <> v_old_cpf THEN
        UPDATE usuario SET cpf = p_novo_cpf WHERE id_usuario = p_id_usuario;
        SET v_detalhes_auditoria = CONCAT(v_detalhes_auditoria, ' CPF: ', v_old_cpf, ' -> ', p_novo_cpf, ';');
    END IF;
    IF p_novo_data_nascimento IS NOT NULL AND p_novo_data_nascimento <> v_old_data_nascimento THEN
        UPDATE usuario SET data_nascimento = p_novo_data_nascimento WHERE id_usuario = p_id_usuario;
        SET v_detalhes_auditoria = CONCAT(v_detalhes_auditoria, ' Data Nasc.: ', v_old_data_nascimento, ' -> ', p_novo_data_nascimento, ';');
    END IF;
    IF p_novo_telefone IS NOT NULL AND p_novo_telefone <> v_old_telefone THEN
        UPDATE usuario SET telefone = p_novo_telefone WHERE id_usuario = p_id_usuario;
        SET v_detalhes_auditoria = CONCAT(v_detalhes_auditoria, ' Telefone: ', v_old_telefone, ' -> ', p_novo_telefone, ';');
    END IF;

    -- Atualizar endereço
    UPDATE endereco SET
        cep = COALESCE(p_novo_cep, v_old_cep),
        local = COALESCE(p_novo_local, v_old_local),
        numero_casa = COALESCE(p_novo_numero_casa, v_old_numero_casa),
        bairro = COALESCE(p_novo_bairro, v_old_bairro),
        cidade = COALESCE(p_novo_cidade, v_old_cidade),
        estado = COALESCE(p_novo_estado, v_old_estado),
        complemento = COALESCE(p_novo_complemento, v_old_complemento)
    WHERE id_usuario = p_id_usuario;

    -- Registrar auditoria
    INSERT INTO auditoria (id_usuario, acao, detalhes)
    VALUES (p_id_funcionario_acao, CONCAT('ALTERACAO_DADOS_USUARIO_ID_', p_id_usuario), v_detalhes_auditoria);

    SELECT 'Dados do usuário atualizados com sucesso.' AS message;
END$$

-- ===============================================
-- Visões (Views)
-- ===============================================

-- Visão: vw_resumo_contas
DROP VIEW IF EXISTS vw_resumo_contas$$
CREATE VIEW vw_resumo_contas AS
SELECT c.id_cliente, u.nome, u.cpf, co.id_conta, co.numero_conta, co.saldo, co.tipo_conta, co.status
FROM cliente c
JOIN usuario u ON c.id_usuario = u.id_usuario
JOIN conta co ON c.id_cliente = co.id_cliente$$

-- Visão: vw_movimentacoes_recentes
DROP VIEW IF EXISTS vw_movimentacoes_recentes$$
CREATE VIEW vw_movimentacoes_recentes AS
SELECT t.*, c.numero_conta AS numero_conta_origem, cd.numero_conta AS numero_conta_destino, u.nome AS cliente_nome, cl.id_cliente
FROM transacao t
JOIN conta c ON t.id_conta_origem = c.id_conta
LEFT JOIN conta cd ON t.id_conta_destino = cd.id_conta
JOIN cliente cl ON c.id_cliente = cl.id_cliente
JOIN usuario u ON cl.id_usuario = u.id_usuario
WHERE t.data_hora >= NOW() - INTERVAL 90 DAY$$

-- Exemplo de VIEW para RF2.3 - Consulta de Dados de Funcionário
DROP VIEW IF EXISTS vw_dados_funcionario$$
CREATE VIEW vw_dados_funcionario AS
SELECT
    f.id_funcionario,
    f.codigo_funcionario,
    f.cargo,
    u.nome,
    u.cpf,
    u.data_nascimento,
    u.telefone,
    e.cep,
    e.local,
    e.numero_casa,
    e.bairro,
    e.cidade,
    e.estado,
    e.complemento,
    (SELECT COUNT(co.id_conta) FROM conta co JOIN cliente cl ON co.id_cliente = cl.id_cliente JOIN usuario us ON cl.id_usuario = us.id_usuario WHERE us.tipo_usuario = 'CLIENTE' AND co.data_abertura >= CURDATE() - INTERVAL 1 YEAR) AS contas_abertas_ultimo_ano,
    (SELECT SUM(t.valor) FROM transacao t JOIN conta co ON t.id_conta_origem = co.id_conta JOIN cliente cl ON co.id_cliente = cl.id_cliente JOIN usuario us ON cl.id_usuario = us.id_usuario WHERE us.tipo_usuario = 'CLIENTE' AND t.tipo_transacao = 'DEPOSITO' AND t.data_hora >= CURDATE() - INTERVAL 1 YEAR) AS valor_movimentado_depositos_ultimo_ano
FROM funcionario f
JOIN usuario u ON f.id_usuario = u.id_usuario
LEFT JOIN endereco e ON u.id_usuario = e.id_usuario$$

-- Exemplo de VIEW para RF2.3 - Consulta de Dados de Cliente
DROP VIEW IF EXISTS vw_dados_cliente$$
CREATE VIEW vw_dados_cliente AS
SELECT
    c.id_cliente,
    u.nome,
    u.cpf,
    u.data_nascimento,
    u.telefone,
    e.cep,
    e.local,
    e.numero_casa,
    e.bairro,
    e.cidade,
    e.estado,
    e.complemento,
    c.score_credito,
    (SELECT GROUP_CONCAT(CONCAT(co.numero_conta, ' (', co.tipo_conta, ', ', co.status, ', R$ ', co.saldo, ')'))
     FROM conta co WHERE co.id_cliente = c.id_cliente) AS contas_detalhe
FROM cliente c
JOIN usuario u ON c.id_usuario = u.id_usuario
LEFT JOIN endereco e ON u.id_usuario = e.id_usuario$$

-- Restaura o delimitador padrão do MySQL.
DELIMITER ;

