const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// 모듈 로드
const initializeDatabase = require('./lib/dbInit');
const KakaoAuthModule = require('./lib/kakaoAuth');
let kakaoAuth; 

// 1. 설정 파일 로드 및 모듈 초기화
const configPath = path.resolve(__dirname, '../config.yaml');
let config = {};
try {
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    kakaoAuth = new KakaoAuthModule(config); 
    console.log("[설정] config.yaml 로드 완료");
} catch (e) {
    console.error("[에러] 설정 파일 로드 실패:", e.message);
    process.exit(1);
}

// 2. 미들웨어 및 정적 파일
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 3. 라우팅
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/login.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

// 4. Socket.io 설정
io.on('connection', (socket) => {
    console.log(`[Socket] 새 연결: ${socket.id}`);
    socket.on('login_request', async (data) => {
        try {
            // 수정된 kakaoAuth 호출 (인자 직접 전달)
            const authResult = await kakaoAuth.login(data.userId, data.userPw);
            socket.emit('login_response', authResult);
        } catch (err) {
            console.error("[CRITICAL ERROR]", err);
            socket.emit('login_response', { success: false, message: "서버 오류: " + err.message });
        }
    });
});

// 5. 서버 가동 로직 (순서 변경)
function startServer() {
    // A. 웹 서버를 먼저 실행 (DB 기다리지 않음)
    http.listen(80, '0.0.0.0', () => {
        console.log("-----------------------------------------");
        console.log(">>> KakaoWebTalk 서버 가동 (Port 80)");
        console.log("-----------------------------------------");
    });

    // B. DB 연결은 백그라운드에서 시도
    console.log("[DB] 연결 시도 중...");
    initializeDatabase()
        .then(() => console.log("[DB] Oracle Database 연결 성공"))
        .catch(err => {
            console.error("========== [DB 연결 실패] ==========");
            console.error("사유:", err.message);
            console.error("Wallet 비밀번호나 경로를 확인하세요.");
            console.error("===================================");
        });
}

startServer();
