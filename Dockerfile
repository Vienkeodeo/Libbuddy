# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project file first for restore caching
COPY backend/Libbuddy.Api/Libbuddy.Api.csproj backend/Libbuddy.Api/
RUN dotnet restore "backend/Libbuddy.Api/Libbuddy.Api.csproj"

# Copy everything
COPY . .
WORKDIR "/src/backend/Libbuddy.Api"
RUN dotnet publish "Libbuddy.Api.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "Libbuddy.Api.dll"]
