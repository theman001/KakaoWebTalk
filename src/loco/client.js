const net = require('net');
const EventEmitter = require('events');
const LocoPacket = require('./packet');
const locoCrypto = require('./crypto');

class LocoClient extends EventEmitter {
  constructor() {
    super();
    this.socket = new net.Socket();
    this.packetId = 0;
    this.isConnected = false;
    this.buffer = Buffer.alloc(0); // 쪼개져서 오는 패킷을 모으기 위한 버퍼
  }

  connect(host, port) {
    return new Promise((resolve, reject) => {
      this.socket.connect(port, host, () => {
        this.isConnected = true;
        console.log(`[Loco] Connected to ${host}:${port}`);
        resolve();
      });

      this.socket.on('data', (data) => this.onData(data));
      this.socket.on('error', (err) => {
        console.error('[Loco] Socket Error:', err);
        this.isConnected = false;
        reject(err);
      });
      this.socket.on('close', () => {
        console.log('[Loco] Connection closed');
        this.isConnected = false;
      });
    });
  }

  send(method, body) {
    if (!this.isConnected) return;
    // 1. 바디 암호화 (AES)
    const encryptedBody = locoCrypto.encrypt(body);
    // 2. 패킷 생성 (22바이트 헤더 포함)
    const packet = LocoPacket.create(this.packetId++, method, encryptedBody);
    // 3. 전송
    this.socket.write(packet);
    console.log(`[Loco] Sent Method: ${method}`);
  }

  onData(data) {
    // 수신된 데이터를 기존 버퍼에 추가
    this.buffer = Buffer.concat([this.buffer, data]);
    
    // 헤더(22바이트)를 읽을 수 있을 만큼 쌓였는지 확인
    while (this.buffer.length >= 22) {
      const bodyLength = this.buffer.readUInt32LE(18);
      
      // 전체 패킷(헤더+바디)이 다 왔는지 확인
      if (this.buffer.length < 22 + bodyLength) break;

      // 한 개의 완전한 패킷 추출
      const packetBuffer = this.buffer.slice(0, 22 + bodyLength);
      this.buffer = this.buffer.slice(22 + bodyLength);

      const parsed = LocoPacket.parse(packetBuffer);
      if (parsed) {
        // 바디 복호화 (AES)
        try {
          const decryptedBody = locoCrypto.decrypt(parsed.body);
          // 서버 응답 이벤트 발생 (예: 'LOGINLIST', 'MSG' 등)
          this.emit(parsed.header.method, decryptedBody);
        } catch (e) {
          console.error('[Loco] Decryption/Parsing error:', e);
        }
      }
    }
  }
}

module.exports = new LocoClient();
