const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    encryptPassword(password) {
        try {
            // 1. KEY 생성: 32바이트(256비트)를 정확히 확보
            const key = Buffer.alloc(32, 0); // 0으로 가득 채운 32바이트 버퍼
            const keySource = Buffer.from(this.PW_ENC_KEY, 'utf8');
            keySource.copy(key, 0); // 22바이트 복사 (나머지 10바이트는 0x00)

            // 2. IV 생성: 키의 앞 16바이트
            const iv = Buffer.alloc(16, 0);
            keySource.copy(iv, 0, 0, 16);

            // 3. 암호화: 명시적으로 알고리즘 지정
            // Node.js v20에서는 'aes-256-cbc'가 엄격한 키 길이를 요구합니다.
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            
            // Java PKCS7Padding과 동일하게 설정
            cipher.setAutoPadding(true);
            
            let encrypted = cipher.update(password, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            const result = encrypted.toString('base64');
            
            // 디버깅: 이번엔 반드시 44가 나와야 함
            console.log(`[CRYPTO_FINAL_CHECK] ResultLen: ${result.length}, RawBytes: ${encrypted.length}`);
            
            return result;
        } catch (error) {
            console.error("[Crypto Error] Details:", error);
            return null;
        }
    },

    createUvc3(hwInfo) {
        try {
            const step1Base64 = talkHello.encrypt(JSON.stringify(hwInfo));
            const step1Buffer = Buffer.from(step1Base64, 'base64');

            const step2Key = Buffer.from([
                0xFE, 0xB0, 0x2E, 0x07, 0xFD, 0x74, 0x3A, 0x5C,
                0xE6, 0x78, 0x29, 0xC0, 0x65, 0x17, 0x33, 0x95
            ]);
            const step2Iv = Buffer.from([
                0x46, 0x56, 0x3A, 0xF1, 0xFC, 0xC3, 0xAD, 0x5A,
                0xE4, 0x9D, 0xAE, 0xB4, 0x13, 0x3D, 0xFB, 0x0B
            ]);

            const cipher = crypto.createCipheriv('aes-128-cbc', step2Key, step2Iv);
            let encrypted = cipher.update(step1Buffer);
            encrypted = Buffer.concat([encrypted, cipher.final()]);

            return encrypted.toString('base64');
        } catch (error) {
            console.error("[Crypto Error] UVC3:", error);
            return null;
        }
    },

    generateDeviceUuid(model) {
        const salt = "dkljleskljfeisflssljeif";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    }
};

module.exports = KakaoCrypto;
