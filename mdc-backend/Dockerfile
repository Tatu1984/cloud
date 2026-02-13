# Use the official .NET 9.0 runtime as a parent image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# Use the SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj files and restore as distinct layers
COPY ["MDC.Api/MDC.Api.csproj", "MDC.Api/"]
COPY ["MDC.Core/MDC.Core.csproj", "MDC.Core/"]
COPY ["MDC.Shared/MDC.Shared.csproj", "MDC.Shared/"]
RUN dotnet restore "MDC.Api/MDC.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/MDC.Api"
RUN dotnet build "MDC.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MDC.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build runtime image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MDC.Api.dll"]