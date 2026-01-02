require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const db = require('./db');
const locoClient = require('./loco/client');
const chatModel = require('./models/chatModel');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

// [동기화 이벤트 리스너]
// 1. 로그인 및 채팅방 목록 수신 시
locoClient.on('LOGINLIST', async (body) => {
  console.log('[Sync] Received LOGINLIST. Syncing with OCI DB...');
  const rooms = body.chatDatas || [];
  
  try {
    // OCI DB 업데이트 (Upsert)
    await chatModel.upsertRooms(rooms);
    // 접속 중인 모든 웹 클라이언트에 목록 갱신 알림
    io.emit('sync_rooms_complete', rooms);
  } catch (err) {
    console.error('[Sync] DB Update failed:', err);
  }
});

// 2. 새로운 메시지 수신 시
locoClient.on('MSG', async (body) => {
  const chatMsg = body.chatMsg;
  const roomId = chatMsg.chatId.toString();
  const sender = chatMsg.authorNickname || 'Unknown';
  const message = chatMsg.msg;

  console.log(`[Loco] New Message - Room: ${roomId}, Sender: ${sender}`);

  try {
    // DB에 누적 저장
    await chatModel.saveMessage(roomId, sender, message);
    // 웹 클라이언트에 실시간 전달
    io.emit('new_message', { roomId, sender, message });
  } catch (err) {
    console.error('[Log] Message save failed:', err);
  }
});

// [서버 부트스트랩]
async function bootstrap() {
  try {
    // 1. OCI DB 초기화
    await db.initializeDB();
    
    // 2. 카카오 서버 접속 (Host/Port는 환경변수에서 로드)
    await locoClient.connect(process.env.LOCO_HOST, process.env.LOCO_PORT);

    // 3. 동기화 시작 (LOGINLIST 전송)
    locoClient.send('LOGINLIST', {
      appVer: "3.4.5",
      prtVer: "1.0",
      os: "win32",
      lang: "ko",
      deviceGuid: process.env.KAKAO_DEVICE_UUID,
      accessToken: process.env.KAKAO_ACCESS_TOKEN,
      chatIds: [], // 전체 목록 요청
      lastTokenId: 0
    });

  } catch (err) {
    console.error('[Server] Fatal Error during bootstrap:', err);
    process.exit(1);
  }
}

io.on('connection', (socket) => {
  console.log(`[Web] Browser connected: ${socket.id}`);
  
  socket.on('chat_send', (data) => {
    // 웹에서 보낸 메시지를 카카오로 전달
    locoClient.send('WRITE', {
      chatId: data.roomId,
      msg: data.message,
      type: 1
    });
  });
});

server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  bootstrap();
});
