const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// 1. 모듈 로드
const initializeDatabase = require('./lib/dbInit');
const KakaoGateway = require('./lib/gateway'); // 🚀 핵심 게이트웨이 추가

// 전역 변수 설정
let config = {};
let gateway;

/**
 * 2. 설정 파일 로드 및 초기화
 */
const configPath = path.resolve(__dirname, '../config.yaml');
try {
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    console.log("[설정] config.yaml 로드 완료");
} catch (e) {
    console.error("[에러] 설정 파일 로드 실패:", e.message);
    process.exit(1);
}

// 3. 미들웨어 및 정적 파일 설정
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 4. 라우팅
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/login.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

/**
 * 5. 서버 통합 가동 로직
 */
async function startServer() {
    try {
        // A. DB 초기화 (테이블 생성 등)
        // 게이트웨이가 실행되기 전에 DB 연결 객체가 필요하므로 먼저 수행합니다.
        console.log("[DB] Oracle Database 연결 시도 중...");
        const db = await initializeDatabase(); 
        
        // B. Kakao Gateway 초기화 (Socket.io 및 LOCO 관리 통합)
        // 앞서 수정한 gateway.js가 이 안에서 KakaoAuth, SessionManager를 모두 관리합니다.
        gateway = new KakaoGateway(http, db, config);
        console.log("[Gateway] 카카오 통신 게이트웨이 준비 완료");

        // C. 웹 서버 가동
        const PORT = config.server.port || 80;
        http.listen(PORT, '0.0.0.0', () => {
            console.log("-----------------------------------------");
            console.log(`>>> KakaoWebTalk 서버가 시작되었습니다.`);
            console.log(`>>> 접속 주소: http://your-ip:${PORT}`);
            console.log("-----------------------------------------");
        });

    } catch (err) {
        console.error("========== [서버 가동 실패] ==========");
        console.error("사유:", err.message);
        console.error("시스템 로그를 확인하거나 설정을 다시 점검하세요.");
        console.log("-----------------------------------------");
        process.exit(1);
    }
}

startServer();
