// backend/server.js
require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const express = require('express');
const mysql = require('mysql2'); // Mude de 'mysql' para 'mysql2'
const cors = require('cors');
const app = express();
const port = 3006; // Ou outra porta disponível

// Na configuração da conexão:
const db = mysql.createConnection({ // Pode manter createConnection
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
    // Opcional: Para forçar o protocolo, embora mysql2 geralmente detecte:
    // authPlugins: { mysql_native_password: () => () => require('mysql2/lib/auth_plugins/mysql_native_password.js') }
});

// Conectar ao MySQL
db.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL!');
});

// Middleware
app.use(cors()); // Permite requisições de diferentes origens (seu frontend)
app.use(express.json()); // Habilita o Express a ler JSON no corpo da requisição

// ====================================================================
// ROTAS DA API - Implemente cada requisito funcional aqui
// ====================================================================

// RF1.1 & RF1.2 - Autenticação de Usuário (Cliente e Funcionário)
app.post('/api/login', (req, res) => {
    const { cpf_ou_codigo, senha, tipo_usuario } = req.body;
    let query;

    // Lógica para autenticação
    if (tipo_usuario === 'CLIENTE') {
        query = 'SELECT id_usuario, senha_hash, otp_ativo, otp_expiracao FROM usuario WHERE cpf = ? AND tipo_usuario = "CLIENTE"';
    } else if (tipo_usuario === 'FUNCIONARIO') {
        query = `
            SELECT u.id_usuario, u.senha_hash, u.otp_ativo, u.otp_expiracao
            FROM usuario u
            JOIN funcionario f ON u.id_usuario = f.id_usuario
            WHERE f.codigo_funcionario = ? AND u.tipo_usuario = "FUNCIONARIO"
        `;
    } else {
        // RF1.1 : O sistema deve exibir uma tela de login com opções "Funcionário", "Cliente" e "Sair". 
        return res.status(400).json({ message: 'Tipo de usuário inválido.' });
    }

    db.query(query, [cpf_ou_codigo], (err, results) => {
        if (err) {
            console.error('Erro na consulta de login:', err);
            // RF1.3 : Tentativas de login devem ser registradas na tabela auditoria com data, hora, usuário e resultado (sucesso/falha). 
            logAuditoria(null, 'LOGIN', `Falha - Erro de BD: ${err.message}`);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        if (results.length === 0) {
            logAuditoria(null, 'LOGIN', `Falha - Usuário/Código não encontrado: ${cpf_ou_codigo}`);
            return res.status(401).json({ message: 'Usuário ou código incorreto.' });
        }

        const user = results[0];
        // Comparar senha (MD5 no seu banco, cuidado com segurança em apps reais)
        const senha_hash_fornecida = require('crypto').createHash('md5').update(senha).digest('hex'); // Gerar MD5 da senha fornecida
        if (user.senha_hash !== senha_hash_fornecida) {
            logAuditoria(user.id_usuario, 'LOGIN', `Falha - Senha incorreta para: ${cpf_ou_codigo}`);
            return res.status(401).json({ message: 'Senha incorreta.' });
        }

        // RF1.2 : O login exige senha e OTP gerado pelo banco (válido por 5 minutos). 
        // Gerar OTP e registrar na auditoria
        db.query('CALL gerar_otp(?)', [user.id_usuario], (err, otpResult) => {
            if (err) {
                console.error('Erro ao gerar OTP:', err);
                logAuditoria(user.id_usuario, 'LOGIN', `Falha - Erro ao gerar OTP: ${err.message}`);
                return res.status(500).json({ message: 'Erro ao gerar OTP.' });
            }
            const otp_code = otpResult[0][0].novo_otp; // O CALL retorna um array de resultados, o OTP está no primeiro elemento do primeiro array
            logAuditoria(user.id_usuario, 'LOGIN', `Sucesso - OTP Gerado: ${otp_code}`);
            res.status(200).json({ message: 'OTP enviado! Insira o código.', id_usuario: user.id_usuario, tipo_usuario: tipo_usuario });
        });
    });
});

// Validação de OTP
app.post('/api/validate-otp', (req, res) => {
    const { id_usuario, otp_digitado, tipo_usuario } = req.body;

    db.query('SELECT otp_ativo, otp_expiracao FROM usuario WHERE id_usuario = ?', [id_usuario], (err, results) => {
        if (err) {
            console.error('Erro ao buscar OTP:', err);
            logAuditoria(id_usuario, 'VALIDAR_OTP', `Falha - Erro de BD: ${err.message}`);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        if (results.length === 0) {
            logAuditoria(id_usuario, 'VALIDAR_OTP', `Falha - Usuário não encontrado para OTP: ${id_usuario}`);
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const user = results[0];
        if (user.otp_ativo === otp_digitado && new Date(user.otp_expiracao) > new Date()) {
            // OTP válido, limpa o OTP para uso futuro
            db.query('UPDATE usuario SET otp_ativo = NULL, otp_expiracao = NULL WHERE id_usuario = ?', [id_usuario], (updateErr) => {
                if (updateErr) console.error('Erro ao limpar OTP:', updateErr);
            });
            logAuditoria(id_usuario, 'VALIDAR_OTP', 'Sucesso');
            res.status(200).json({ message: 'Login bem-sucedido!', tipo_usuario: tipo_usuario, id_usuario: id_usuario });
        } else {
            logAuditoria(id_usuario, 'VALIDAR_OTP', `Falha - OTP inválido ou expirado. Digitado: ${otp_digitado}`);
            res.status(401).json({ message: 'OTP inválido ou expirado.' });
        }
    });
});

// RF3.2 - Encerrar Sessão (Logout) 
app.post('/api/logout', (req, res) => {
    const { id_usuario } = req.body;
    logAuditoria(id_usuario, 'LOGOUT', 'Sessão encerrada.');
    res.status(200).json({ message: 'Sessão encerrada com sucesso.' });
});

// RF2.1 - Abertura de Conta (Exemplo) 
app.post('/api/conta/abrir', (req, res) => {
    const {
        nome, cpf, data_nascimento, telefone, tipo_usuario, senha_clara,
        cep, local, numero_casa, bairro, cidade, estado, complemento,
        id_agencia, tipo_conta, taxa_rendimento, limite, data_vencimento,
        taxa_manutencao, perfil_risco, valor_minimo, taxa_rendimento_base
    } = req.body;
// ADICIONAR/RE-ADICIONAR ESTE BLOCO NO SEU backend/server.js
// RF2.3 - Consulta de Dados (Contas por Cliente por ID_CLIENTE para uso por funcionário)
// Esta rota usa a vw_resumo_contas para facilitar a consulta pelo id_cliente.
app.get('/api/consulta/contas-cliente/:id_cliente', (req, res) => {
    const { id_cliente } = req.params;
    db.query(`SELECT * FROM vw_resumo_contas WHERE id_cliente = ?`, [id_cliente], (err, results) => {
        if (err) {
            console.error('Erro ao consultar resumo de contas por id_cliente (func):', err);
            logAuditoria(null, 'CONSULTA_CONTAS_FALHA_FUNC', `Erro de BD ao consultar contas para cliente ${id_cliente} (func): ${err.message}`);
            return res.status(500).json({ message: 'Erro interno do servidor ao consultar contas por ID de cliente.' });
        }
        res.status(200).json(results);
    });
});
    // Validação básica
    if (!cpf || !senha_clara || !tipo_usuario || !id_agencia || !tipo_conta) {
        return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
    }

    db.query(
        'CALL abrir_conta(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            nome, cpf, data_nascimento, telefone, tipo_usuario, senha_clara,
            cep, local, numero_casa, bairro, cidade, estado, complemento,
            id_agencia, tipo_conta, taxa_rendimento, limite, data_vencimento,
            taxa_manutencao, perfil_risco, valor_minimo, taxa_rendimento_base
        ],
        (err, results) => {
            if (err) {
                console.error('Erro ao abrir conta:', err);
                logAuditoria(null, 'ABERTURA_CONTA_FALHA', `Erro ao abrir conta para CPF ${cpf}: ${err.message}`);
                return res.status(500).json({ message: `Erro ao abrir conta: ${err.message}` });
            }
            logAuditoria(results[0][0].id_usuario_criado || null, 'ABERTURA_CONTA_SUCESSO', `Conta aberta para CPF ${cpf}`);
            res.status(201).json({ message: results[0][0]['Conta aberta com sucesso!'], numero_conta: results[0][0].numero_conta });
        }
    );
});

// RF2.2 - Encerramento de Conta 
app.post('/api/conta/encerrar', (req, res) => {
    const { numero_conta, motivo, id_funcionario_acao, senha_admin, otp_admin } = req.body;

    // Gerar MD5 da senha do administrador para comparar com o hash no banco
    const senha_admin_hash = require('crypto').createHash('md5').update(senha_admin).digest('hex');

    db.query(
        'CALL encerrar_conta(?, ?, ?, ?, ?)',
        [numero_conta, motivo, id_funcionario_acao, senha_admin_hash, otp_admin],
        (err, results) => {
            if (err) {
                console.error('Erro ao encerrar conta:', err);
                logAuditoria(id_funcionario_acao, 'ENCERRAMENTO_CONTA_FALHA', `Erro ao encerrar conta ${numero_conta}: ${err.message}`);
                return res.status(500).json({ message: `Erro ao encerrar conta: ${err.message}` });
            }
            logAuditoria(id_funcionario_acao, 'ENCERRAMENTO_CONTA_SUCESSO', `Conta ${numero_conta} encerrada.`);
            res.status(200).json({ message: results[0][0]['Conta encerrada com sucesso.'] });
        }
    );
});

// RF2.3 - Consulta de Dados (Exemplo para Cliente por CPF) 
app.get('/api/consulta/cliente/:cpf', (req, res) => {
    const { cpf } = req.params;

    db.query(`
        SELECT u.nome, u.cpf, u.data_nascimento, u.telefone, c.score_credito
        FROM usuario u
        JOIN cliente c ON u.id_usuario = c.id_usuario
        WHERE u.cpf = ? AND u.tipo_usuario = 'CLIENTE'
    `, [cpf], (err, results) => {
        if (err) {
            console.error('Erro ao consultar cliente:', err);
            logAuditoria(null, 'CONSULTA_CLIENTE_FALHA', `Erro ao consultar cliente CPF ${cpf}: ${err.message}`);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }
        logAuditoria(results[0].id_usuario, 'CONSULTA_CLIENTE_SUCESSO', `Cliente CPF ${cpf} consultado.`);
        res.status(200).json(results[0]);
    });
});

// RF2.3 - Consulta de Dados (Contas por Cliente por id_usuario) - Rota Atualizada
app.get('/api/cliente/:id_usuario/contas', (req, res) => {
    const { id_usuario } = req.params;

    // Primeiro, verifique se o id_usuario pertence a um CLIENTE e obtenha o id_cliente
    db.query(`
        SELECT c.id_cliente
        FROM usuario u
        JOIN cliente c ON u.id_usuario = c.id_usuario
        WHERE u.id_usuario = ? AND u.tipo_usuario = 'CLIENTE'
    `, [id_usuario], (err, clientResults) => {
        if (err) {
            console.error('Erro ao verificar cliente para contas:', err);
            logAuditoria(id_usuario, 'CONSULTA_CONTAS_FALHA', `Erro de BD ao verificar cliente ${id_usuario}: ${err.message}`);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        if (clientResults.length === 0) {
            logAuditoria(id_usuario, 'CONSULTA_CONTAS_FALHA', `Cliente não encontrado ou ID incorreto: ${id_usuario}`);
            return res.status(404).json({ message: 'Cliente não encontrado ou ID incorreto.' });
        }

        const id_cliente = clientResults[0].id_cliente;

        // Agora, consulte as contas usando o id_cliente obtido
        db.query(`
            SELECT
                c.id_conta,
                c.numero_conta,
                c.saldo,
                c.tipo_conta,
                c.status,
                cp.taxa_rendimento AS poupanca_taxa_rendimento,
                cc.limite AS corrente_limite,
                cc.data_vencimento AS corrente_data_vencimento,
                cc.taxa_manutencao AS corrente_taxa_manutencao,
                ci.perfil_risco AS investimento_perfil_risco,
                ci.valor_minimo AS investimento_valor_minimo,
                ci.taxa_rendimento_base AS investimento_taxa_rendimento_base
            FROM conta c
            LEFT JOIN conta_poupanca cp ON c.id_conta = cp.id_conta
            LEFT JOIN conta_corrente cc ON c.id_conta = cc.id_conta
            LEFT JOIN conta_investimento ci ON c.id_conta = ci.id_conta
            WHERE c.id_cliente = ?
        `, [id_cliente], (err, results) => {
            if (err) {
                console.error('Erro ao consultar contas do cliente:', err);
                logAuditoria(id_usuario, 'CONSULTA_CONTAS_FALHA', `Erro de BD ao consultar contas para cliente ${id_cliente}: ${err.message}`);
                return res.status(500).json({ message: 'Erro interno do servidor.' });
            }
            logAuditoria(id_usuario, 'CONSULTA_CONTAS_SUCESSO', `Contas do cliente ${id_cliente} consultadas.`);
            res.status(200).json(results);
        });
    });
});


// RF2.4 - Alteração de Dados (Exemplo: Alterar telefone do cliente) 
app.put('/api/cliente/:id_usuario/alterar-telefone', (req, res) => {
    const { id_usuario } = req.params;
    const { novo_telefone, senha_admin, otp_admin, id_funcionario_acao } = req.body;

    // Verificação de permissão e auditoria similar ao encerramento de conta
    // Idealmente, esta seria uma procedure no banco que valida tudo e faz a alteração.
    db.beginTransaction(err => {
        if (err) {
            console.error('Erro ao iniciar transação:', err);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        db.query('SELECT telefone FROM usuario WHERE id_usuario = ?', [id_usuario], (err, oldValResult) => {
            if (err) {
                db.rollback(() => res.status(500).json({ message: 'Erro ao buscar dados antigos.' }));
                return;
            }
            if (oldValResult.length === 0) {
                db.rollback(() => res.status(404).json({ message: 'Usuário não encontrado.' }));
                return;
            }
            const old_telefone = oldValResult[0].telefone;

            db.query('UPDATE usuario SET telefone = ? WHERE id_usuario = ?', [novo_telefone, id_usuario], (err, updateResult) => {
                if (err) {
                    db.rollback(() => res.status(500).json({ message: 'Erro ao atualizar telefone.' }));
                    logAuditoria(id_funcionario_acao, 'ALTERACAO_DADOS_FALHA', `Erro ao alterar telefone para usuário ${id_usuario}: ${err.message}`);
                    return;
                }
                logAuditoria(id_funcionario_acao, 'ALTERACAO_DADOS_SUCESSO',
                    `Telefone do usuário ${id_usuario} alterado de '${old_telefone}' para '${novo_telefone}'.`);
                db.commit(commitErr => {
                    if (commitErr) {
                        db.rollback(() => res.status(500).json({ message: 'Erro ao finalizar transação.' }));
                        return;
                    }
                    res.status(200).json({ message: 'Telefone atualizado com sucesso.' });
                });
            });
        });
    });
});


// RF3.1 - Saldo e Projeção (Exemplo) 
app.get('/api/conta/:id_conta/saldo', (req, res) => {
    const { id_conta } = req.params;
    // Autenticação com senha e OTP do cliente seria necessária aqui (RF3.1)
    // Para simplificar o exemplo, estamos apenas buscando o saldo
    db.query(`
        SELECT c.saldo, co.taxa_rendimento AS taxa_poupanca, ci.taxa_rendimento_base AS taxa_investimento, c.tipo_conta
        FROM conta c
        LEFT JOIN conta_poupanca co ON c.id_conta = co.id_conta
        LEFT JOIN conta_investimento ci ON c.id_conta = ci.id_conta
        WHERE c.id_conta = ?
    `, [id_conta], (err, results) => {
        if (err) {
            console.error('Erro ao buscar saldo:', err);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }
        const conta = results[0];
        let projecao_rendimento = 0;
        if (conta.tipo_conta === 'POUPANCA' && conta.taxa_poupanca) {
            projecao_rendimento = conta.saldo * (conta.taxa_poupanca / 100);
        } else if (conta.tipo_conta === 'INVESTIMENTO' && conta.taxa_investimento) {
            projecao_rendimento = conta.saldo * (conta.taxa_investimento / 100);
        }
        res.status(200).json({
            saldo: conta.saldo,
            projecao_rendimento: projecao_rendimento,
            tipo_conta: conta.tipo_conta
        });
    });
});

// RF3.1 - Extrato (Movimentações Recentes) 
app.get('/api/conta/:id_conta/extrato', (req, res) => {
    const { id_conta } = req.params;
    const { periodo, limite } = req.query; // periodo: '90d', '30d', 'all', limite: número

    let query = `
        SELECT t.*, c_origem.numero_conta AS numero_conta_origem, c_destino.numero_conta AS numero_conta_destino
        FROM transacao t
        LEFT JOIN conta c_origem ON t.id_conta_origem = c_origem.id_conta
        LEFT JOIN conta c_destino ON t.id_conta_destino = c_destino.id_conta
        WHERE t.id_conta_origem = ? OR t.id_conta_destino = ?
    `;
    const params = [id_conta, id_conta];

    if (periodo === '90d') {
        query += ' AND t.data_hora >= NOW() - INTERVAL 90 DAY';
    } else if (periodo === '30d') {
        query += ' AND t.data_hora >= NOW() - INTERVAL 30 DAY';
    }
    // Para "últimas 50 transações", adiciona ORDER BY e LIMIT
    query += ' ORDER BY t.data_hora DESC';
    if (limite) {
        query += ' LIMIT ?';
        params.push(parseInt(limite));
    } else {
        query += ' LIMIT 50'; // Default para 50, conforme documento 
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Erro ao buscar extrato:', err);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
        res.status(200).json(results);
    });
});

// Função auxiliar para logar na tabela de auditoria 
function logAuditoria(id_usuario, acao, detalhes) {
    db.query('INSERT INTO auditoria (id_usuario, acao, detalhes) VALUES (?, ?, ?)',
        [id_usuario, acao, detalhes],
        (err) => {
            if (err) {
                console.error('Erro ao registrar auditoria:', err);
            }
        }
    );
}

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
});