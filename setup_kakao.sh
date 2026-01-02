#!/bin/bash

# 1. 필수 패키지 및 yq(YAML 파서) 설치
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl build-essential libaio1 ufw jq
sudo wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && sudo chmod +x /usr/bin/yq

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

# 4. 방화벽 계층화 설정 (iptables 기본 차단 후 UFW 관리)
sudo iptables -F
sudo iptables -X
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# UFW 정책 적용
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow $(yq '.PORT' config.yaml)/tcp
sudo ufw --force enable

# 5. 프로젝트 초기화 및 .env 생성
npm install
cat <<EOF > .env
PORT=$(yq '.PORT' config.yaml)
DB_USER=$(yq '.DB_USER' config.yaml)
DB_PASSWORD=$(yq '.DB_PASSWORD' config.yaml)
DB_CONNECTION_STRING='$(yq '.DB_CONNECTION_STRING' config.yaml)'
KAKAO_DEVICE_UUID=$(yq '.KAKAO_DEVICE_UUID' config.yaml)
KAKAO_ACCESS_TOKEN=$(yq '.KAKAO_ACCESS_TOKEN' config.yaml)
EOF

# 6. PM2 설치
sudo npm install -g pm2

echo "------------------------------------------------"
echo "Setup Complete! .env file generated from config.yaml"
echo "Firewall: iptables(DROP) + UFW(Active)"
echo "------------------------------------------------"
