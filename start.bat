@echo off
chcp 65001 >nul
title 古味寻踪 — 失传菜谱复原工作台
echo.
echo   ╔═══════════════════════════════════════╗
echo   ║   古味寻踪 · 失传菜谱复原工作台       ║
echo   ╚═══════════════════════════════════════╝
echo.
echo   正在启动桌面应用...
echo.

cd /d "%~dp0"

if exist "release\win-unpacked\古味寻踪.exe" (
    start "" "release\win-unpacked\古味寻踪.exe"
    echo   已启动打包版本。
) else if exist "node_modules\electron\dist\electron.exe" (
    echo   首次运行，启动开发模式（需要先 npm install）...
    npx concurrently "npx vite" "npx wait-on http://localhost:5173 && npx electron ."
) else (
    echo   [错误] 未检测到 Electron 环境，请先运行：
    echo     npm install
    echo     npm run electron:build
    echo.
)

timeout /t 5 >nul
