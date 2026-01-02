const bson = require('bson');

class LocoPacket {
  /**
   * Loco 패킷을 생성합니다.
   * @param {number} packetId - 패킷 고유 ID
   * @param {string} method - 메소드 이름 (최대 11자)
   * @param {object} body - BSON으로 인코딩할 데이터 객체
   */
  static create(packetId, method, body) {
    // 1. 바디 데이터를 BSON으로 직렬화
    const bsonBody = bson.serialize(body);
    const bodyLength = bsonBody.length;

    // 2. 22바이트 크기의 헤더 버퍼 생성
    const header = Buffer.alloc(22);

    // 3. 헤더 데이터 기록
    header.writeUInt32LE(packetId, 0);       // Packet ID (4 bytes)
    header.writeUInt16LE(0, 4);              // Status (2 bytes, 기본 0)
    
    // Method Name (11 bytes, 남는 공간은 0으로 채움)
    const methodBuffer = Buffer.alloc(11, 0);
    methodBuffer.write(method, 0);
    methodBuffer.copy(header, 6);

    header.writeUInt8(0, 17);                // Data Type (1 byte, 0 for BSON)
    header.writeUInt32LE(bodyLength, 18);    // Body Length (4 bytes)

    // 4. 헤더와 바디를 합쳐서 반환
    return Buffer.concat([header, bsonBody]);
  }

  /**
   * 서버로부터 받은 바이너리 데이터를 파싱합니다.
   * @param {Buffer} buffer - 서버에서 수신한 전체 데이터
   */
  static parse(buffer) {
    if (buffer.length < 22) return null;

    const packetId = buffer.readUInt32LE(0);
    const status = buffer.readUInt16LE(4);
    const method = buffer.toString('utf8', 6, 17).replace(/\0/g, '');
    const bodyLength = buffer.readUInt32LE(18);

    const bodyBuffer = buffer.slice(22, 22 + bodyLength);
    const body = bson.deserialize(bodyBuffer);

    return {
      header: { packetId, status, method, bodyLength },
      body
    };
  }
}

module.exports = LocoPacket;

