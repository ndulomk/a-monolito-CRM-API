Documentação da API de CRM (Node.js + Fastify)

Índice

    Visão Geral

    Recursos Principais

    Tecnologias Utilizadas

    Configuração e Execução

    Estrutura do Banco de Dados

    Documentação dos Endpoints (Rotas)

        Pipelines

        Etapas

        Etiquetas

        Contatos (Oportunidades)

        Mensagens

        Tarefas

        Metas

        Projetos

    Próximos Passos e Melhorias

1. Visão Geral

Este documento descreve a API RESTful para um sistema de CRM (Customer Relationship Management). O projeto foi desenvolvido como um monolito em um único arquivo utilizando Node.js com o framework Fastify e o banco de dados SQLite.

A API fornece funcionalidades essenciais de CRM, incluindo o gerenciamento de pipelines de vendas, contatos, tarefas, metas e comunicação interna.

2. Recursos Principais

    Gerenciamento de Pipelines de Vendas: Crie e administre múltiplos funis de vendas.

    Gestão de Etapas: Defina as fases específicas para cada pipeline.

    Organização com Etiquetas: Categorize e identifique negócios com etiquetas coloridas.

    Contatos e Oportunidades: Administre as negociações, seus valores e status.

    Mensageria Interna: Funcionalidades de chat privado, em grupo (departamento) e de suporte ao cliente.

    Gerenciamento de Tarefas: Crie e monitore tarefas para a equipe, com filtros por status e data.

    Definição de Metas: Estabeleça e acompanhe metas de vendas ou de equipe.

    Gestão de Projetos: Administre projetos, definindo escopo, prazos e responsáveis.

3. Tecnologias Utilizadas

    Runtime: Node.js

    Framework: Fastify (para alta performance no roteamento e gerenciamento de requisições)

    Banco de Dados: SQLite (armazenado no arquivo crm.db)

    Driver do Banco de Dados: sqlite3

4. Configuração e Execução

Pré-requisitos:

    Node.js e npm instalados.

Passos para execução:

    Salve o código fornecido anteriormente em um arquivo chamado crm_server.js.

    Abra o terminal na pasta do projeto.

    Instale as dependências:
    Bash

npm install fastify sqlite3

Inicie o servidor:
Bash

    node crm_server.js

    Verificação:

        O terminal exibirá logs indicando que o servidor está rodando na porta 3000.

        Um arquivo de banco de dados chamado crm.db será criado na mesma pasta.

5. Estrutura do Banco de Dados

A API utiliza as seguintes tabelas no banco de dados SQLite:

    pipelines: Armazena os funis de venda.

    etapas: Contém as fases de cada pipeline (relaciona-se com pipelines).

    etiquetas: Guarda as etiquetas (tags) para categorizar itens.

    contatos: O coração do CRM, representa as oportunidades de negócio (relaciona-se com etapas e etiquetas).

    mensagens: Armazena todas as mensagens (privadas, de grupo ou de suporte).

    tarefas: Contém as tarefas a serem executadas pelos funcionários.

    metas: Guarda as metas e seus progressos.

    projetos: Armazena informações sobre projetos maiores.

6. Documentação dos Endpoints (Rotas)

A URL base para todas as rotas da API é http://localhost:3000/api.

Pipelines

Gerencia os funis de vendas.

    GET /pipelines

        Descrição: Lista todos os pipelines.

        Resposta (200 OK): [{ "id": 1, "nome": "Pipeline Vendas", ... }]

    POST /pipelines

        Descrição: Cria um novo pipeline.

        Corpo da Requisição: {"nome": "string", "descricao": "string"}

        Resposta (201 Created): {"id": 2, "nome": "Novo Pipeline", ...}

    GET /pipelines/:id

        Descrição: Busca um pipeline específico pelo ID.

        Resposta (200 OK): {"id": 1, "nome": "Pipeline Vendas", ...}

        Resposta (404 Not Found): {"message": "Pipeline não encontrado"}

    PUT /pipelines/:id

        Descrição: Atualiza um pipeline existente.

        Corpo da Requisição: {"nome": "string", "descricao": "string"}

        Resposta (200 OK): {"message": "Pipeline atualizado com sucesso"}

    DELETE /pipelines/:id

        Descrição: Exclui um pipeline.

        Resposta (200 OK): {"message": "Pipeline excluído com sucesso"}

Etapas

Gerencia as fases dentro de um pipeline.

    GET /etapas: Lista todas as etapas.

    POST /etapas: Cria uma nova etapa.

        Corpo da Requisição: {"pipeline_id": integer, "nome": "string", "ordem": integer}

    GET /etapas/:id: Busca uma etapa pelo ID.

    PUT /etapas/:id: Atualiza uma etapa.

        Corpo da Requisição: {"pipeline_id": integer, "nome": "string", "ordem": integer}

    DELETE /etapas/:id: Exclui uma etapa.

