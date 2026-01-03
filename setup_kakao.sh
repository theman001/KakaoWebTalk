#!/bin/bash

# 1. 변수 설정
PROJECT_DIR="/KakaoWebTalk"
SWAP_SIZE="2G"
USER_NAME=$(logname) # sudo 실행 시 실제 사용자 계정 추출

echo ">>> KakaoWebTalk 설정을 시작합니다 (Ubuntu 24.04 OCI 전용)"

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
    echo ">>> [Skip] 이미 Swap 파일이 존재합니다."
fi

# 3. 필수 패키지 설치 (Ubuntu 24.04 대응)
echo ">>> 필수 시스템 패키지 설치 중..."
apt-get update
# Ubuntu 24.04에서는 libaio1 대신 libaio1t64를 사용합니다.
apt-get install -y curl build-essential libaio1t64 unzip wget iptables-persistent ufw

# 4. Node.js LTS 설치 확인 및 설치
if ! command -v node &> /dev/null; then
    echo ">>> Node.js 설치 중..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo ">>> [Skip] Node.js가 이미 설치되어 있습니다. ($(node -v))"
fi

# 5. 프로젝트 디렉토리 준비 및 권한 설정
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p "$PROJECT_DIR/server"
fi
chown -R $USER_NAME:$USER_NAME $PROJECT_DIR

# 6. Node.js 패키지 설치 (이미 설치된 경우 생략)
cd $PROJECT_DIR/server
if [ ! -d "node_modules" ]; then
    echo ">>> NPM 패키지 설치 중..."
    # package.json이 없는 경우를 대비해 직접 설치
    npm init -y
    npm install bson net express socket.io js-yaml oracledb axios
else
    echo ">>> [Skip] Node modules가 이미 존재합니다."
fi

# 7. 방화벽 설정 (iptables 초기화 -> ufw 설정 -> 하단 All Deny)
echo ">>> 방화벽 설정 중 (UFW + iptables)..."

# iptables 기존 정책 초기화
iptables -F
iptables -X

# UFW 기본 설정 (UFW는 iptables의 상단 체인을 관리함)
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH 허용
ufw allow 80/tcp   # HTTP 허용
ufw allow 443/tcp  # HTTPS 허용
ufw --force enable

# iptables 하단에 나머지 모든 접속 거부 정책 추가 (UFW 규칙 이후 적용되도록 INPUT 체인 마지막에 추가)
# 이미 규칙이 있는지 확인 후 추가
if ! iptables -C INPUT -j DROP 2>/dev/null; then
    iptables -A INPUT -j DROP
fi

# iptables 정책 저장 (재부팅 후 유지)
netfilter-persistent save

# 8. Systemd 서비스 등록
if [ ! -f /etc/systemd/system/kakaoweb.service ]; then
    echo ">>> Systemd 서비스 등록 중..."
    cat <<EOF > /etc/systemd/system/kakaoweb.service
[Unit]
Description=KakaoWebTalk Web Server
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$PROJECT_DIR/server
ExecStart=/usr/bin/node index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable kakaoweb.service
else
    echo ">>> [Skip] 서비스가 이미 등록되어 있습니다."
fi

echo ">>> 모든 설정이 완료되었습니다."
echo ">>> /KakaoWebTalk/config.yaml에 OCI DB 정보를 입력하세요."
echo ">>> 실행: sudo systemctl start kakaoweb"
