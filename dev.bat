@echo off
setlocal

cd /d "%~dp0"

if not exist node_modules (
  echo Installing npm dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

if not exist .env.local (
  echo Creating .env.local from .env.example...
  copy .env.example .env.local >nul
)

call npm run dev
