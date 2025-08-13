const fastify = require("fastify")({ 
  logger: true,
  bodyLimit: 1048576, // 1MB limit for request bodies
});
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { z } = require("zod"); // For input validation

const dbPath = path.resolve(__dirname, "crm.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    fastify.log.error("Erro ao conectar ao banco de dados SQLite:", err.message);
    process.exit(1);
  }
  fastify.log.info("Conectado ao banco de dados SQLite.");
});

// Database initialization
db.serialize(() => {
  fastify.log.info("Criando tabelas e índices se não existirem...");

  // Table creation (same as before)
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
    descricao TEXT,
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

  // Create view
  db.run(`CREATE VIEW IF NOT EXISTS etapas_with_contactos AS 
    SELECT 
      c.nome AS nome_contato,
      c.id AS id_contato,
      c.telefone,
      c.descricao,
      e.id,
      e.nome,
      e.ordem,
      e.created_at
    FROM contatos c
    JOIN etapas e ON c.etapa_id = e.id
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_contatos_etapa_id ON contatos(etapa_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_etapas_pipeline_id ON etapas(pipeline_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mensagens_empresa_id ON mensagens(empresa_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status)`);

  // Enhanced seeding function
  const popularDadosIniciais = async (quantidade = 10) => {
    try {
      // Input validation
      const quantidadeSchema = z.number().int().min(1).max(100);
      quantidadeSchema.parse(quantidade);

      // Clear all tables
      // await Promise.all([
      //   dbRun("DELETE FROM contatos"),
      //   dbRun("DELETE FROM etapas"),
      //   dbRun("DELETE FROM pipelines"),
      //   dbRun("DELETE FROM etiquetas"),
      //   dbRun("DELETE FROM mensagens"),
      //   dbRun("DELETE FROM tarefas"),
      //   dbRun("DELETE FROM metas"),
      //   dbRun("DELETE FROM projetos"),
      // ]);

      // Pipelines
      const pipelines = [
        { nome: "Pipeline Comercial", descricao: "Processo de vendas B2B" },
        { nome: "Pipeline Suporte", descricao: "Atendimento ao cliente" },
        { nome: "Pipeline Onboarding", descricao: "Integração de novos clientes" },
        { nome: "Pipeline Marketing", descricao: "Funil de marketing" },
      ].slice(0, Math.min(4, quantidade));

      const pipelineIds = [];
      for (const pipeline of pipelines) {
        const result = await dbRun(
          "INSERT INTO pipelines (nome, descricao) VALUES (?, ?)",
          [pipeline.nome, pipeline.descricao]
        );
        pipelineIds.push(result.lastID);
      }

      // Etapas
      const etapasBase = [
        { nome: "Prospecção", ordem: 1 },
        { nome: "Qualificação", ordem: 2 },
        { nome: "Proposta", ordem: 3 },
        { nome: "Negociação", ordem: 4 },
        { nome: "Fechamento", ordem: 5 },
        { nome: "Implementação", ordem: 6 },
      ];

      const etapaIds = [];
      for (const pipelineId of pipelineIds) {
        const etapasParaInserir = etapasBase.slice(0, Math.min(6, quantidade));
        for (const etapa of etapasParaInserir) {
          const result = await dbRun(
            "INSERT INTO etapas (pipeline_id, nome, ordem) VALUES (?, ?, ?)",
            [pipelineId, etapa.nome, etapa.ordem]
          );
          etapaIds.push(result.lastID);
        }
      }

      // Etiquetas
      const etiquetas = [
        { nome: "VIP", cor: "#FFD700" },
        { nome: "Urgente", cor: "#FF0000" },
        { nome: "Potencial", cor: "#00FF00" },
        { nome: "Follow-up", cor: "#0000FF" },
        { nome: "Em espera", cor: "#808080" },
      ].slice(0, quantidade);

      const etiquetaIds = [];
      for (const etiqueta of etiquetas) {
        const result = await dbRun(
          "INSERT INTO etiquetas (nome, cor) VALUES (?, ?)",
          [etiqueta.nome, etiqueta.cor]
        );
        etiquetaIds.push(result.lastID);
      }

      // Contatos
      const nomesContatos = [
        "João Silva", "Maria Oliveira", "Carlos Souza", "Ana Santos",
        "Pedro Costa", "Lucia Ferreira", "Marcos Rocha", "Julia Lima",
        "Fernando Alves", "Patricia Gomes", "Ricardo Martins", "Camila Ribeiro",
        "Gustavo Pereira", "Isabela Carvalho", "Roberto Nunes", "Laura Mendes",
        "Eduardo Lima", "Beatriz Costa", "Rafael Silva", "Mariana Souza"
      ].slice(0, quantidade * 4);

      const funcionarioIds = Array.from({ length: 5 }, (_, i) => i + 1);
      for (let i = 0; i < nomesContatos.length; i++) {
        const etapa = etapaIds[i % etapaIds.length];
        const etiqueta = etiquetaIds[i % etiquetaIds.length];
        await dbRun(
          `INSERT INTO contatos (
            nome, email, telefone, etapa_id, valor_negociacao, 
            id_etiqueta, status, data_cadastro, data_encerramento, 
            confianca, funcionario_id, descricao
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nomesContatos[i],
            `${nomesContatos[i].toLowerCase().replace(/\s/g, '.')}@exemplo.com`,
            `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            etapa,
            (Math.random() * 50000).toFixed(2),
            Math.random() > 0.2 ? etiqueta : null,
            ['aberto', 'fechado', 'perdido'][Math.floor(Math.random() * 3)],
            new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            Math.random() > 0.8 ? new Date(Date.now()).toISOString().split('T')[0] : null,
            Math.floor(Math.random() * 100),
            funcionarioIds[Math.floor(Math.random() * funcionarioIds.length)],
            `Descrição do contato ${nomesContatos[i]}`
          ]
        );
      }

      // Mensagens
      for (let i = 0; i < quantidade * 2; i++) {
        await dbRun(
          `INSERT INTO mensagens (
            conteudo, id_remetente, id_receptor, departamento_id, empresa_id
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            `Mensagem de teste ${i + 1}: Atualização de status`,
            funcionarioIds[Math.floor(Math.random() * funcionarioIds.length)],
            Math.random() > 0.4 ? funcionarioIds[Math.floor(Math.random() * funcionarioIds.length)] : null,
            Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : null,
            Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : null
          ]
        );
      }

      // Tarefas
      const statusTarefas = ['pendente', 'em andamento', 'concluida', 'atrasada'];
      for (let i = 0; i < quantidade * 2; i++) {
        await dbRun(
          `INSERT INTO tarefas (
            titulo, descricao, status, data_vencimento, funcionario_id
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            `Tarefa ${i + 1}`,
            `Descrição detalhada da tarefa ${i + 1}`,
            statusTarefas[Math.floor(Math.random() * statusTarefas.length)],
            new Date(Date.now() + Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            funcionarioIds[Math.floor(Math.random() * funcionarioIds.length)]
          ]
        );
      }

      // Metas
      for (let i = 0; i < quantidade; i++) {
        const dataInicio = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
        await dbRun(
          `INSERT INTO metas (
            titulo, descricao, data_inicio, data_fim, quantia_a_alcancar, alcance, item_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `Meta ${i + 1}`,
            `Descrição da meta ${i + 1} para alcançar resultados`,
            dataInicio.toISOString().split('T')[0],
            new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            (Math.random() * 100000).toFixed(2),
            (Math.random() * 50000).toFixed(2),
            Math.random() > 0.3 ? Math.floor(Math.random() * 10) + 1 : null
          ]
        );
      }

      // Projetos
      const prioridades = ['baixa', 'média', 'alta', 'crítica'];
      const statusProjetos = ['planejamento', 'em andamento', 'concluído', 'pausado'];
      for (let i = 0; i < quantidade; i++) {
        const dataInicio = new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000));
        await dbRun(
          `INSERT INTO projetos (
            nome, importe, data_inicio, data_previsao_termino, data_termino, 
            prioridade, gestor_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `Projeto ${i + 1}`,
            (Math.random() * 200000).toFixed(2),
            dataInicio.toISOString().split('T')[0],
            new Date(dataInicio.getTime() + Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            Math.random() > 0.7 ? new Date().toISOString().split('T')[0] : null,
            prioridades[Math.floor(Math.random() * prioridades.length)],
            funcionarioIds[Math.floor(Math.random() * funcionarioIds.length)],
            statusProjetos[Math.floor(Math.random() * statusProjetos.length)]
          ]
        );
      }

      fastify.log.info(`Dados iniciais inseridos com sucesso (quantidade: ${quantidade})`);
    } catch (error) {
      fastify.log.error("Erro ao popular dados iniciais:", error);
      throw error;
    }
  };

  popularDadosIniciais(10);
});

// Database helper functions
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

// Enhanced pagination function
async function paginate(request, tableName, options = {}) {
  try {
    // Input validation
    const paginationSchema = z.object({
      page: z.number().int().min(1).default(1),
      per_page: z.number().int().min(1).max(100).default(10),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).default('desc'),
      filter: z.record(z.string()).optional()
    });

    const { page, per_page, sort, order, filter } = paginationSchema.parse({
      page: parseInt(request.query.page) || 1,
      per_page: parseInt(request.query.per_page) || 10,
      sort: request.query.sort,
      order: request.query.order,
      filter: request.query.filter
    });

    const offset = (page - 1) * per_page;

    // Validate tableName
    const validTables = [
      'pipelines', 'etapas', 'etiquetas', 'contatos',
      'mensagens', 'tarefas', 'metas', 'projetos',
      'etapas_with_contactos'
    ];
    if (!validTables.includes(tableName)) {
      throw new Error('Invalid table name');
    }

    // Build query
    let whereClause = options.whereClause || '';
    const queryParams = options.params || [];
    
    // Handle filters
    if (filter) {
      const filterConditions = Object.entries(filter).map(([key, value]) => {
        if (!/^[a-zA-Z_]+$/.test(key)) throw new Error('Invalid filter key');
        return `${key} LIKE ?`;
      });
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += filterConditions.join(' AND ');
      queryParams.push(...Object.values(filter).map(v => `%${v}%`));
    }

    // Handle sorting
    let orderBy = '';
    if (sort) {
      if (!/^[a-zA-Z_]+$/.test(sort)) throw new Error('Invalid sort column');
      orderBy = `ORDER BY ${sort} ${order.toUpperCase()}`;
    } else {
      orderBy = options.orderBy || 'ORDER BY created_at DESC';
    }

    // Get total count
    const totalResult = await dbGet(
      `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`,
      queryParams
    );
    const total = totalResult?.total || 0;

    // Get paginated data
    const data = await dbAll(
      `SELECT * FROM ${tableName} ${whereClause} ${orderBy} LIMIT ? OFFSET ?`,
      [...queryParams, per_page, offset]
    );

    const lastPage = Math.max(1, Math.ceil(total / per_page));
    const currentPage = Math.min(page, lastPage);

    return {
      success: true,
      data: data || [],
      pagination: {
        current_page: currentPage,
        last_page: lastPage,
        per_page,
        total,
        from: total > 0 ? offset + 1 : 0,
        to: total > 0 ? Math.min(offset + per_page, total) : 0,
        has_more: currentPage < lastPage,
        next_page: currentPage < lastPage ? currentPage + 1 : null,
        prev_page: currentPage > 1 ? currentPage - 1 : null
      },
      metadata: {
        timestamp: new Date().toISOString(),
        path: request.url,
        table: tableName,
        sort: sort || 'created_at',
        order,
        filters: filter || {}
      }
    };
  } catch (error) {
    fastify.log.error(`Pagination error for ${tableName}:`, error);
    return {
      success: false,
      data: [],
      pagination: {
        current_page: 1,
        last_page: 1,
        per_page: parseInt(request.query.per_page) || 10,
        total: 0,
        from: 0,
        to: 0,
        has_more: false,
        next_page: null,
        prev_page: null
      },
      error: {
        message: 'Error processing pagination',
        details: error.message
      }
    };
  }
}

