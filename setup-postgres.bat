@echo off
echo Configurando PostgreSQL con Docker...

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker no está instalado. Por favor instale Docker Desktop primero.
    echo Descargue Docker Desktop desde: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo Docker encontrado. Iniciando contenedor PostgreSQL...

REM Detener y eliminar contenedor existente si existe
docker stop facturador-postgres >nul 2>&1
docker rm facturador-postgres >nul 2>&1

REM Crear y ejecutar contenedor PostgreSQL
docker run --name facturador-postgres ^
    -e POSTGRES_DB=facturador ^
    -e POSTGRES_USER=postgres ^
    -e POSTGRES_PASSWORD=postgres ^
    -p 5432:5432 ^
    -d postgres:13

if %errorlevel% equ 0 (
    echo PostgreSQL iniciado exitosamente en el puerto 5432
    echo Base de datos: facturador
    echo Usuario: postgres
    echo Contraseña: postgres
    echo.
    echo Esperando que PostgreSQL esté listo...
    timeout /t 10 /nobreak >nul
    echo PostgreSQL está listo para usar.
) else (
    echo Error al iniciar PostgreSQL
    exit /b 1
)

pause
