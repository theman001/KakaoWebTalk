# Git 커밋 스크립트 (PowerShell)
# 사용법: .\commit.ps1 [커밋 메시지]
# 사용법: .\commit.ps1 "커밋 메시지"

param(
    [string]$Message = ""
)

# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# 현재 디렉토리가 KakaoWebTalk인지 확인
$currentDir = Split-Path -Leaf (Get-Location)
if ($currentDir -ne "KakaoWebTalk") {
    Write-Host "이 스크립트는 KakaoWebTalk 디렉토리에서 실행해야 합니다." -ForegroundColor Red
    exit 1
}

# Git 상태 확인
$gitStatus = git status --porcelain 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git 저장소가 아닙니다." -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($gitStatus)) {
    Write-Host "커밋할 변경사항이 없습니다." -ForegroundColor Yellow
    exit 0
}

# 변경사항 표시
Write-Host "`n변경된 파일:" -ForegroundColor Cyan
git status --short

# 커밋 메시지 입력
if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = Read-Host "`n커밋 메시지를 입력하세요"
    
    if ([string]::IsNullOrWhiteSpace($Message)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $Message = "Update: $timestamp"
        Write-Host "기본 커밋 메시지를 사용합니다: $Message" -ForegroundColor Yellow
    }
}

# Git add
Write-Host "`n변경사항을 스테이징합니다..." -ForegroundColor Green
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "git add 실패" -ForegroundColor Red
    exit 1
}

# Git commit
Write-Host "커밋 중..." -ForegroundColor Green
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "커밋 실패" -ForegroundColor Red
    exit 1
}

Write-Host "`n커밋이 완료되었습니다!" -ForegroundColor Green
Write-Host "커밋 메시지: $Message" -ForegroundColor Cyan

# Push 여부 확인
$push = Read-Host "`n원격 저장소에 푸시하시겠습니까? (y/N)"
if ($push -eq "y" -or $push -eq "Y") {
    Write-Host "푸시 중..." -ForegroundColor Green
    git push
    if ($LASTEXITCODE -eq 0) {
        Write-Host "푸시가 완료되었습니다!" -ForegroundColor Green
    } else {
        Write-Host "푸시 실패" -ForegroundColor Red
    }
}

