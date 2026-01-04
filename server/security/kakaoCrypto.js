const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    encryptPassword(password) {
        try {
            const keyString = this.PW_ENC_KEY;
            
            // 1. IV 생성: 키의 첫 16바이트
            const iv = Buffer.from(keyString.substring(0, 16), 'utf8');
            
            // 2. KEY 생성: 32바이트 배열 (NULL 패딩)
            const keyBuffer = Buffer.alloc(32, 0);
            const keyData = Buffer.from(keyString, 'utf8');
            keyData.copy(keyBuffer, 0);
            
            // 3. 암호화 객체 생성 (자동 패딩 활성화)
            const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
            cipher.setAutoPadding(true); 
            
            // 4. 암호화 수행: 반드시 Buffer 단위로 처리하여 합치기
            const part1 = cipher.update(password, 'utf8'); // 'utf8' 입력, Buffer 반환
            const part2 = cipher.final();                  // 남은 패딩 블록 Buffer 반환
            
            const encrypted = Buffer.concat([part1, part2]);
            
            // 5. 최종 결과 확인 및 Base64 변환
            const result = encrypted.toString('base64');
            
            // 이 로그에서 RawBytes가 32가 찍혀야 합니다.
            console.log(`[CRYPTO_STRICT] RawBytes: ${encrypted.length}, ResultLen: ${result.length}`);
            
            return result;
        } catch (error) {
            console.error("Password Encryption Error:", error);
            return null;
        }
    },

    // createUvc3 및 generateDeviceUuid는 이전과 동일
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
    },

    generateDeviceUuid(model) {
        const salt = "dkljleskljfeisflssljeif";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    }
};

module.exports = KakaoCrypto;
