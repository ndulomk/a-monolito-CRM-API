const fastify = require("fastify")({ logger: true });
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "crm.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    fastify.log.error(
      "Erro ao conectar ao banco de dados SQLite:",
      err.message
    );
    process.exit(1);
  }
  fastify.log.info("Conectado ao banco de dados SQLite.");
});

db.serialize(() => {
  fastify.log.info("Criando tabelas se não existirem...");

  db.run(`CREATE TABLE IF NOT EXISTS pipelines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS etapas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        ordem INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS etiquetas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS contatos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT,
        telefone TEXT,
        etapa_id INTEGER NOT NULL,
        valor_negociacao REAL DEFAULT 0,
        id_etiqueta INTEGER,
        status TEXT DEFAULT 'aberto',
        data_cadastro DATE,
        data_encerramento DATE,
        confianca INTEGER,
        funcionario_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (etapa_id) REFERENCES etapas(id),
        FOREIGN KEY (id_etiqueta) REFERENCES etiquetas(id)
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS mensagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conteudo TEXT NOT NULL,
        id_remetente INTEGER NOT NULL,
        id_receptor INTEGER,
        departamento_id INTEGER,
        empresa_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT,
        status TEXT DEFAULT 'pendente',
        data_vencimento DATE,
        funcionario_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS metas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT,
        data_inicio DATE,
        data_fim DATE,
        quantia_a_alcancar REAL,
        alcance REAL DEFAULT 0,
        item_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS projetos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        importe REAL,
        data_inicio DATE,
        data_previsao_termino DATE,
        data_termino DATE,
        prioridade TEXT,
        gestor_id INTEGER,
        status TEXT DEFAULT 'planejamento',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

fastify.get("/", async (request, reply) => {
  return { message: "Bem-vindo à API de CRM com Node.js, Fastify e SQLite!" };
});

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => {
      return dbAll("SELECT * FROM pipelines");
    });

    fastify.post("/", async (request, reply) => {
      const { nome, descricao } = request.body;
      const result = await dbRun(
        "INSERT INTO pipelines (nome, descricao) VALUES (?, ?)",
        [nome, descricao]
      );
      reply.code(201).send({ id: result.lastID, nome, descricao });
    });

    fastify.get("/:id", async (request, reply) => {
      const pipeline = await dbGet("SELECT * FROM pipelines WHERE id = ?", [
        request.params.id,
      ]);
      if (!pipeline)
        return reply.code(404).send({ message: "Pipeline não encontrado" });
      return pipeline;
    });

    fastify.put("/:id", async (request, reply) => {
      const { nome, descricao } = request.body;
      const result = await dbRun(
        "UPDATE pipelines SET nome = ?, descricao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [nome, descricao, request.params.id]
      );
      if (result.changes === 0)
        return reply.code(404).send({ message: "Pipeline não encontrado" });
      return { message: "Pipeline atualizado com sucesso" };
    });

    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM pipelines WHERE id = ?", [
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Pipeline não encontrado" });
      return { message: "Pipeline excluído com sucesso" };
    });

    fastify.post("/:id/etapas", async (request, reply) => {
      const { nome, ordem } = request.body;
      const result = await dbRun(
        "INSERT INTO etapas (pipeline_id, nome, ordem) VALUES (?, ?, ?)",
        [request.params.id, nome, ordem]
      );
      reply.code(201).send({ id: result.lastID, pipeline_id: request.params.id, nome, ordem });
    });

    fastify.get("/:id/etapas", async (request, reply) => {
      const etapas = await dbAll("SELECT * FROM etapas WHERE pipeline_id = ? ORDER BY ordem", [
        request.params.id,
      ]);
      return etapas;
    });
  },
  { prefix: "/api/pipelines" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => dbAll("SELECT * FROM etapas"));
    fastify.post("/", async (request, reply) => {
      const { pipeline_id, nome, ordem } = request.body;
      const result = await dbRun(
        "INSERT INTO etapas (pipeline_id, nome, ordem) VALUES (?, ?, ?)",
        [pipeline_id, nome, ordem]
      );
      reply.code(201).send({ id: result.lastID, ...request.body });
    });
    fastify.get("/:id", async (request, reply) => {
      const etapa = await dbGet("SELECT * FROM etapas WHERE id = ?", [
        request.params.id,
      ]);
      if (!etapa)
        return reply.code(404).send({ message: "Etapa não encontrada" });
      return etapa;
    });
    fastify.put("/:id", async (request, reply) => {
      const { nome, ordem } = request.body;
      const result = await dbRun(
        "UPDATE etapas SET nome = ?, ordem = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [nome, ordem, request.params.id]
      );
      if (result.changes === 0)
        return reply.code(404).send({ message: "Etapa não encontrada" });
      return { message: "Etapa atualizada com sucesso" };
    });
    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM etapas WHERE id = ?", [
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Etapa não encontrada" });
      return { message: "Etapa excluída com sucesso" };
    });
  },
  { prefix: "/api/etapas" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) =>
      dbAll("SELECT * FROM etiquetas")
    );
    fastify.post("/", async (request, reply) => {
      const { nome, cor } = request.body;
      const result = await dbRun(
        "INSERT INTO etiquetas (nome, cor) VALUES (?, ?)",
        [nome, cor]
      );
      reply.code(201).send({ id: result.lastID, ...request.body });
    });
    fastify.get("/:id", async (request, reply) => {
      const etiqueta = await dbGet("SELECT * FROM etiquetas WHERE id = ?", [
        request.params.id,
      ]);
      if (!etiqueta)
        return reply.code(404).send({ message: "Etiqueta não encontrada" });
      return etiqueta;
    });
    fastify.put("/:id", async (request, reply) => {
      const { nome, cor } = request.body;
      const result = await dbRun(
        "UPDATE etiquetas SET nome = ?, cor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [nome, cor, request.params.id]
      );
      if (result.changes === 0)
        return reply.code(404).send({ message: "Etiqueta não encontrada" });
      return { message: "Etiqueta atualizada com sucesso" };
    });
    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM etiquetas WHERE id = ?", [
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Etiqueta não encontrada" });
      return { message: "Etiqueta excluída com sucesso" };
    });
  },
  { prefix: "/api/etiquetas" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => dbAll("SELECT * FROM contatos"));
    fastify.post("/", async (request, reply) => {
      const {
        nome,
        email,
        telefone,
        etapa_id,
        valor_negociacao,
        id_etiqueta,
        status,
        data_cadastro,
        data_encerramento,
        confianca,
        funcionario_id,
      } = request.body;
      const sql = `INSERT INTO contatos (nome, email, telefone, etapa_id, valor_negociacao, id_etiqueta, status, data_cadastro, data_encerramento, confianca, funcionario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const result = await dbRun(sql, [
        nome,
        email,
        telefone,
        etapa_id,
        valor_negociacao,
        id_etiqueta,
        status,
        data_cadastro,
        data_encerramento,
        confianca,
        funcionario_id,
      ]);
      reply.code(201).send({ id: result.lastID, ...request.body });
    });
    fastify.get("/:id", async (request, reply) => {
      const contato = await dbGet("SELECT * FROM contatos WHERE id = ?", [
        request.params.id,
      ]);
      if (!contato)
        return reply.code(404).send({ message: "Contato não encontrado" });
      return contato;
    });
    fastify.put("/:id", async (request, reply) => {
      const {
        nome,
        email,
        telefone,
        etapa_id,
        valor_negociacao,
        id_etiqueta,
        status,
        data_cadastro,
        data_encerramento,
        confianca,
        funcionario_id,
      } = request.body;
      const sql = `UPDATE contatos SET nome = ?, email = ?, telefone = ?, etapa_id = ?, valor_negociacao = ?, id_etiqueta = ?, status = ?, data_cadastro = ?, data_encerramento = ?, confianca = ?, funcionario_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const result = await dbRun(sql, [
        nome,
        email,
        telefone,
        etapa_id,
        valor_negociacao,
        id_etiqueta,
        status,
        data_cadastro,
        data_encerramento,
        confianca,
        funcionario_id,
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Contato não encontrado" });
      return { message: "Contato atualizado com sucesso" };
    });
    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM contatos WHERE id = ?", [
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Contato não encontrado" });
      return { message: "Contato excluído com sucesso" };
    });
  },
  { prefix: "/api/contatos" }
);

fastify.register(
  async function (fastify) {
    fastify.post("/privada", async (request, reply) => {
      const { conteudo, id_remetente, id_receptor } = request.body;
      const result = await dbRun(
        "INSERT INTO mensagens (conteudo, id_remetente, id_receptor) VALUES (?, ?, ?)",
        [conteudo, id_remetente, id_receptor]
      );
      reply.code(201).send({ id: result.lastID, ...request.body });
    });

    fastify.post("/grupo", async (request, reply) => {
      const { conteudo, id_remetente, departamento_id } = request.body;
      const result = await dbRun(
        "INSERT INTO mensagens (conteudo, id_remetente, departamento_id) VALUES (?, ?, ?)",
        [conteudo, id_remetente, departamento_id]
      );
      reply.code(201).send({ id: result.lastID, ...request.body });
    });

    fastify.post("/suporte", async (request, reply) => {
      const { conteudo, id_remetente, id_receptor, empresa_id } = request.body;
      const result = await dbRun(
        "INSERT INTO mensagens (conteudo, id_remetente, id_receptor, empresa_id) VALUES (?, ?, ?, ?)",
        [conteudo, id_remetente, id_receptor, empresa_id]
      );
      reply.code(201).send({ id: result.lastID, ...request.body });
    });

    fastify.get("/suporte/listar/:empresa_id", async (request, reply) => {
      const mensagens = await dbAll(
        "SELECT * FROM mensagens WHERE empresa_id = ? ORDER BY created_at ASC",
        [request.params.empresa_id]
      );
      return mensagens;
    });

    fastify.put("/suporte/:id", async (request, reply) => {
      const { conteudo } = request.body;
      const result = await dbRun(
        "UPDATE mensagens SET conteudo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [conteudo, request.params.id]
      );
      if (result.changes === 0)
        return reply.code(404).send({ message: "Mensagem não encontrada" });
      return { message: "Mensagem atualizada com sucesso" };
    });

    fastify.delete("/suporte/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM mensagens WHERE id = ?", [
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Mensagem não encontrada" });
      return { message: "Mensagem excluída com sucesso" };
    });
  },
  { prefix: "/api/mensagens" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => dbAll("SELECT * FROM tarefas"));

    fastify.get("/hoje", async (request, reply) =>
      dbAll("SELECT * FROM tarefas WHERE data_vencimento = date('now')")
    );
    fastify.get("/feitas", async (request, reply) =>
      dbAll("SELECT * FROM tarefas WHERE status = 'concluida'")
    );
    fastify.get("/pendentes", async (request, reply) =>
      dbAll("SELECT * FROM tarefas WHERE status = 'pendente'")
    );

    fastify.post("/", async (request, reply) => {
      const { titulo, descricao, status, data_vencimento, funcionario_id } =
        request.body;
      const result = await dbRun(
        "INSERT INTO tarefas (titulo, descricao, status, data_vencimento, funcionario_id) VALUES (?, ?, ?, ?, ?)",
        [titulo, descricao, status, data_vencimento, funcionario_id]
      );
      reply.code(201).send({ id: result.lastID, ...request.body });
    });
    fastify.put("/:id", async (request, reply) => {
      const { titulo, descricao, status, data_vencimento, funcionario_id } =
        request.body;
      const result = await dbRun(
        "UPDATE tarefas SET titulo = ?, descricao = ?, status = ?, data_vencimento = ?, funcionario_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [
          titulo,
          descricao,
          status,
          data_vencimento,
          funcionario_id,
          request.params.id,
        ]
      );
      if (result.changes === 0)
        return reply.code(404).send({ message: "Tarefa não encontrada" });
      return { message: "Tarefa atualizada com sucesso" };
    });
    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM tarefas WHERE id = ?", [
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Tarefa não encontrada" });
      return { message: "Tarefa excluída com sucesso" };
    });
  },
  { prefix: "/api/tarefas" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => dbAll("SELECT * FROM metas"));
    fastify.post("/", async (request, reply) => {
      const {
        titulo,
        descricao,
        data_inicio,
        data_fim,
        quantia_a_alcancar,
        alcance,
        item_id,
      } = request.body;
      const sql =
        "INSERT INTO metas (titulo, descricao, data_inicio, data_fim, quantia_a_alcancar, alcance, item_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const result = await dbRun(sql, [
        titulo,
        descricao,
        data_inicio,
        data_fim,
        quantia_a_alcancar,
        alcance,
        item_id,
      ]);
      reply.code(201).send({ id: result.lastID, ...request.body });
    });
    fastify.put("/:id", async (request, reply) => {
      const {
        titulo,
        descricao,
        data_inicio,
        data_fim,
        quantia_a_alcancar,
        alcance,
        item_id,
      } = request.body;
      const sql =
        "UPDATE metas SET titulo = ?, descricao = ?, data_inicio = ?, data_fim = ?, quantia_a_alcancar = ?, alcance = ?, item_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
      const result = await dbRun(sql, [
        titulo,
        descricao,
        data_inicio,
        data_fim,
        quantia_a_alcancar,
        alcance,
        item_id,
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Meta não encontrada" });
      return { message: "Meta atualizada com sucesso" };
    });
    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM metas WHERE id = ?", [
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Meta não encontrada" });
      return { message: "Meta excluída com sucesso" };
    });
  },
  { prefix: "/api/metas" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => dbAll("SELECT * FROM projetos"));
    fastify.post("/", async (request, reply) => {
      const {
        nome,
        importe,
        data_inicio,
        data_previsao_termino,
        data_termino,
        prioridade,
        gestor_id,
        status,
      } = request.body;
      const sql =
        "INSERT INTO projetos (nome, importe, data_inicio, data_previsao_termino, data_termino, prioridade, gestor_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      const result = await dbRun(sql, [
        nome,
        importe,
        data_inicio,
        data_previsao_termino,
        data_termino,
        prioridade,
        gestor_id,
        status,
      ]);
      reply.code(201).send({ id: result.lastID, ...request.body });
    });
    fastify.put("/:id", async (request, reply) => {
      const {
        nome,
        importe,
        data_inicio,
        data_previsao_termino,
        data_termino,
        prioridade,
        gestor_id,
        status,
      } = request.body;
      const sql =
        "UPDATE projetos SET nome=?, importe=?, data_inicio=?, data_previsao_termino=?, data_termino=?, prioridade=?, gestor_id=?, status=?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
      const result = await dbRun(sql, [
        nome,
        importe,
        data_inicio,
        data_previsao_termino,
        data_termino,
        prioridade,
        gestor_id,
        status,
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Projeto não encontrado" });
      return { message: "Projeto atualizado com sucesso" };
    });
    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM projetos WHERE id = ?", [
        request.params.id,
      ]);
      if (result.changes === 0)
        return reply.code(404).send({ message: "Projeto não encontrado" });
      return { message: "Projeto excluído com sucesso" };
    });
  },
  { prefix: "/api/projetos" }
);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    fastify.log.info(`Servidor rodando em ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Conexão com o banco de dados fechada.");
    process.exit(0);
  });
});