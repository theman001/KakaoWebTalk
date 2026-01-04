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
    const fileContent = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(fileContent);
    // 생성자에 config 객체 전달
    kakaoAuth = new KakaoAuthModule(config); 
    console.log("[설정] config.yaml 로드 및 KakaoAuth 모듈 초기화 완료");
} catch (e) {
    console.error("[에러] 설정 파일 로드 실패:", e.message);
    process.exit(1);
}

// 2. 미들웨어 설정
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 3. 라우팅 설정
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/login.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/health', (req, res) => res.send({ status: 'UP', timestamp: new Date() }));

// 4. Socket.io 설정
io.on('connection', (socket) => {
    console.log(`[Socket] 새 연결: ${socket.id}`);

    socket.on('login_request', async (data) => {
        try {
            // data.userId와 data.userPw가 클라이언트(login.html)에서 보낸 값인지 확인 필요
            console.log(`[로그인 요청] User: ${data.userId}`);
            
            // 수정된 login 메서드 호출 방식 (이메일, 비밀번호 직접 전달)
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
                    message: authResult.message || "로그인 정보를 확인하세요."
                });
            }
        } catch (err) {
            console.error("========== [CRITICAL ERROR] ==========");
            console.error(err); 
            console.error("=====================================");
        
            socket.emit('login_response', {
                success: false,
                message: "서버 오류: " + err.message
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] 연결 종료: ${socket.id}`);
    });
});

// 5. 서버 실행
async function startServer() {
    try {
        await initializeDatabase();
        console.log("[DB] Oracle Database 연결 성공");
    } catch (err) {
        console.error("[DB] 연결 실패:", err.message);
    }

    http.listen(80, '0.0.0.0', () => {
        console.log("-----------------------------------------");
        console.log(">>> KakaoWebTalk 서버 가동 (Port 80)");
        console.log("-----------------------------------------");
    });
}

startServer();
