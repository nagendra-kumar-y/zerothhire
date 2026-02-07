@echo off
REM Quick Start Script for ZerothHire Platform
REM Run this to set up and start the application

echo.
echo ========================================
echo  ZerothHire Platform
echo  Quick Start Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed

echo.
echo Choose what you want to do:
echo.
echo 1. Install dependencies (first time setup)
echo 2. Start MongoDB (required)
echo 3. Start Backend Server
echo 4. Start Frontend Server
echo 5. Start All Services (instructions)
echo 6. Health Check
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" (
    echo.
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
    echo [OK] Dependencies installed successfully!
    echo Next: Start MongoDB and the servers
    pause
) else if "%choice%"=="2" (
    echo.
    echo Starting MongoDB...
    echo Make sure MongoDB is installed first
    echo For download, visit: https://www.mongodb.com/try/download/community
    echo.
    mongod
) else if "%choice%"=="3" (
    echo.
    echo Starting Backend Server...
    echo Server will run on http://localhost:5000
    echo.
    cd backend
    call npm run dev
) else if "%choice%"=="4" (
    echo.
    echo Starting Frontend Server...
    echo Dashboard will open on http://localhost:3000
    echo.
    cd frontend
    call npm start
) else if "%choice%"=="5" (
    echo.
    echo To start all services, open 3 terminal windows:
    echo.
    echo Terminal 1: mongod
    echo Terminal 2: cd backend ^&^& npm run dev
    echo Terminal 3: cd frontend ^&^& npm start
    echo.
    pause
) else if "%choice%"=="6" (
    echo.
    echo Checking health status...
    echo Make sure backend is running on port 5000
    echo.
    curl http://localhost:5000/api/health
    echo.
    pause
) else (
    echo Invalid choice!
    pause
)
