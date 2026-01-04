const crypto = require('crypto');
const talkHello = require('./talkHello');

/**
 * 카카오톡 암호화 유틸리티 (커서AI 분석 반영 최종본)
 * status: -404 에러 해결을 위한 AES-256-CBC 정밀 구현
 */
const KakaoCrypto = {
    // C70496a 클래스 전용 키
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    /**
     * Password 암호화 (AES-256-CBC)
     * 32바이트 NULL 패딩 키 + 16바이트 IV 적용
     */
    encryptPassword(password) {
        try {
            // 1. IV 생성: 키의 첫 16바이트 (UTF-8)
            const iv = Buffer.from(this.PW_ENC_KEY.substring(0, 16), 'utf8');

            // 2. KEY 생성: 32바이트 배열 생성 후 키 복사 (NULL 패딩 자동 적용)
            const keyBuffer = Buffer.alloc(32, 0); 
            const keyData = Buffer.from(this.PW_ENC_KEY, 'utf8');
            keyData.copy(keyBuffer, 0);

            // 3. 암호화 수행 (PKCS7 패딩 포함)
            const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
            cipher.setAutoPadding(true);
            
            let encrypted = cipher.update(password, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            return encrypted;
        } catch (error) {
            console.error("[Crypto Error] Password Encryption Failed:", error);
            return null;
        }
    },

    /**
     * UVC3 생성 (2단계 중첩 암호화)
     * Step 1: TalkHello (AES-256)
     * Step 2: AbuseDetect (AES-128)
     */
    createUvc3(hwInfo) {
        try {
            // Step 1: TalkHello Native 암호화
            const step1Base64 = talkHello.encrypt(JSON.stringify(hwInfo));
            const step1Buffer = Buffer.from(step1Base64, 'base64');

            // Step 2: AES-128-CBC 재암호화 (부호 없는 바이트 보정)
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
            console.error("[Crypto Error] UVC3 Creation Failed:", error);
            return null;
        }
    },

    generateDeviceUuid(model) {
        // 분석 결과에 따른 SHA-1 해시 생성
        const salt = "dkljleskljfeisflssljeif";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    }
};

module.exports = KakaoCrypto;
