#!/bin/bash

PROJECT_DIR="/KakaoWebTalk"
USER_NAME=$(logname)

echo ">>> KakaoWebTalk 업데이트 및 패키지 재설정을 시작합니다..."

# 1. 프로젝트 디렉토리 이동
cd $PROJECT_DIR

# 2. Git 변경 사항 가져오기
echo ">>> 최신 소스 코드를 가져오는 중..."
git fetch --all
git reset --hard origin/main


# 3. package.json 강제 초기화 및 패키지 재설치 (추가된 로직)
echo ">>> package.json 초기화 및 필수 모듈 재설치 중..."
cd $PROJECT_DIR/server
sudo rm -f package.json package-lock.json

# npm init -y 실행 (비어있는 github package.json 무시)
npm init -y

# 필수 종속성 설치
npm install bson net express socket.io js-yaml oracledb axios

# 4. 소유권 재설정
chown -R $USER_NAME:$USER_NAME $PROJECT_DIR

# 5. 서비스 재구동
echo ">>> 서비스를 재시작합니다..."
sudo systemctl restart kakaoweb.service

# 6. 상태 확인
sleep 2
SERVICE_STATUS=$(systemctl is-active kakaoweb.service)

if [ "$SERVICE_STATUS" = "active" ]; then
    echo ">>> 업데이트 및 서비스 재구동 성공! (상태: $SERVICE_STATUS)"
else
    echo ">>> !!! 서비스 재구동 실패. 'journalctl -u kakaoweb'를 확인하세요."
    exit 1
fi


sudo chmod 777 ./update.sh