// API Documentationਨ

// Input validation schemas
const pipelineSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional()
});

const etapaSchema = z.object({
  pipeline_id: z.number().int().positive(),
  nome: z.string().min(1),
  ordem: z.number().int().min(0)
});

const etiquetaSchema = z.object({
  nome: z.string().min(1),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
});

const contatoSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  etapa_id: z.number().int().positive(),
  valor_negociacao: z.number().min(0).optional(),
  id_etiqueta: z.number().int().positive().optional(),
  status: z.enum(['aberto', 'fechado', 'perdido']).optional(),
  data_cadastro: z.string().date().optional(),
  data_encerramento: z.string().date().optional(),
  confianca: z.number().int().min(0).max(100).optional(),
  funcionario_id: z.number().int().positive().optional(),
  descricao: z.string().optional()
});

// API Documentation endpoint
fastify.get("/api/docs", async (request, reply) => {
  return {
    endpoints: {
      pipelines: {
        get: { path: "/api/pipelines", description: "List all pipelines" },
        post: { path: "/api/pipelines", description: "Create a new pipeline", schema: pipelineSchema },
        getById: { path: "/api/pipelines/:id", description: "Get a specific pipeline" },
        put: { path: "/api/pipelines/:id", description: "Update a pipeline", schema: pipelineSchema },
        delete: { path: "/api/pipelines/:id", description: "Delete a pipeline" }
      },
      etapas: {
        get: { path: "/api/etapas", description: "List all etapas" },
        post: { path: "/api/etapas", description: "Create a new etapa", schema: etapaSchema },
        getById: { path: "/api/etapas/:id", description: "Get a specific etapa" },
        put: { path: "/api/etapas/:id", description: "Update an etapa", schema: etapaSchema },
        delete: { path: "/api/etapas/:id", description: "Delete an etapa" }
      },
      // Add more endpoint documentation as needed
    },
    pagination: {
      parameters: {
        page: "Page number (default: 1)",
        per_page: "Items per page (default: 10, max: 100)",
        sort: "Field to sort by",
        order: "Sort order (asc/desc)",
        filter: "Object containing filter key-value pairs"
      }
    }
  };
});

