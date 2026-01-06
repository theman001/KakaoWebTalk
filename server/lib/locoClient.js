const tls = require('tls'); // 🔐 보안 연결을 위해 net 대신 tls 사용
const bson = require('bson');
const EventEmitter = require('events');
const KakaoCrypto = require('../security/kakaoCrypto');
const PacketStructs = require('./packet_structs');

/**
 * KakaoTalk LOCO Protocol Client
 * - 22바이트 헤더 구조 및 BSON 본문 처리
 * - TLS 암호화 세션 지원
 * - Client Authentication (UVC3) Support
 */
class LocoClient extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.socket = null;
        this.packetId = 1;
        this.connected = false;
        this.buffer = Buffer.alloc(0); // 🧩 잘려서 오는 패킷 데이터를 모으기 위한 버퍼

        // 디바이스 정보 (Mock)
        this.deviceInfo = {
            model: this.config.model || "SM-G991N",
            mccmnc: this.config.mccmnc || "45005",
            osVersion: this.config.osVersion || "12",
            countryIso: this.config.countryIso || "KR",
            appVer: this.config.appVer || "11.3.0"
        };
    }

    async connect() {
        return new Promise((resolve, reject) => {
            // 카카오 체크인 서버 (티켓 서버)
            const host = this.config.host || '110.76.142.164';
            const port = this.config.port || 443;

            console.log(`[LOCO] Connecting to ${host}:${port} via TLS...`);

            this.socket = tls.connect(port, host, {
                rejectUnauthorized: false // 카카오 자체 인증서 허용
            }, async () => {
                console.log(`[LOCO] Secure Connection Established.`);
                this.connected = true;

                try {
                    // 연결 즉시 CHECKIN 시도
                    await this.sendCheckin();
                    resolve();
                } catch (e) {
                    reject(e);
                }
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
     * Send CHECKIN Packet
     * Registers the client and retrieves the chat server list.
     * Uses UVC3 token for client integrity.
     */
    async sendCheckin() {
        console.log('[LOCO] Generating UVC3 Token...');

        // 1. 하드웨어 정보 수집 (Mock)
        // 실제 앱 분석 결과에 맞춘 포맷
        const hwInfo = {
            "model": this.deviceInfo.model,
            "os": "android",
            "lang": "ko",
            "country": this.deviceInfo.countryIso,
            "mccmnc": this.deviceInfo.mccmnc
        };

        // 2. UVC3 토큰 생성 (Native Mock + AES-128)
        const uvc3 = KakaoCrypto.createUvc3(hwInfo);

        if (!uvc3) {
            throw new Error("Failed to generate UVC3 token (Native Mock failed)");
        }

        console.log(`[LOCO] UVC3 Token Generated: ${uvc3.substring(0, 20)}...`);

        // 3. CHECKIN 패킷 본문 구성
        const checkinBody = {
            "userId": 0, // 0 for checkin
            "os": "android",
            "netType": 0, // WIFI
            "appVer": this.deviceInfo.appVer,
            "mccmnc": this.deviceInfo.mccmnc,
            "lang": "ko",
            "countryIso": this.deviceInfo.countryIso,
            "uvc3": uvc3
        };

        this.sendPacket("CHECKIN", checkinBody);
    }

    /**
     * 카카오 규격: 22바이트 헤더 + BSON 바디
     */
    sendPacket(method, body) {
        if (!this.connected || !this.socket) {
            console.error('[LOCO] Cannot send packet: Not connected');
            return;
        }

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

            console.log(`[LOCO] Sent: ${method} (ID: ${this.packetId - 1})`);
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
