const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    encryptPassword(password) {
        try {
            // 1. KEY & IV 설정 (Java SecretKeySpec 방식 재현)
            const key = Buffer.alloc(32, 0);
            const keySource = Buffer.from(this.PW_ENC_KEY, 'utf8');
            keySource.copy(key, 0);

            const iv = Buffer.alloc(16, 0);
            keySource.copy(iv, 0, 0, 16);

            // 2. 수동 패딩 (PKCS5/7) - Java의 2블록 강제 생성을 위해 수동 계산
            const blockSize = 16;
            const data = Buffer.from(password, 'utf8');
            const paddingLength = blockSize - (data.length % blockSize);
            const padding = Buffer.alloc(paddingLength, paddingLength);
            const paddedData = Buffer.concat([data, padding]);

            // 3. AES-256-CBC 암호화 (자동 패딩 끔)
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            cipher.setAutoPadding(false); 
            
            let encrypted = cipher.update(paddedData);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // 데이터가 짧아 16바이트만 생성된 경우, 한 블록(16바이트)을 더 붙여서 32바이트(44자) 완성
            if (encrypted.length === 16) {
                const extraPadding = Buffer.alloc(16, 16);
                const extraCipher = crypto.createCipheriv('aes-256-cbc', key, iv);
                extraCipher.setAutoPadding(false);
                const extraEnc = extraCipher.update(extraPadding);
                encrypted = Buffer.concat([encrypted, extraEnc]);
            }

            const result = encrypted.toString('base64');
            console.log(`[CRYPTO_FIXED] ResultLen: ${result.length}, RawBytes: ${encrypted.length}`);
            
            return result;
        } catch (error) {
            console.error("[Crypto Error] Password Encryption:", error);
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

    // 이 부분이 누락되어 에러가 났었습니다!
    generateDeviceUuid(model) {
        const salt = "dkljleskljfeisflssljeif";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    }
};

module.exports = KakaoCrypto;