// API Routes
fastify.get("/", async (request, reply) => {
  return { message: "Bem-vindo à API de CRM com Node.js, Fastify e SQLite!" };
});

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => paginate(request, "pipelines"));

    fastify.post("/", async (request, reply) => {
      const data = pipelineSchema.parse(request.body);
      const result = await dbRun(
        "INSERT INTO pipelines (nome, descricao) VALUES (?, ?)",
        [data.nome, data.descricao]
      );
      reply.code(201).send({ id: result.lastID, ...data });
    });

    fastify.get("/:id", async (request, reply) => {
      const options = {
        whereClause: "WHERE id = ?",
        params: [request.params.id]
      };
      const result = await paginate(request, "pipelines", options);
      if (!result.data.length) {
        return reply.code(404).send({ message: "Pipeline não encontrado" });
      }
      return result.data[0];
    });

    fastify.put("/:id", async (request, reply) => {
      const data = pipelineSchema.parse(request.body);
      const result = await dbRun(
        "UPDATE pipelines SET nome = ?, descricao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [data.nome, data.descricao, request.params.id]
      );
      if (result.changes === 0) {
        return reply.code(404).send({ message: "Pipeline não encontrado" });
      }
      return { message: "Pipeline atualizado com sucesso" };
    });

    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM pipelines WHERE id = ?", [
        request.params.id
      ]);
      if (result.changes === 0) {
        return reply.code(404).send({ message: "Pipeline não encontrado" });
      }
      return { message: "Pipeline excluído com sucesso" };
    });

    fastify.post("/:id/etapas", async (request, reply) => {
      const data = etapaSchema.parse({ ...request.body, pipeline_id: Number(request.params.id) });
      const result = await dbRun(
        "INSERT INTO etapas (pipeline_id, nome, ordem) VALUES (?, ?, ?)",
        [data.pipeline_id, data.nome, data.ordem]
      );
      reply.code(201).send({ id: result.lastID, ...data });
    });

    fastify.get("/:id/etapas", async (request, reply) => {
      const options = {
        whereClause: "WHERE pipeline_id = ?",
        params: [request.params.id],
        orderBy: "ORDER BY ordem"
      };
      return paginate(request, "etapas", options);
    });
  },
  { prefix: "/api/pipelines" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => paginate(request, "etapas"));

    fastify.post("/", async (request, reply) => {
      const data = etapaSchema.parse(request.body);
      const result = await dbRun(
        "INSERT INTO etapas (pipeline_id, nome, ordem) VALUES (?, ?, ?)",
        [data.pipeline_id, data.nome, data.ordem]
      );
      reply.code(201).send({ id: result.lastID, ...data });
    });

    fastify.get("/:id", async (request, reply) => {
      const options = {
        whereClause: "WHERE id = ?",
        params: [request.params.id]
      };
      const result = await paginate(request, "etapas", options);
      if (!result.data.length) {
        return reply.code(404).send({ message: "Etapa não encontrada" });
      }
      return result.data[0];
    });

    fastify.put("/:id", async (request, reply) => {
      const data = etapaSchema.parse(request.body);
      const result = await dbRun(
        "UPDATE etapas SET nome = ?, ordem = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [data.nome, data.ordem, request.params.id]
      );
      if (result.changes === 0) {
        return reply.code(404).send({ message: "Etapa não encontrada" });
      }
      return { message: "Etapa atualizada com sucesso" };
    });

    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM etapas WHERE id = ?", [
        request.params.id
      ]);
      if (result.changes === 0) {
        return reply.code(404).send({ message: "Etapa não encontrada" });
      }
      return { message: "Etapa excluída com sucesso" };
    });

    fastify.get("/with-contatos", async (request, reply) => {
      return paginate(request, "etapas_with_contactos");
    });

    fastify.get("/:id/contatos", async (request, reply) => {
      const options = {
        whereClause: "WHERE id = ?",
        params: [request.params.id]
      };
      return paginate(request, "etapas_with_contactos", options);
    });
  },
  { prefix: "/api/etapas" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => paginate(request, "etiquetas"));

    fastify.post("/", async (request, reply) => {
      const data = etiquetaSchema.parse(request.body);
      const result = await dbRun(
        "INSERT INTO etiquetas (nome, cor) VALUES (?, ?)",
        [data.nome, data.cor]
      );
      reply.code(201).send({ id: result.lastID, ...data });
    });

    fastify.get("/:id", async (request, reply) => {
      const options = {
        whereClause: "WHERE id = ?",
        params: [request.params.id]
      };
      const result = await paginate(request, "etiquetas", options);
      if (!result.data.length) {
        return reply.code(404).send({ message: "Etiqueta não encontrada" });
      }
      return result.data[0];
    });

    fastify.put("/:id", async (request, reply) => {
      const data = etiquetaSchema.parse(request.body);
      const result = await dbRun(
        "UPDATE etiquetas SET nome = ?, cor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [data.nome, data.cor, request.params.id]
      );
      if (result.changes === 0) {
        return reply.code(404).send({ message: "Etiqueta não encontrada" });
      }
      return { message: "Etiqueta atualizada com sucesso" };
    });

    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM etiquetas WHERE id = ?", [
        request.params.id
      ]);
      if (result.changes === 0) {
        return reply.code(404).send({ message: "Etiqueta não encontrada" });
      }
      return { message: "Etiqueta excluída com sucesso" };
    });
  },
  { prefix: "/api/etiquetas" }
);

