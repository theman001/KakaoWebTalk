@echo off
REM Git 커밋 스크립트 (Batch)
REM 사용법: commit.bat [커밋 메시지]
REM 사용법: commit.bat "커밋 메시지"

REM UTF-8 인코딩 설정
chcp 65001 >nul 2>&1

setlocal enabledelayedexpansion

REM 현재 디렉토리 확인
for %%F in ("%CD%") do set CURRENT_DIR=%%~nxF
if not "%CURRENT_DIR%"=="KakaoWebTalk" (
    echo 이 스크립트는 KakaoWebTalk 디렉토리에서 실행해야 합니다.
    exit /b 1
)

REM Git 상태 확인
git status --porcelain >nul 2>&1
if errorlevel 1 (
    echo Git 저장소가 아닙니다.
    exit /b 1
)

REM 변경사항 확인
git status --porcelain | findstr /R "." >nul
if errorlevel 1 (
    echo 커밋할 변경사항이 없습니다.
    exit /b 0
)

REM 변경사항 표시
echo.
echo 변경된 파일:
git status --short
echo.

REM 커밋 메시지 입력
set "COMMIT_MSG=%~1"
if "!COMMIT_MSG!"=="" (
    set /p COMMIT_MSG="커밋 메시지를 입력하세요: "
    
    if "!COMMIT_MSG!"=="" (
        for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set DATE_STR=%%c-%%a-%%b
        for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME_STR=%%a:%%b
        set "COMMIT_MSG=Update: !DATE_STR! !TIME_STR!"
        echo 기본 커밋 메시지를 사용합니다: !COMMIT_MSG!
    )
)

REM Git add
echo.
echo 변경사항을 스테이징합니다...
git add .
if errorlevel 1 (
    echo git add 실패
    exit /b 1
)

REM Git commit
echo 커밋 중...
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
    echo 커밋 실패
    exit /b 1
)

echo.
echo 커밋이 완료되었습니다!
echo 커밋 메시지: !COMMIT_MSG!
echo.

REM Push 여부 확인
set /p PUSH="원격 저장소에 푸시하시겠습니까? (y/N): "
if /i "!PUSH!"=="y" (
    echo 푸시 중...
    git push
    if errorlevel 1 (
        echo 푸시 실패
    ) else (
        echo 푸시가 완료되었습니다!
    )
)

endlocal