Etiquetas

Gerencia as etiquetas (tags).

    GET /etiquetas: Lista todas as etiquetas.

    POST /etiquetas: Cria uma nova etiqueta.

        Corpo da Requisição: {"nome": "string", "cor": "string"} (ex: cor: "#FF5733")

    PUT /etiquetas/:id: Atualiza uma etiqueta.

    DELETE /etiquetas/:id: Exclui uma etiqueta.

Contatos (Oportunidades)

Gerencia as negociações e oportunidades.

    GET /contatos: Lista todos os contatos/oportunidades.

    POST /contatos: Cria um novo contato.

        Corpo da Requisição (exemplo):
        JSON

        {
            "nome": "Oportunidade Grande Empresa",
            "email": "contato@grandeempresa.com",
            "etapa_id": 1,
            "valor_negociacao": 50000.00,
            "status": "aberto",
            "data_cadastro": "2025-08-01",
            "funcionario_id": 10
        }

    GET /contatos/:id: Busca um contato pelo ID.

    PUT /contatos/:id: Atualiza um contato.

    DELETE /contatos/:id: Exclui um contato.

Mensagens

Gerencia a comunicação interna e de suporte.

    POST /mensagens/privada: Envia uma mensagem de um remetente para um receptor.

        Corpo da Requisição: {"conteudo": "string", "id_remetente": integer, "id_receptor": integer}

    POST /mensagens/grupo: Envia uma mensagem para um grupo (departamento).

        Corpo da Requisição: {"conteudo": "string", "id_remetente": integer, "departamento_id": integer}

    POST /mensagens/suporte: Envia uma mensagem de suporte para uma empresa.

        Corpo da Requisição: {"conteudo": "string", "id_remetente": integer, "id_receptor": integer, "empresa_id": integer}

    GET /mensagens/suporte/listar/:empresa_id: Lista todas as mensagens de suporte de uma empresa específica.

    PUT /mensagens/suporte/:id: Atualiza o conteúdo de uma mensagem de suporte.

        Corpo da Requisição: {"conteudo": "string"}

    DELETE /mensagens/suporte/:id: Exclui uma mensagem de suporte.

Tarefas

Gerencia as tarefas da equipe.

    GET /tarefas: Lista todas as tarefas.

    GET /tarefas/hoje: Lista tarefas com data de vencimento para hoje.

    GET /tarefas/feitas: Lista tarefas com status "concluida".

    GET /tarefas/pendentes: Lista tarefas com status "pendente".

    POST /tarefas: Cria uma nova tarefa.

        Corpo da Requisição: {"titulo": "string", "descricao": "string", "status": "string", "data_vencimento": "YYYY-MM-DD", "funcionario_id": integer}

    PUT /tarefas/:id: Atualiza uma tarefa.

    DELETE /tarefas/:id: Exclui uma tarefa.

Metas

Gerencia as metas da equipe ou individuais.

    GET /metas: Lista todas as metas.

    POST /metas: Cria uma nova meta.

        Corpo da Requisição: {"titulo": "string", "data_inicio": "YYYY-MM-DD", "data_fim": "YYYY-MM-DD", "quantia_a_alcancar": float, "alcance": float}

    PUT /metas/:id: Atualiza uma meta.

    DELETE /metas/:id: Exclui uma meta.

Projetos

Gerencia os projetos.

    GET /projetos: Lista todos os projetos.

    POST /projetos: Cria um novo projeto.

        Corpo da Requisição: {"nome": "string", "importe": float, "data_inicio": "YYYY-MM-DD", "prioridade": "string", "gestor_id": integer, "status": "string"}

    PUT /projetos/:id: Atualiza um projeto.

    DELETE /projetos/:id: Exclui um projeto.

7. Próximos Passos e Melhorias

Este projeto serve como uma excelente base funcional. Para uma aplicação em produção, as seguintes melhorias são recomendadas:

    Validação de Dados: Implementar validação de schema para os corpos das requisições (payloads) para garantir que os dados recebidos estão corretos antes de processá-los. O Fastify possui um excelente sistema de validação baseado em JSON Schema.

    Autenticação e Autorização: A API atualmente está aberta. É crucial implementar um sistema de autenticação (ex: JWT - JSON Web Tokens) para proteger as rotas e garantir que apenas usuários autorizados possam acessar e modificar os dados.

    Refatoração para uma Estrutura Modular: Para facilitar a manutenção e o crescimento do projeto, é recomendado refatorar o código monolítico, separando as responsabilidades em diferentes arquivos e pastas (ex: routes/, controllers/, services/, db/).

    Tratamento de Erros Avançado: Criar um manipulador de erros global para padronizar as respostas de erro em toda a aplicação.

    Testes Automatizados: Escrever testes unitários e de integração para garantir a confiabilidade e estabilidade do código.
