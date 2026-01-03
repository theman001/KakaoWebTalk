const net = require('net');
const bson = require('bson');
const EventEmitter = require('events');

class LocoClient extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.socket = new net.Socket();
        this.packetId = 1;
        this.connected = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            // 카카오 체크인 서버에서 받은 IP/Port가 없으면 기본값(예시) 사용
            const host = this.config.host || '110.76.142.164'; 
            const port = this.config.port || 443;

            this.socket.connect(port, host, () => {
                console.log(`[LOCO] Connected to ${host}:${port}`);
                this.connected = true;
                resolve();
            });

            this.socket.on('data', (data) => this.handleRawData(data));
            this.socket.on('error', (err) => this.emit('error', err));
            this.socket.on('close', () => {
                this.connected = false;
                this.emit('close');
            });
        });
    }

    // 카카오 규격에 맞는 22바이트 헤더 + BSON 패킷 생성
    sendPacket(method, body) {
        if (!this.connected) return;

        const bsonBody = bson.serialize(body);
        const header = Buffer.alloc(22);

        header.writeUInt32LE(this.packetId++, 0); // Packet ID
        header.writeUInt16LE(0, 4);              // Status (0)
        header.write(method.padEnd(11, '\0'), 6, 11, 'ascii'); // Method (11 bytes)
        header.writeInt8(0, 17);                 // DataType (0 for BSON)
        header.writeUInt32LE(bsonBody.length, 18); // Body Length

        const packet = Buffer.concat([header, bsonBody]);
        this.socket.write(packet);
    }

    handleRawData(data) {
        let offset = 0;
        while (offset + 22 <= data.length) {
            const bodyLen = data.readUInt32LE(offset + 18);
            if (offset + 22 + bodyLen > data.length) break;

            const method = data.toString('ascii', offset + 6, offset + 17).replace(/\0/g, '');
            const bodyBuffer = data.slice(offset + 22, offset + 22 + bodyLen);
            const body = bson.deserialize(bodyBuffer);

            this.emit('packet', method, body);
            offset += 22 + bodyLen;
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
