const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// 모듈 로드
const initializeDatabase = require('./lib/dbInit');
const KakaoGateway = require('./lib/gateway');

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

// 2. 정적 파일 및 미들웨어 설정
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// 3. 기본 라우트 (테스트용)
app.get('/health', (req, res) => {
    res.send({ status: 'UP', timestamp: new Date() });
});

// 4. Socket.io 실시간 통신 설정
io.on('connection', (socket) => {
    console.log(`[Socket] 새 연결 발생: ${socket.id}`);

    socket.on('login', async (data) => {
        console.log(`[Socket] 로그인 시도: ${data.userId}`);
        // 로그인 및 카카오 게이트웨이 로직 연결 지점
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] 연결 종료: ${socket.id}`);
    });
});

// 5. 서버 실행 함수
async function startServer() {
    console.log("-----------------------------------------");
    console.log("웹 서버 시작 시도 중 (Port 80)...");

    // DB 초기화를 비동기로 실행 (웹 서버 구동을 방해하지 않음)
    initializeDatabase()
        .then(() => {
            console.log("[DB] Oracle Database 연결 및 테이블 확인 완료");
        })
        .catch(err => {
            console.error("[DB] 데이터베이스 연결 실패 (서버는 계속 구동됨):", err.message);
        });

    // HTTP 서버 리스닝
    try {
        http.listen(80, '0.0.0.0', () => {
            console.log(">>> KakaoWebTalk 서버가 가동되었습니다!");
            console.log(">>> 접속 주소: http://<여러분의-OCI-IP>");
            console.log("-----------------------------------------");
        });
    } catch (err) {
        console.error(">>> [에러] 포트 80을 열 수 없습니다:", err.message);
        console.log("힌트: sudo setcap 'cap_net_bind_service=+ep' $(which node) 실행 확인");
    }
}

// 서버 기동
startServer();
