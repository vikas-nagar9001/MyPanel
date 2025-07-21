@echo off
echo.
echo ========================================
echo    Bazaar Verse OTP Dashboard Setup
echo ========================================
echo.

echo Installing dependencies...
call npm install

echo.
echo Initializing database...
call node init-db.js

echo.
echo Starting server in development mode...
echo Access the dashboard at: http://localhost:3000
echo.
echo Default Admin Credentials:
echo Username: admin
echo Password: admin123
echo.
echo ========================================
echo.

call npm run dev
