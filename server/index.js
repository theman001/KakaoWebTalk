const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// 모듈 로드
const initializeDatabase = require('./lib/dbInit');
const KakaoAuth = require('./lib/kakaoAuth');

// 1. 설정 파일 로드
const configPath = path.resolve(__dirname, '../config.yaml');
let config = {};
try {
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    console.log("[설정] config.yaml 로드 완료");
} catch (e) {
    console.error("[에러] config.yaml을 읽을 수 없습니다:", e.message);
    process.exit(1);
}

// 2. 미들웨어 설정
app.use(express.json());

// 3. 라우팅 설정 (Clean URL 구현)
// 정적 파일 제공(express.static)보다 위에 두어야 / 접속 시 리다이렉트가 우선 작동합니다.
app.get('/', (req, res) => {
    console.log("[Route] Root 접속 -> /login 리다이렉트");
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
    res.send({ status: 'UP', timestamp: new Date() });
});

// 4. 정적 파일 제공 (CSS, JS, Images 등)
app.use(express.static(path.join(__dirname, '../public')));

// 5. Socket.io 실시간 통신 설정 (통합)
io.on('connection', (socket) => {
    console.log(`[Socket] 새 연결: ${socket.id}`);

    // 로그인 요청 처리
    socket.on('login_request', async (data) => {
        console.log(`[Auth] 로그인 시도 계정: ${data.userId}`);
        try {
            // 카카오 인증 모듈 호출
            const authResult = await KakaoAuth.login(data.userId, data.userPw);

            if (authResult.success) {
                socket.emit('login_response', {
                    success: true,
                    message: "카카오 로그인 성공",
                    session: authResult.session 
                });
            } else {
                socket.emit('login_response', {
                    success: false,
                    message: authResult.message || "인증 정보가 올바르지 않습니다."
                });
            }
        } catch (err) {
            console.error("[Auth] 로그인 처리 중 서버 에러:", err.message);
            socket.emit('login_response', {
                success: false,
                message: "카카오 서버와 통신 중 에러가 발생했습니다."
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] 연결 종료: ${socket.id}`);
    });
});

// 6. 서버 실행 함수
async function startServer() {
    console.log("-----------------------------------------");
    
    // DB 초기화 (Non-blocking)
    initializeDatabase()
        .then(() => console.log("[DB] Oracle Database 연결 성공"))
        .catch(err => console.error("[DB] 연결 실패:", err.message));

    try {
        http.listen(80, '0.0.0.0', () => {
            console.log(">>> KakaoWebTalk 서버가 80번 포트에서 가동되었습니다!");
            console.log("-----------------------------------------");
        });
    } catch (err) {
        console.error(">>> [에러] 서버 가동 실패:", err.message);
    }
}

startServer();
