#!/bin/bash

# 1. 변수 설정
PROJECT_DIR="/KakaoWebTalk"
SWAP_SIZE="2G"

echo ">>> KakaoWebTalk 설정을 시작합니다 (OCI Micro Instance 전용)"

# 2. Swap 메모리 설정 (1GB RAM 보완용 2GB Swap)
if [ ! -f /swapfile ]; then
    echo ">>> Swap 메모리 ${SWAP_SIZE}를 생성 중..."
    fallocate -l $SWAP_SIZE /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo ">>> Swap 설정 완료."
else
    echo ">>> 이미 Swap 파일이 존재합니다."
fi

# 3. 필수 패키지 및 Oracle Instant Client 의존성 설치
apt-get update
apt-get install -y curl nodejs npm build-essential libaio1 unzip

# 4. Node.js 최신 버전(LTS) 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 5. 프로젝트 디렉토리 이동 및 권한 설정
cd $PROJECT_DIR
chown -R $USER:$USER $PROJECT_DIR

# 6. Node.js 패키지 설치 (OracleDB, YAML 파서 포함)
cd $PROJECT_DIR/server
npm install bson net express socket.io js-yaml oracledb

# 7. Systemd 서비스 등록 (재부팅 시 자동 실행)
cat <<EOF > /etc/systemd/system/kakaoweb.service
[Unit]
Description=KakaoWebTalk Web Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/server
ExecStart=/usr/bin/node index.js
Restart=always
Environment=LD_LIBRARY_PATH=/usr/lib/oracle/current/client64/lib

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable kakaoweb.service

echo ">>> 모든 설치가 완료되었습니다. /KakaoWebTalk/config.yaml 설정 후"
echo ">>> 'sudo systemctl start kakaoweb' 명령으로 서버를 시작하세요."
