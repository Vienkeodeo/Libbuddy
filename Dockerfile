FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/Libbuddy.Api/Libbuddy.Api.csproj backend/Libbuddy.Api/
RUN cd backend/Libbuddy.Api && dotnet restore Libbuddy.Api.csproj
COPY backend/ backend/
RUN cd backend/Libbuddy.Api && dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:10000 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 10000
ENTRYPOINT ["dotnet", "Libbuddy.Api.dll"]
