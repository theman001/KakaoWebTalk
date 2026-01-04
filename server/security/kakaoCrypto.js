const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    encryptPassword(password) {
        try {
            // 1. IV 생성: 키의 첫 16바이트 (UTF-8)
            const iv = Buffer.from(this.PW_ENC_KEY.substring(0, 16), 'utf8');

            // 2. KEY 생성: 32바이트(AES-256) 배열에 키 복사 (나머지는 NULL 패딩)
            const keyBuffer = Buffer.alloc(32, 0);
            const keyData = Buffer.from(this.PW_ENC_KEY, 'utf8');
            keyData.copy(keyBuffer, 0);

            // 3. AES-256-CBC 암호화 설정 (자동 패딩 활성)
            const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
            cipher.setAutoPadding(true);
            
            // 4. 암호화 수행 (바이너리 Buffer로 처리)
            // 출력 인코딩을 지정하지 않아야 Buffer가 반환됩니다.
            let encrypted = cipher.update(password, 'utf8'); 
            encrypted = Buffer.concat([encrypted, cipher.final()]); 
            
            // 5. 마지막에 한 번만 Base64 인코딩
            const result = encrypted.toString('base64');
            
            // 예상 결과: RawBytes가 32여야 44자 결과가 나옵니다.
            console.log(`[CRYPTO_FIXED] RawBytes: ${encrypted.length}, ResultLen: ${result.length}`); 
            
            return result;
        } catch (error) {
            console.error("Password Encryption Error:", error);
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
            console.error("[Crypto Error] UVC3 Creation:", error);
            return null;
        }
    },

    generateDeviceUuid(model) {
        const salt = "dkljleskljfeisflssljeif";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    }
};

module.exports = KakaoCrypto;
