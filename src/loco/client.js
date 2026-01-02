const net = require('net');
const LocoPacket = require('./packet');

class LocoClient {
  constructor() {
    this.socket = new net.Socket();
    this.packetId = 0;
    this.isConnected = false;
  }

  /**
   * 카카오 Loco 서버에 연결을 시도합니다.
   * @param {string} host - 서버 주소
   * @param {number} port - 포트 번호
   */
  connect(host, port) {
    return new Promise((resolve, reject) => {
      this.socket.connect(port, host, () => {
        this.isConnected = true;
        console.log(`[LocoClient] Connected to ${host}:${port}`);
        resolve();
      });

      this.socket.on('data', (data) => {
        this.onData(data);
      });

      this.socket.on('error', (err) => {
        console.error('[LocoClient] Socket Error:', err);
        this.isConnected = false;
        reject(err);
      });

      this.socket.on('close', () => {
        console.log('[LocoClient] Connection Closed');
        this.isConnected = false;
      });
    });
  }

  /**
   * 서버로 명령(Method)을 전송합니다.
   * @param {string} method - Loco 메소드 (예: 'LOGINLIST', 'WRITE')
   * @param {object} body - 전송할 BSON 데이터
   */
  send(method, body) {
    if (!this.isConnected) {
      console.error('[LocoClient] Not connected to server');
      return;
    }

    const packet = LocoPacket.create(this.packetId++, method, body);
    this.socket.write(packet);
    console.log(`[LocoClient] Sent: ${method} (ID: ${this.packetId - 1})`);
  }

  /**
   * 서버로부터 데이터를 수신했을 때 호출됩니다.
   * @param {Buffer} data - 수신된 바이너리 데이터
   */
  onData(data) {
    // 주의: 데이터가 한 번에 오지 않거나 여러 패킷이 섞여 올 수 있으므로 
    // 실제 구현 시에는 버퍼링 로직이 필요합니다.
    const parsed = LocoPacket.parse(data);
    if (parsed) {
      console.log(`[LocoClient] Received: ${parsed.header.method}`, parsed.body);
      this.handlePacket(parsed);
    }
  }

  /**
   * 수신된 패킷의 종류에 따라 로직을 분기합니다.
   */
  handlePacket(packet) {
    const { method } = packet.header;
    
    switch (method) {
      case 'MSG':
        console.log('[LocoClient] New Message received:', packet.body.chatMsg.msg);
        // 여기서 EventEmitter나 Callback을 통해 외부(server.js)로 알림을 보낼 수 있습니다.
        break;
      case 'PING':
        // 서버의 생존 확인 응답에 대한 처리
        break;
      default:
        // 기타 응답 처리
    }
  }

  /**
   * 연결을 종료합니다.
   */
  destroy() {
    this.socket.destroy();
    this.isConnected = false;
  }
}

module.exports = new LocoClient();