fastify.register(
  async function (fastify) {
    fastify.get("/", async (request, reply) => paginate(request, "contatos"));

    fastify.post("/", async (request, reply) => {
      const data = contatoSchema.parse(request.body);
      const sql = `INSERT INTO contatos (
        nome, email, telefone, etapa_id, valor_negociacao, id_etiqueta,
        status, data_cadastro, data_encerramento, confianca, funcionario_id, descricao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const result = await dbRun(sql, [
        data.nome,
        data.email,
        data.telefone,
        data.etapa_id,
        data.valor_negociacao,
        data.id_etiqueta,
        data.status,
        data.data_cadastro,
        data.data_encerramento,
        data.confianca,
        data.funcionario_id,
        data.descricao
      ]);
      reply.code(201).send({ id: result.lastID, ...data });
    });

    fastify.get("/:id", async (request, reply) => {
      const options = {
        whereClause: "WHERE id = ?",
        params: [request.params.id]
      };
      const result = await paginate(request, "contatos", options);
      if (!result.data.length) {
        return reply.code(404).send({ message: "Contato não encontrado" });
      }
      return result.data[0];
    });

    fastify.put("/:id", async (request, reply) => {
      const data = contatoSchema.parse(request.body);
      const sql = `UPDATE contatos SET
        nome = ?, email = ?, telefone = ?, etapa_id = ?, valor_negociacao = ?,
        id_etiqueta = ?, status = ?, data_cadastro = ?, data_encerramento = ?,
        confianca = ?, funcionario_id = ?, descricao = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
      const result = await dbRun(sql, [
        data.nome,
        data.email,
        data.telefone,
        data.etapa_id,
        data.valor_negociacao,
        data.id_etiqueta,
        data.status,
        data.data_cadastro,
        data.data_encerramento,
        data.confianca,
        data.funcionario_id,
        data.descricao,
        request.params.id
      ]);
      if (result.changes === 0) {
        return reply.code(404).send({ message: "Contato não encontrado" });
      }
      return { message: "Contato atualizado com sucesso" };
    });

    fastify.delete("/:id", async (request, reply) => {
      const result = await dbRun("DELETE FROM contatos WHERE id = ?", [
        request.params.id
      ]);
      if (result.changes === 0) {
        return reply.code(404).send({ message: "Contato não encontrado" });
      }
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
    fastify.get("/", async (request, reply) => paginate(request, "tarefas"));

   fastify.get("/hoje", async (request, reply) =>
      paginate(request, "tarefas", {
        whereClause: "WHERE data_vencimento = date('now')",
      })
    );
    fastify.get("/feitas", async (request, reply) =>
      paginate(request, "tarefas", {
        whereClause: "WHERE status = 'concluida'",
      })
    );
    fastify.get("/pendentes", async (request, reply) =>
      paginate(request, "tarefas", {
        whereClause: "WHERE status = 'pendente'",
      })
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
     fastify.get("/", async (request, reply) => paginate(request, "metas"));
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
     fastify.get("/", async (request, reply) => paginate(request, "projetos"));
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