#!/bin/bash

PROJECT_DIR="/KakaoWebTalk"
USER_NAME=$(logname)

echo ">>> KakaoWebTalk 업데이트를 시작합니다..."

# 1. 프로젝트 디렉토리 이동
cd $PROJECT_DIR

# 2. Git 변경 사항 가져오기
echo ">>> 최신 소스 코드를 가져오는 중..."
git fetch --all
git reset --hard origin/main # 로컬 변경사항을 덮어쓰고 원격 기준 정렬 (main 브랜치 기준)

# 3. 소유권 재설정 (업데이트된 파일 대응)
chown -R $USER_NAME:$USER_NAME $PROJECT_DIR

# 4. 의존성 패키지 업데이트 (package.json 변경 대비)
echo ">>> NPM 의존성 확인 및 설치..."
cd $PROJECT_DIR/server
npm install

# 5. 서비스 재구동
echo ">>> 서비스를 재시작합니다..."
sudo systemctl restart kakaoweb.service

# 6. 상태 확인
sleep 2
SERVICE_STATUS=$(systemctl is-active kakaoweb.service)

if [ "$SERVICE_STATUS" = "active" ]; then
    echo ">>> 업데이트 및 서비스 재구동 성공! (상태: $SERVICE_STATUS)"
else
    echo ">>> !!! 서비스 재구동에 문제가 발생했습니다. 'journalctl -u kakaoweb'를 확인하세요."
    exit 1
fi
