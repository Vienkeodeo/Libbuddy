# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files first for caching
COPY ["Libbuddy.Api/Libbuddy.Api.csproj", "Libbuddy.Api/"]
RUN dotnet restore "Libbuddy.Api/Libbuddy.Api.csproj"

# Copy everything
COPY . .
WORKDIR "/src/Libbuddy.Api"
RUN dotnet build "Libbuddy.Api.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "Libbuddy.Api.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Entrypoint: migrate + seed, then run
ENTRYPOINT ["bash", "-c", "\
  echo 'Running migrations...' && \
  dotnet Libbuddy.Api.dll --migrate && \
  echo 'Starting app...' && \
  exec dotnet Libbuddy.Api.dll"]
