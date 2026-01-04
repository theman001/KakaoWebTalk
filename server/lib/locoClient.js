const tls = require('tls'); // 🔐 보안 연결을 위해 net 대신 tls 사용
const bson = require('bson');
const EventEmitter = require('events');

/**
 * KakaoTalk LOCO Protocol Client
 * - 22바이트 헤더 구조 및 BSON 본문 처리
 * - TLS 암호화 세션 지원
 */
class LocoClient extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.socket = null;
        this.packetId = 1;
        this.connected = false;
        this.buffer = Buffer.alloc(0); // 🧩 잘려서 오는 패킷 데이터를 모으기 위한 버퍼
    }

    async connect() {
        return new Promise((resolve, reject) => {
            // 카카오 체크인 서버 기본값 (VTC 서버 등)
            const host = this.config.host || '110.76.142.164';
            const port = this.config.port || 443;

            console.log(`[LOCO] Connecting to ${host}:${port} via TLS...`);

            // 카카오 서버는 443 포트에서 TLS 통신을 사용함
            this.socket = tls.connect(port, host, {
                rejectUnauthorized: false // 카카오 자체 인증서 허용
            }, () => {
                console.log(`[LOCO] Secure Connection Established.`);
                this.connected = true;
                resolve();
            });

            this.socket.on('data', (data) => this.handleRawData(data));
            this.socket.on('error', (err) => {
                console.error(`[LOCO] Socket Error: ${err.message}`);
                this.emit('error', err);
                reject(err);
            });
            this.socket.on('close', () => {
                this.connected = false;
                console.log(`[LOCO] Connection Closed.`);
                this.emit('close');
            });
        });
    }

    /**
     * 카카오 규격: 22바이트 헤더 + BSON 바디
     */
    sendPacket(method, body) {
        if (!this.connected || !this.socket) return;

        try {
            const bsonBody = bson.serialize(body);
            const header = Buffer.alloc(22);

            // 1. Packet ID (4 bytes, Little Endian)
            header.writeUInt32LE(this.packetId++, 0);
            // 2. Status (2 bytes, 0)
            header.writeUInt16LE(0, 4);
            // 3. Method (11 bytes, Null-padded ASCII)
            header.write(method.padEnd(11, '\0'), 6, 11, 'ascii');
            // 4. DataType (1 byte, 0 for BSON)
            header.writeInt8(0, 17);
            // 5. Body Length (4 bytes, Little Endian)
            header.writeUInt32LE(bsonBody.length, 18);

            const packet = Buffer.concat([header, bsonBody]);
            this.socket.write(packet);
            
            // console.log(`[LOCO] Sent: ${method} (ID: ${this.packetId - 1})`);
        } catch (err) {
            console.error(`[LOCO] Send Error: ${err.message}`);
        }
    }

    /**
     * TCP 스트림 특성상 패킷이 잘려올 수 있으므로 누적 버퍼 처리
     */
    handleRawData(data) {
        // 새로 받은 데이터를 기존 버퍼에 합침
        this.buffer = Buffer.concat([this.buffer, data]);

        while (this.buffer.length >= 22) {
            // 헤더에서 바디 길이를 읽음 (마지막 4바이트)
            const bodyLen = this.buffer.readUInt32LE(18);
            const totalLen = 22 + bodyLen;

            // 전체 패킷이 아직 다 오지 않았다면 다음 루프로 대기
            if (this.buffer.length < totalLen) break;

            // 패킷 추출
            const packet = this.buffer.slice(0, totalLen);
            this.buffer = this.buffer.slice(totalLen);

            // 데이터 해석
            const method = packet.toString('ascii', 6, 17).replace(/\0/g, '');
            const bodyBuffer = packet.slice(22);
            
            try {
                const body = bson.deserialize(bodyBuffer);
                this.emit('packet', method, body);
            } catch (e) {
                console.error(`[LOCO] BSON Decode Error: ${e.message}`);
            }
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.connected = false;
        }
    }
}

module.exports = LocoClient;
