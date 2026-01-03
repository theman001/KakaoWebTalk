#!/bin/bash

# 1. 필수 패키지 및 런타임 설치 (Node.js)
echo "Installing Node.js and dependencies..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs build-essential

# 2. 프로젝트 디렉토리 권한 설정
cd /webkakao
chown -R $USER:$USER /webkakao

# 3. Node.js 패키지 설치
echo "Installing NPM packages..."
cd /webkakao/server
npm install bson net socket.io express

# 4. Systemd 서비스 등록 (재부팅 시 자동 실행)
echo "Registering systemd service..."
cat <<EOF > /etc/systemd/system/webkakao.service
[Unit]
Description=Web KakaoTalk Client Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/webkakao/server
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 5. 서비스 활성화 및 시작
systemctl daemon-reload
systemctl enable webkakao.service
systemctl start webkakao.service

echo "Web KakaoTalk setup complete! Server is running."
