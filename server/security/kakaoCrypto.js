const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    encryptPassword(password) {
        try {
            const key = Buffer.alloc(32, 0);
            const keySource = Buffer.from(this.PW_ENC_KEY, 'utf8');
            keySource.copy(key, 0);

            const iv = Buffer.alloc(16, 0);
            keySource.copy(iv, 0, 0, 16);

            // 1. 수동 패딩 (PKCS5/7)
            const blockSize = 16;
            const data = Buffer.from(password, 'utf8');
            const paddingLength = blockSize - (data.length % blockSize);
            const padding = Buffer.alloc(paddingLength, paddingLength);
            const paddedData = Buffer.concat([data, padding]);

            // 2. AES-256-CBC 암호화 (자동 패딩 끔)
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            cipher.setAutoPadding(false); // 중요: 자동 패딩 비활성화
            
            let encrypted = cipher.update(paddedData);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // 만약 결과가 여전히 16바이트라면, 강제로 한 블록 더 암호화
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
            console.error("[Crypto Error]:", error);
            return null;
        }
    },
    
    // createUvc3 및 기타 함수는 동일하게 유지
    createUvc3(hwInfo) {
        try {
            const step1Base64 = talkHello.encrypt(JSON.stringify(hwInfo));
            const step2Key = Buffer.from([0xFE, 0xB0, 0x2E, 0x07, 0xFD, 0x74, 0x3A, 0x5C, 0xE6, 0x78, 0x29, 0xC0, 0x65, 0x17, 0x33, 0x95]);
            const step2Iv = Buffer.from([0x46, 0x56, 0x3A, 0xF1, 0xFC, 0xC3, 0xAD, 0x5A, 0xE4, 0x9D, 0xAE, 0xB4, 0x13, 0x3D, 0xFB, 0x0B]);
            const cipher = crypto.createCipheriv('aes-128-cbc', step2Key, step2Iv);
            let encrypted = cipher.update(Buffer.from(step1Base64, 'base64'));
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            return encrypted.toString('base64');
        } catch (e) { return null; }
    }
};

module.exports = KakaoCrypto;
