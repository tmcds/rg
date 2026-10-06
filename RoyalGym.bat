@echo off
title Royal Gym 
cd /d C:\GymManager
echo Starting Gym Manager...
echo.
echo The dashboard will open in your browser shortly.
echo DO NOT close this window while the software is open.
echo.
timeout /t 5 >nul
start http://localhost:3000
npm run dev
pause