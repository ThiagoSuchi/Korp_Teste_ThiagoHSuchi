Projeto Korp - instruções Docker

Rápido:

- Levantar bancos e serviços com Docker Compose:

```bash
docker compose up --build
```

Isso criará os serviços:
- `db` (Postgres, porta 5432)
- `backend-faturamento` (porta 5001)
- `backend-estoque` (porta 5002)
- `frontend` (porta 80)

Variáveis importantes do Postgres (definidas no `docker-compose.yml`):
- POSTGRES_USER=postgres
- POSTGRES_PASSWORD=postgres
- POSTGRES_DB=korpdb

Observações:
- Os Dockerfiles usam multi-stage builds. O `backend/Dockerfile` usa o ARG `PROJECT` para construir qualquer projeto dentro da pasta `backend` (p.ex. `FaturamentoService` ou `EstoqueService`).
- Se seu `appsettings.json` usa outra chave para a string de conexão, ajuste `ConnectionStrings__DefaultConnection` no `docker-compose.yml`.

Se quiser subir apenas o banco:

```bash
docker compose up db
```

Para destruir volumes (atenção: apaga dados do Postgres):

```bash
docker compose down -v
```
