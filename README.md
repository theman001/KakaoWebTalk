# KakaoWebTalk

## Web KakaoTalk Client (Ubuntu /webkakao)

이 프로젝트는 카카오톡 LOCO 프로토콜을 웹 브라우저에서 사용할 수 있도록 구현한 오픈소스 클라이언트입니다.

## 🚀 Quick Start

Ubuntu 환경의 최상위 루트(`/`)에서 다음 명령을 실행하십시오.

```bash
# 프로젝트 복제 (루트 경로 권한 필요)
sudo git clone https://github.com/your-repo/webkakao.git /webkakao
cd /webkakao

# 설정 스크립트 실행
sudo chmod +x setup_kakao.sh
sudo ./setup_kakao.sh
```

## 🛠 Features
- **Zero-Setup**: `setup_kakao.sh` 실행 시 Node.js 설치부터 서비스 등록까지 자동화
- **Persistence**: 시스템 재기동 시 `systemd`를 통해 서버 자동 실행
- **LOCO Core**: BSON 기반의 카카오톡 프로토콜 바이너리 통신 엔진 포함

## 📂 Project Structure
- `/server`: Node.js 기반 LOCO 클라이언트 및 WebSocket 브라우저 게이트웨이
- `/public`: 웹 브라우저 인터페이스
- `webkakao.service`: 리눅스 서비스 등록용 설정 파일

## ⚠️ Disclaimer
본 프로젝트는 교육 및 연구 목적으로 제작되었습니다.
