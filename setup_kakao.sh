#!/bin/bash

# 1. 시스템 업데이트 및 필수 패키지 설치
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl build-essential libaio1 ufw

# 2. Node.js (LTS v20) 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Swap 메모리 설정 (1GB RAM 보완용 2GB)
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
fi

# 4. 방화벽 계층화 설정 (iptables 기반 구축 후 ufw 제어)

# 4-1. iptables 초기화 및 기본 DROP 정책 (가장 바깥쪽 방어선)
sudo iptables -F
sudo iptables -X
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# 4-2. 루프백 및 이미 연결된 세션(ESTABLISHED)은 iptables 수준에서 즉시 허용
# (이게 없으면 ufw 설정 중에 SSH 접속이 끊길 수 있음)
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 4-3. UFW 정책 설정 (실질적인 관리 레이어)
# 기본 정책 설정
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 필수 서비스 포트 허용
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Node.js App 포트

# 4-4. UFW 활성화 (iptables 상단에 ufw 체인이 자동으로 주입됨)
sudo ufw --force enable

# 5. PM2 및 환경 설정
sudo npm install -g pm2

echo "------------------------------------------------"
echo "Setup Complete!"
echo "Firewall: iptables (Default DROP) + UFW (Active)"
echo "Node.js: $(node -v)"
echo "------------------------------------------------"
