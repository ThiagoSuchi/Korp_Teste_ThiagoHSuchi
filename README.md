Projeto Korp – emissão integrada de notas fiscais
=================================================

Aplicação full-stack que centraliza o cadastro de produtos, emissão de notas fiscais e impressão em PDF. As APIs .NET operam com repositórios em memória para simplificar o fluxo em ambientes pequenos, enquanto o frontend Angular oferece um painel único para operação.

Executando com Docker Compose
-----------------------------

1. Construa as imagens e levante todos os serviços:

	 ```bash
	 docker compose up --build
	 ```

2. Acesse a aplicação em `http://localhost`.

Serviços provisionados
----------------------

| Serviço               | Porta host | Descrição                                         |
|-----------------------|------------|---------------------------------------------------|
| `backend-estoque`     | 5213       | API ASP.NET Core responsável pelo controle de estoque (dados em memória) |
| `backend-faturamento` | 5284       | API ASP.NET Core para emissão e impressão de notas (dados em memória) |
| `frontend`            | 80         | SPA Angular servida por Nginx                     |

Como os dados permanecem apenas em memória, não há dependência de banco relacional ou variáveis de ambiente específicas.

Dockerfiles otimizados
----------------------

- **backend/Dockerfile**: multi-stage build com caching de restaurações NuGet e publicação específica por projeto via `ARG PROJECT`.
- **frontend/Dockerfile**: compila o Angular com Node 20 e publica artefatos estáticos em Nginx.

Resiliência e idempotência
--------------------------

- Todas as rotas POST críticas (`/produtos`, `/produtos/consumo`, `/notas-fiscais`, `/notas-fiscais/{id}/fechamento`, `/notas-fiscais/{id}/impressao`) exigem e respeitam o cabeçalho `Idempotency-Key`. Chamadas repetidas com o mesmo valor retornam a mesma resposta, evitando efeitos colaterais duplicados.
- O frontend Angular injeta o cabeçalho automaticamente com `crypto.randomUUID()`, reduzindo retrabalho em caso de reenvio pela UI.
- As respostas em cache expiram após dez minutos para evitar crescimento ilimitado em memória.

Comandos úteis
--------------

- Parar serviços preservando volumes:

	```bash
	docker compose down
	```

- Parar e remover rede/containers:

	```bash
	docker compose down --remove-orphans
	```
