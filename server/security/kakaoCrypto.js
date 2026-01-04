const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    /**
     * Password 암호화 (C70496a.m283826b() 구현)
     * 
     * ⚠️ 참고: 실제 카카오톡 APK 코드 (SubDeviceLoginParams.m194994D)에서는 
     * m283825a (복호화 메서드)를 사용하지만, 논리적으로는 암호화가 필요하므로 
     * m283826b (암호화 메서드) 구현을 사용합니다.
     * 
     * 실제 로그인 테스트를 통해 검증이 필요합니다.
     */
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
        // ✅ 수정: 실제 카카오톡 APK 코드 (C66516V.m270999f)와 일치하도록 끝에 공백 추가
        const salt = "dkljleskljfeisflssljeif ";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    },

    /**
     * UVC3 복호화 (디버깅/검증용)
     * 생성된 UVC3를 복호화하여 원본 hwInfo와 일치하는지 확인
     * 
     * @param {string} uvc3Base64 - Base64 인코딩된 UVC3 값
     * @returns {Object|null} - 복호화된 hwInfo JSON 객체, 실패 시 null
     */
    decryptUvc3(uvc3Base64) {
        try {
            // Step 1: Base64 디코딩
            const step1Buffer = Buffer.from(uvc3Base64, 'base64');
            
            // Step 2: AES-128-CBC 복호화 (AbuseDetectUtil.m213055g의 역과정)
            const step2Key = Buffer.from([0xFE, 0xB0, 0x2E, 0x07, 0xFD, 0x74, 0x3A, 0x5C, 0xE6, 0x78, 0x29, 0xC0, 0x65, 0x17, 0x33, 0x95]);
            const step2Iv = Buffer.from([0x46, 0x56, 0x3A, 0xF1, 0xFC, 0xC3, 0xAD, 0x5A, 0xE4, 0x9D, 0xAE, 0xB4, 0x13, 0x3D, 0xFB, 0x0B]);
            const decipher2 = crypto.createDecipheriv('aes-128-cbc', step2Key, step2Iv);
            decipher2.setAutoPadding(true);
            let decrypted2 = decipher2.update(step1Buffer);
            decrypted2 = Buffer.concat([decrypted2, decipher2.final()]);
            
            // Step 3: TalkHello 복호화 (AES-256-CBC)
            const talkHelloKey = Buffer.from('3add51cf49f15ac4204b0e3a4315542bd317b436ed44dd2a47c65ba922ea39c0', 'hex');
            const talkHelloIv = Buffer.from('df2f3c57286470abb46ca0c59ae4aa0a', 'hex');
            const decipher1 = crypto.createDecipheriv('aes-256-cbc', talkHelloKey, talkHelloIv);
            decipher1.setAutoPadding(true);
            let decrypted1 = decipher1.update(decrypted2);
            decrypted1 = Buffer.concat([decrypted1, decipher1.final()]);
            
            // Step 4: JSON 파싱
            const jsonString = decrypted1.toString('utf8');
            const hwInfo = JSON.parse(jsonString);
            
            return hwInfo;
        } catch (error) {
            console.error("[UVC3 Decryption Error]:", error.message);
            return null;
        }
    }
};

module.exports = KakaoCrypto;
