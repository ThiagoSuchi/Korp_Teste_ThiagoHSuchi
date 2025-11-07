ARG PROJECT=FaturamentoService

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS restore
ARG PROJECT=FaturamentoService
WORKDIR /src

# Copia apenas arquivos necessários para restaurar dependências (melhor cache)
COPY FaturamentoService/*.csproj FaturamentoService/
COPY EstoqueService/*.csproj EstoqueService/

RUN dotnet restore "./${PROJECT}/${PROJECT}.csproj"

FROM restore AS build
ARG PROJECT=FaturamentoService
WORKDIR /src
COPY . ./
RUN dotnet publish "./${PROJECT}/${PROJECT}.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
ARG PROJECT=FaturamentoService
ENV ASPNETCORE_ENVIRONMENT=Production \
	ASPNETCORE_URLS=http://+:8080 \
	PROJECT=${PROJECT}
WORKDIR /app
COPY --from=build /app/publish ./

EXPOSE 8080

# Usa shell para interpretar a variável PROJECT na hora do start
ENTRYPOINT ["/bin/sh", "-c", "dotnet /app/${PROJECT}.dll"]
