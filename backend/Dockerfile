# Dockerfile multi-stage para projetos .NET no diretório `backend`.
# Usa o ARG PROJECT para construir qualquer projeto dentro de /backend (p.ex. FaturamentoService ou EstoqueService).

ARG PROJECT=FaturamentoService
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copia tudo para permitir `dotnet restore` em solução/nugets
COPY . ./

WORKDIR /src/$PROJECT

# Restaura e publica o projeto (não assume dependências externas)
RUN dotnet restore
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
ARG PROJECT
ENV PROJECT=${PROJECT}
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:80
EXPOSE 80

# Usa a forma shell para expandir a variável PROJECT na hora do start
ENTRYPOINT dotnet /app/$PROJECT.dll
