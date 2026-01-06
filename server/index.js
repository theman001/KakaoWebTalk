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

// 쿠키 파서 미들웨어 (간단 구현)
app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie;
    req.cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            req.cookies[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }
    next();
});

// [중요] 세션 검증 미들웨어
// 정적 파일(.js, .css, .png 등)과 /login, /socket.io는 제외하고 검증
const sessionMiddleware = (req, res, next) => {
    // 1. 허용된 경로(Whitelist)
    const whitelist = ['/login', '/favicon.ico'];
    if (whitelist.includes(req.path) ||
        req.path.startsWith('/socket.io') ||
        req.path.startsWith('/css') ||
        req.path.startsWith('/js') ||
        req.path.startsWith('/images')) {
        return next();
    }

    // 2. 세션 확인 (kakao_session 쿠키)
    // 실제 검증은 Gateway/DB에서 하지만, 여기서는 존재 여부로 1차 필터링
    const sessionId = req.cookies['kakao_session'];
    if (!sessionId) {
        console.log(`[접근 차단] 세션 없음 (${req.path}) -> 로그인 페이지로 리다이렉트`);
        return res.redirect('/login');
    }

    // 3. 통과
    next();
};

app.use(sessionMiddleware);

// [중요] 확장자(.html) 없이도 파일을 찾을 수 있도록 설정
app.use(express.static(path.join(__dirname, '../public'), {
    extensions: ['html']
}));

/**
 * 4. 라우팅 로직 (Clean URI & Redirect)
 */

// 루트(/) 접속 시 로그인 페이지로 강제 이동 (세션 여부 무관)
// 요구사항: "인증 세션 없이 ... / 로 접근한다면 ... /login 으로 리다이렉트"
// 요구사항: "인증 세션 없이 ... 접근하려고 하면 모두 ... /login 으로 리다이렉트"
// 세션이 있어도 루트는 대개 /chat으로 가거나 /login으로 감.
// 일단 미들웨어가 '없으면' 검사하므로, 여기 도달했다는 건 세션이 '있거나' whitelist인 경우.
// 하지만 whitelist에 /는 없으므로, 세션 없으면 이미 미들웨어에서 걸러짐.
app.get('/', (req, res) => {
    // 세션이 있다면 채팅방으로 (편의성)
    if (req.cookies['kakao_session']) {
        return res.redirect('/chat');
    }
    res.redirect('/login');
});

// /login 접속
app.get('/login', (req, res) => {
    // 이미 로그인 된 상태라면 /chat으로 이동
    if (req.cookies['kakao_session']) {
        return res.redirect('/chat');
    }
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// /chat 접속
app.get('/chat', (req, res) => {
    // 미들웨어에서 세션 검사 통과했으므로 서빙
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
        console.log(`>>> 도메인: http://talk.taeuk.o-r.kr/`);
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
