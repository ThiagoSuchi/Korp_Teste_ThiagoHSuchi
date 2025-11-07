# Detalhamento Técnico

## Visão Geral

O projeto implementa uma solução full-stack para cadastro de produtos, emissão e impressão de notas fiscais, seguindo o desafio técnico da Korp. A arquitetura é composta por dois microserviços ASP.NET Core 8 (controle de estoque e faturamento) e uma SPA Angular 20 servida via Nginx. Toda a comunicação ocorre sobre HTTP, orquestrada em ambiente local por Docker Compose.

## Topologia da Solução

```
┌─────────────────────────────────────────┐
│            docker-compose.yml           │
│                                         │
│  ┌────────────────┐  HTTP  ┌──────────┐ │
│  │ frontend (SPA) │◀──────▶│ Nginx    │ │
│  └────────────────┘        └──────────┘ │
│          ▲ HTTP                         │
│  ┌───────┴─────────────┐                │
│  │ Angular 20 (SPA)    │                │
│  │ serviços REST       │                │
│  └───────┬─────────────┘                │
│   HTTP   │                              │
│  ┌───────▼───────────┐   ┌────────────┐ │
│  │ EstoqueService    │   │Faturamento │ │
│  │ ASP.NET 8 Minimal │   │Service     │ │
│  │ APIs              │   │ ASP.NET 8  │ │
│  └───────────────────┘   └────────────┘ │
└─────────────────────────────────────────┘
```

- **frontend**: Angular 20 (signals/formulários reativos), empacotado e servido por um contêiner Nginx 1.27.
- **backend-estoque**: API minimalista .NET 8 para cadastro/listagem de produtos e consumo de estoque.
- **backend-faturamento**: API minimalista .NET 8 para criação, fechamento e impressão (mock de PDF) de notas fiscais.
- **Comunicação**: RESTful em JSON, utilizando `fetch` via `HttpClient` no frontend.

## Back-end

### EstoqueService

- Projeto ASP.NET Core 8 com minimal APIs (`Program.cs`).
- Repositório em memória (`InMemoryProductRepository`) usando `ConcurrentDictionary` para armazenar produtos.
- Idempotência implementada via `IdempotencyService`: cache de respostas por `Idempotency-Key` + `SemaphoreSlim` para evitar execuções duplicadas.
- Endpoints principais:
  - `POST /produtos`: cria produto (idempotente, validação de payload, conflito se código existir).
  - `GET /produtos`: lista todos os produtos.
  - `POST /produtos/consumo`: debita estoque para uma nota fiscal (idempotente, verifica saldo).
- Configurações relevantes:
  - CORS liberado para o frontend.
  - Swagger habilitado em desenvolvimento.
  - JSON contracts em `Contracts/ProductContracts.cs` com validação estática.

### FaturamentoService

- Projeto ASP.NET Core 8 com minimal APIs.
- Repositório em memória (`InMemoryInvoiceRepository`) para notas fiscais.
- HttpClient nomeado para acessar o serviço de estoque.
- Idempotência via `IdempotencyService` compartilhando a mesma lógica (cache em memória).
- Endpoints principais:
  - `POST /notas-fiscais`: cria nota em estado "Aberta".
  - `GET /notas-fiscais`: lista notas.
  - `POST /notas-fiscais/{id}/fechamento`: fecha nota (status "Fechada").
  - `POST /notas-fiscais/{id}/impressao`: consome estoque (chama `/produtos/consumo`), fecha nota e retorna payload informativo.
- Contratos em `Contracts/InvoiceContracts.cs` definem validações (item obrigatório, quantidade positiva).

### Políticas Técnicas

- **Idempotency-Key**: obrigatória para todos os `POST` sensíveis. Respostas são cacheadas por 10 minutos.
- **Tratamento de erros**: erros de negócio retornam JSON `{ erro: "..." }`, aproveitado pelo frontend.
- **Persistência**: in-memory (sem banco externo), alinhado às restrições do desafio.
- **Logs/Observabilidade**: minimal (default ASP.NET). Pode ser expandido com Serilog ou Application Insights se necessário.

### Tecnologias e frameworks (C#)

- Framework principal: **ASP.NET Core 8** (Minimal APIs).
- `System.Linq` é utilizado para mapear coleções (`Select`, `ToArray`), filtrar/contar itens e derivar métricas (ex.: total de itens em notas).
- `Microsoft.Extensions.Caching.Memory` provê cache em memória para a estratégia de idempotência.
- `System.Collections.Concurrent` (via `ConcurrentDictionary`) garante threadsafe nos repositórios em memória.
- `IHttpClientFactory` é usado para criar clientes tipados ao consumir o serviço de estoque.

### Tratamento de erros/exceções

