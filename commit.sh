#!/bin/bash

# Git 커밋 스크립트 (Bash - Linux/Mac)
# 사용법: ./commit.sh [커밋 메시지]
# 사용법: ./commit.sh "커밋 메시지"

# 현재 디렉토리 확인
CURRENT_DIR=$(basename "$PWD")
if [ "$CURRENT_DIR" != "KakaoWebTalk" ]; then
    echo "이 스크립트는 KakaoWebTalk 디렉토리에서 실행해야 합니다."
    exit 1
fi

# Git 저장소 확인
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Git 저장소가 아닙니다."
    exit 1
fi

# 변경사항 확인
if [ -z "$(git status --porcelain)" ]; then
    echo "커밋할 변경사항이 없습니다."
    exit 0
fi

# 변경사항 표시
echo ""
echo "변경된 파일:"
git status --short
echo ""

# 커밋 메시지 입력
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
    read -p "커밋 메시지를 입력하세요: " COMMIT_MSG
    
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "기본 커밋 메시지를 사용합니다: $COMMIT_MSG"
    fi
fi

# Git add
echo ""
echo "변경사항을 스테이징합니다..."
git add .
if [ $? -ne 0 ]; then
    echo "git add 실패"
    exit 1
fi

# Git commit
echo "커밋 중..."
git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
    echo "커밋 실패"
    exit 1
fi

echo ""
echo "커밋이 완료되었습니다!"
echo "커밋 메시지: $COMMIT_MSG"
echo ""

# Push 여부 확인
read -p "원격 저장소에 푸시하시겠습니까? (y/N): " PUSH
if [ "$PUSH" = "y" ] || [ "$PUSH" = "Y" ]; then
    echo "푸시 중..."
    git push
    if [ $? -eq 0 ]; then
        echo "푸시가 완료되었습니다!"
    else
        echo "푸시 실패"
    fi
fi

