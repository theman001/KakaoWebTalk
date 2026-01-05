const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    /**
     * Password 암호화 (C33858a.b() 구현 - 논리적으로 올바른 암호화 메서드)
     * 
     * ⚠️ 중요: 실제 카카오톡 APK 코드 (SubDeviceLoginParams.m194994D)에서는 
     * C33858a.a() (복호화 메서드)를 사용하지만, 이는 논리적으로 말이 안 됩니다.
     * 
     * 분석 결과 (app/src/main/java/kZ/C33858a.java):
     * - .a() 메서드: cipher.init(2, ...) → DECRYPT_MODE (복호화)
     *   - 입력: Base64URL 디코딩된 바이트 배열
     *   - 출력: 복호화된 평문 문자열
     * - .b() 메서드: cipher.init(1, ...) → ENCRYPT_MODE (암호화)
     *   - 입력: 평문 문자열
     *   - 출력: Base64URL 인코딩된 암호문
     * 
     * 현재 구현은 논리적으로 올바른 .b() (암호화 메서드)를 사용합니다.
     * APK 코드는 Nr0.c.d() (Base64URL 인코딩)를 사용하므로, Base64URL 변환을 추가했습니다.
     * 
     * @param {string} password - 평문 비밀번호
     * @returns {string|null} - Base64URL 인코딩된 암호문, 실패 시 null
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
            
            // 5. Base64 인코딩
            const base64 = encrypted.toString('base64');
            
            // 6. ✅ Base64URL 변환 (APK 코드의 Nr0.c.d()와 동일)
            // Base64URL: + → -, / → _, 패딩 = 제거
            const base64url = base64
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            // 디버깅 로그
            console.log(`[CRYPTO_STRICT] RawBytes: ${encrypted.length}, Base64Len: ${base64.length}, Base64URLLen: ${base64url.length}`);
            
            return base64url;
        } catch (error) {
            console.error("Password Encryption Error:", error);
            return null;
        }
    },

    /**
     * Password 암호화 (대안: 실제 APK 코드 따라하기)
     * 
     * ⚠️ 실험적 구현: 실제 APK가 C33858a.a() (복호화 메서드)를 사용하는 것을 따라한 버전
     * 이는 논리적으로 말이 안 되지만, 실제 APK 코드이므로 테스트용으로 제공합니다.
     * 
     * 분석 결과 (app/src/main/java/kZ/C33858a.java:52-58):
     * - .a() 메서드는 복호화 모드 (DECRYPT_MODE)를 사용합니다.
     * - 입력: new Nr0.c(str).c() → Base64URL 디코딩된 바이트 배열
     * - 출력: 복호화된 평문 문자열
     * 
     * 이 메서드는 논리적으로 실패할 것으로 예상되지만, 실제 APK 동작을 시뮬레이션합니다.
     * 
     * @param {string} password - 평문 비밀번호
     * @returns {string|null} - Base64URL 인코딩된 결과, 실패 시 null
     */
    encryptPasswordAlternative(password) {
        try {
            // ⚠️ 실험적 구현: APK 코드의 C33858a.a() 메서드 시뮬레이션
            // 
            // APK 코드 분석:
            // - SubDeviceLoginParams.m194994D(): new C33858a("jEibeliJAhlEeyoOnjuNg").a(this.password)
            // - C33858a.a(): 복호화 모드 (DECRYPT_MODE)
            //   - 입력: new Nr0.c(str).c() → Base64URL 디코딩된 바이트 배열
            //   - 출력: 복호화된 평문 문자열
            //
            // 이것은 논리적으로 말이 안 되지만, 실제 APK 코드이므로 테스트합니다.
            // 가능한 해석: 평문 비밀번호가 이미 특정 형식으로 인코딩되어 있을 수 있음
            
            const keyString = this.PW_ENC_KEY;
            const iv = Buffer.from(keyString.substring(0, 16), 'utf8');
            const keyBuffer = Buffer.alloc(32, 0);
            const keyData = Buffer.from(keyString, 'utf8');
            keyData.copy(keyBuffer, 0);
            
            // 복호화 모드로 설정 (실제 APK 코드와 동일: cipher.init(2, ...))
            const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
            decipher.setAutoPadding(true);
            
            // 평문을 Base64URL로 인코딩 (Nr0.c.d()와 유사)
            // APK 코드: new Nr0.c(str).c() → Base64URL 디코딩
            // 여기서 str은 this.password (평문)이므로, 평문을 Base64URL로 인코딩한 후
            // 다시 Base64URL로 디코딩하는 것이 아니라, 평문을 그대로 Base64URL로 인코딩
            const base64Password = Buffer.from(password, 'utf8').toString('base64');
            const base64urlPassword = base64Password
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            // Base64URL 디코딩 (Nr0.c.c()와 유사 - APK 코드의 입력 처리)
            const base64Decoded = base64urlPassword
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            const padding = (4 - (base64Decoded.length % 4)) % 4;
            const base64Padded = base64Decoded + '='.repeat(padding);
            const decodedBuffer = Buffer.from(base64Padded, 'base64');
            
            // 복호화 시도 (논리적으로 실패할 가능성이 높음)
            let decrypted = decipher.update(decodedBuffer);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            // 결과를 Base64URL로 인코딩하여 반환
            // APK 코드는 평문 문자열을 반환하지만, 우리는 암호화된 값이 필요하므로
            // 복호화 결과를 다시 Base64URL로 인코딩
            const result = decrypted.toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            console.log(`[CRYPTO_ALTERNATIVE] RawBytes: ${decodedBuffer.length}, DecryptedBytes: ${decrypted.length}, ResultLen: ${result.length}`);
            
            return result;
        } catch (error) {
            // 예상대로 실패할 수 있음
            console.error("Password Encryption Alternative Error:", error.message);
            console.error("[INFO] This is expected if decrypt mode cannot process plaintext password");
            return null;
        }
    },

    /**
     * UVC3 생성 (2단계 암호화)
     * 
     * Step 1: TalkHello (AES-256-CBC) 암호화
     * Step 2: AES-128-CBC 재암호화
     * 
     * @param {Object} hwInfo - 하드웨어 정보 객체
     * @returns {string|null} - Base64 인코딩된 UVC3 값, 실패 시 null
     */
    createUvc3(hwInfo) {
        try {
            // Step 1: TalkHello Native 암호화
            const step1Base64 = talkHello.encrypt(JSON.stringify(hwInfo));
            
            // Step 2: Java Layer 재암호화 (AES-128-CBC)
            const step2Key = Buffer.from([0xFE, 0xB0, 0x2E, 0x07, 0xFD, 0x74, 0x3A, 0x5C, 0xE6, 0x78, 0x29, 0xC0, 0x65, 0x17, 0x33, 0x95]);
            const step2Iv = Buffer.from([0x46, 0x56, 0x3A, 0xF1, 0xFC, 0xC3, 0xAD, 0x5A, 0xE4, 0x9D, 0xAE, 0xB4, 0x13, 0x3D, 0xFB, 0x0B]);
            const cipher = crypto.createCipheriv('aes-128-cbc', step2Key, step2Iv);
            cipher.setAutoPadding(true);
            
            let encrypted = cipher.update(Buffer.from(step1Base64, 'base64'));
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            return encrypted.toString('base64');
        } catch (e) {
            console.error("[UVC3 Creation Error]:", e.message);
            return null;
        }
    },

    /**
     * Device UUID 생성
     * 
     * 실제 카카오톡 APK 코드 (C66516V.m270999f)와 일치하도록 구현
     * Salt 끝에 공백이 포함되어 있음
     * 
     * @param {string} model - 기기 모델명
     * @returns {string} - SHA-1 해시값 (40자 hex 문자열)
     */
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
