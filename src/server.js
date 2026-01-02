require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// 프로젝트 내부 모듈 로드
const db = require('./db');
const locoClient = require('./loco/client');
const chatModel = require('./models/chatModel');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 포트 설정 (config.yaml에서 전달된 값)
const PORT = process.env.PORT || 3000;

// 정적 파일 제공 (웹 UI)
app.use(express.static(path.join(__dirname, '../public')));

// 1. 서버 시작 시 DB 및 카카오 클라이언트 초기화
async function bootstrap() {
  try {
    // OCI DB 연결 테스트
    await db.initializeDB();
    console.log('[Server] OCI Database initialized.');

    // 카카오 서버 연결 (예시: 특정 호스트와 포트로 연결)
    // 실제로는 booking/checkin 과정을 거쳐 동적으로 할당받은 주소를 사용해야 함
    // await locoClient.connect('loco-address.kakao.com', 443);
    console.log('[Server] Loco Client ready (Standby for connection).');

  } catch (err) {
    console.error('[Server] Bootstrap failed:', err);
    process.exit(1);
  }
}

// 2. 웹 클라이언트(브라우저)와의 Socket.io 연결 처리
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // 브라우저에서 메시지 전송 요청이 왔을 때
  socket.on('chat_message', async (data) => {
    const { roomId, message } = data;
    
    // A. 카카오 서버로 메시지 전송
    locoClient.send('WRITE', {
      chatId: roomId,
      msg: message,
      type: 1 // 일반 텍스트
    });

    // B. OCI DB에 전송 로그 비동기 저장
    try {
      await chatModel.saveMessage(roomId, 'ME', message);
    } catch (err) {
      console.error('[DB] Failed to save log:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

// 3. 카카오로부터 받은 메시지를 브라우저로 실시간 전달
// (LocoClient 내부에 이벤트를 바인딩하거나 콜백 처리 로직 필요)
// 예시: locoClient.onMessage = (msgData) => io.emit('new_message', msgData);

server.listen(PORT, () => {
  console.log(`[Server] Web Client is running at http://localhost:${PORT}`);
  bootstrap();
});
