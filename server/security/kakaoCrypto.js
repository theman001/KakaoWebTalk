const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    // 분석 2순위: 패스워드 전용 키 (C70496a)
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    /**
     * 패스워드 암호화 (AES-256-CBC / PKCS7)
     * 분석 결과: KEY는 32바이트 전체, IV는 앞 16바이트 사용
     */
    encryptPassword(password) {
        // 1. KEY(32B)와 IV(16B) 생성
        const key = Buffer.alloc(32, 0);
        Buffer.from(this.PW_ENC_KEY).copy(key); // jEibeli... 값을 32바이트 버퍼에 복사
        
        const iv = Buffer.alloc(16, 0);
        Buffer.from(this.PW_ENC_KEY.substring(0, 16)).copy(iv);

        // 2. 암호화 수행
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        cipher.setAutoPadding(true);
        
        let encrypted = cipher.update(password, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },

    /**
     * 분석 1순위: uvc3 (2단계 암호화 시스템)
     */
    createUvc3(hwInfo) {
        // Step 1: TalkHello 네이티브 암호화 (AES-256-CBC)
        const step1Base64 = talkHello.encrypt(JSON.stringify(hwInfo));
        const step1Buffer = Buffer.from(step1Base64, 'base64');

        // Step 2: Java Layer 재암호화 (AES-128-CBC / PKCS5)
        // 분석 리포트의 Signed Byte 배열을 Unsigned로 변환하여 적용
        const step2Key = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
        const step2Iv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);

        const cipher = crypto.createCipheriv('aes-128-cbc', step2Key, step2Iv);
        let encrypted = cipher.update(step1Buffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return encrypted.toString('base64');
    },

    generateDeviceUuid(model) {
        const salt = "dkljleskljfeisflssljeif";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    }
};

module.exports = KakaoCrypto;
