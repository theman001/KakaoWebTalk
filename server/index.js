const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// 1. 모듈 로드
const initializeDatabase = require('./lib/dbInit');
const KakaoGateway = require('./lib/gateway');

// 전역 변수 설정
let config = {};
let gateway;
let dbConn = null;

/**
 * 2. 설정 파일 로드
 */
const configPath = path.resolve(__dirname, '../config.yaml');
try {
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    console.log("[설정] config.yaml 로드 완료");
} catch (e) {
    console.error("[에러] 설정 파일 로드 실패:", e.message);
    process.exit(1);
}

// 3. 미들웨어 설정
app.use(express.json());

// [중요] 확장자(.html) 없이도 파일을 찾을 수 있도록 설정
app.use(express.static(path.join(__dirname, '../public'), {
    extensions: ['html'] 
}));

/**
 * 4. 라우팅 로직 (Clean URI & Redirect)
 */

// 루트(/) 접속 시 로그인 페이지로 강제 이동
app.get('/', (req, res) => {
    res.redirect('/login');
});

// /login 접속 시 login.html 서빙
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// /chat 접속 시 index.html 서빙
app.get('/chat', (req, res) => {
    // 실제 파일은 index.html이지만 브라우저 주소창에는 /chat으로 표시됨
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * 5. 서버 가동 로직 (순서 변경: HTTP 우선)
 */
async function startServer() {
    // A. 웹 서버 먼저 가동 (DB와 무관하게 즉시 오픈)
    const PORT = config.server.port || 80; // 설정에 80으로 되어있다면 80으로 뜹니다.
    http.listen(PORT, '0.0.0.0', () => {
        console.log("-----------------------------------------");
        console.log(`>>> KakaoWebTalk 웹 서비스 시작 (Port: ${PORT})`);
        console.log(`>>> 이제 브라우저에서 접속이 가능합니다.`);
        console.log("-----------------------------------------");
    });

    // B. 게이트웨이 초기화 (일단 DB 없이 생성)
    gateway = new KakaoGateway(http, null, config);
    console.log("[Gateway] 카카오 통신 모듈 대기 중...");

    // C. DB 연결 시도 (백그라운드 비동기)
    console.log("[DB] Oracle Database 백그라운드 연결 시도...");
    initializeDatabase()
        .then(db => {
            dbConn = db;
            // 연결 성공 시 게이트웨이에 DB 주입하여 기능 활성화
            gateway.updateDatabase(dbConn);
            console.log("✅ [DB] 연결 성공! 이제부터 로그가 기록됩니다.");
        })
        .catch(err => {
            console.error("⚠️ [DB] 연결 실패 (bad decrypt 등):", err.message);
            console.log("💡 [참고] DB 없이 실시간 채팅 모드로 작동합니다.");
        });
}

startServer();