- Validações nos DTOs (`EhValido`, `EhValida`) retornam `Results.BadRequest` com mensagens amigáveis.
- Conflitos de negócio (`Results.Conflict`) notificam duplicidade de código, saldo insuficiente ou nota já fechada.
- Recursos ausentes resultam em `Results.NotFound`.
- Respostas de APIs externas (estoque) são propagadas com `Results.Json`, preservando status HTTP e payload.
- Idempotência reduz reprocessamentos involuntários em cenários de retry.

### Golang

- Nenhum serviço foi escrito em Go; portanto, não há gerenciamento de dependências ou frameworks Golang a relatar.

## Front-end

### Stack e Configuração

- Angular 20 com setup standalone (`bootstrapApplication`).
- `app.routes.ts` define rotas principais (`/produtos`, `/notas-fiscais`).
- HttpClient configurado com `withFetch()` para uso de `fetch API` nativa.
- Tailwind 4 (`@tailwindcss/postcss`) e utilitários próprios (`merge-classes`, `cn`, `helpers`).
- Build com `ng build`, servido via Nginx (config `frontend/Dockerfile` e `nginx.conf`).

#### Ciclos de vida Angular

- Os componentes não implementam interfaces explícitas (`OnInit`, `OnDestroy`, etc.). A inicialização ocorre no construtor em conjunto com sinais (`signal`) para estado reativo.
- O helper `takeUntilDestroyed` cumpre o papel de limpeza automática quando o componente é destruído, eliminando a necessidade de `ngOnDestroy` manual.

#### Uso de RxJS

- As chamadas HTTP retornam `Observable`, padrão do `HttpClient`.
- Operadores utilizados:
  - `takeUntilDestroyed` para encerrar streams ao destruir o componente.
  - `finalize` para resetar flags de carregamento após cada requisição.
- Processamento via `subscribe({ next, error })`, alimentando toasts e estados.

#### Outras bibliotecas front-end

- `ngx-sonner`: sistema de toast.
- `class-variance-authority`, `clsx`, `tailwind-merge`: composição e deduplicação de classes.
- `jsPDF`, `html2canvas`, `canvg`, `dompurify`: geração/limpeza de PDFs.
- Tailwind 4 e utilitários `merge-classes`, `helpers` para padronização de estilos.

#### Bibliotecas visuais

- Tailwind para layout responsivo.
- `ngx-sonner` para notificações.
- Ajustes finos em `app.css` para paleta verde/vermelho suave.

### Componentes Principais

- `ProductsPageComponent`: formulário reativo para cadastro e tabela de estoque.
  - Scroll interno (`overflow-y-auto`) limita crescimento do grid de produtos.
  - Usa `ToastService` para feedback de sucesso/erro.
- `InvoicesPageComponent`: dashboard com métricas, criação de notas, listagem com scroll e ações de impressão.
  - Utiliza `FormArray` para itens dinâmicos.
  - PDF gerado por `PdfService` com `jsPDF` + `html2canvas`.
  - Toasts pastel (verde para sucesso, vermelho para erro) via `ngx-sonner` e `toast.service.ts`.
- `ToastService`: wrapper para `ngx-sonner` que aplica classes padronizadas e traduz mensagens de erro de API via `extrairMensagemErro`.

### UX/UI

- Layout responsivo com classes utilitárias (base Tailwind).
- Painéis com sombras suaves e `backdrop-blur` para delimitar seções.
- Feedback visual consistente (botoões, badges por status de nota, loaders textuais).
- Scrolls específicos evitam que cards cresçam indefinidamente.

## Comunicação entre serviços

- `FaturamentoService` chama `EstoqueService` via HttpClient nomeado `EstoqueService`.
- URLs base configuráveis por `appsettings.json` / variáveis de ambiente (default `http://localhost:5213`).
- Em caso de falha na impressão (ex.: saldo insuficiente), a resposta de erro do estoque é propagada ao frontend.

## Docker & Deployment

- `docker-compose.yml` orquestra três serviços (frontend, backend-estoque, backend-faturamento).
- Dockerfiles:
  - **backend/Dockerfile**: multi-stage com restauração NuGet e publicação por projeto (`ARG PROJECT`).
  - **frontend/Dockerfile**: build Angular com Node 20 e stage final Nginx (config custom via `nginx.conf`).
- Execução local: `docker compose up --build` disponibiliza a SPA em `http://localhost`.

## Segurança e Boas Práticas

- CORS liberado apenas para facilitar desenvolvimento; em produção, ajustar para domínios específicos.
- HTTPS não configurado localmente (pode ser adicionado via Nginx ou ASP.NET `UseHttpsRedirection`).
- Idempotência evita duplicidade de operações em cenários de retry.
- Repositórios em memória são thread-safe (`ConcurrentDictionary`) para suportar múltiplas requisições.

