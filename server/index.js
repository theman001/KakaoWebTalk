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
let kakaoAuth; // 인스턴스 저장용 변수

// 1. 설정 파일 로드 및 모듈 초기화
const configPath = path.resolve(__dirname, '../config.yaml');
let config = {};
try {
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    // 인스턴스를 여기서 생성하여 config를 주입합니다.
    kakaoAuth = new KakaoAuthModule(config); 
    console.log("[설정] config.yaml 로드 및 KakaoAuth 모듈 초기화 완료");
} catch (e) {
    console.error("[에러] 설정 파일 로드 실패:", e.message);
    process.exit(1);
}

// 2. 미들웨어 설정
app.use(express.json());

// 3. 라우팅 설정
app.get('/', (req, res) => {
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

// 4. 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 5. Socket.io 설정
io.on('connection', (socket) => {
    console.log(`[Socket] 새 연결: ${socket.id}`);

    socket.on('login_request', async (data) => {
        try {
            // 초기화된 kakaoAuth 인스턴스 사용
            const authResult = await kakaoAuth.login(data.userId, data.userPw);

            if (authResult.success) {
                socket.emit('login_response', {
                    success: true,
                    message: "카카오 로그인 성공",
                    session: authResult.session
                });
            } else {
                socket.emit('login_response', {
                    success: false,
                    message: authResult.message
                });
            }
        } catch (err) {
            // 터미널에 에러의 전체 스택을 출력합니다.
            console.error("========== [CRITICAL ERROR] ==========");
            console.error(err); // 에러 객체 전체 출력 (Stack Trace 포함)
            console.error("=====================================");
        
            socket.emit('login_response', {
                success: false,
                message: "서버 내부 에러: " + err.message
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] 연결 종료: ${socket.id}`);
    });
});

// 6. 서버 실행
async function startServer() {
    initializeDatabase()
        .then(() => console.log("[DB] Oracle Database 연결 성공"))
        .catch(err => console.error("[DB] 연결 실패:", err.message));

    http.listen(80, '0.0.0.0', () => {
        console.log("-----------------------------------------");
        console.log(">>> KakaoWebTalk 서버 가동 (Port 80)");
        console.log("-----------------------------------------");
    });
}

startServer();
