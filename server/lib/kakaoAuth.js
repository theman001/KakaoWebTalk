const crypto = require('crypto');
const axios = require('axios');

/**
 * KakaoTalk Authentication Module (De-obfuscated Version)
 * 분석 대상 버전: Android 25.11.2
 */
class KakaoAuth {
    constructor(email, password, androidId) {
        this.email = email;
        this.password = password;
        this.androidId = androidId;
        
        // 1. 기기 식별자 설정 (C66516V.m270999f 분석 반영)
        this.deviceUuid = this.generateDeviceUuid(androidId);
        
        // 2. 암호화 설정 (C70496a 분석 반영)
        this.pwdKeySeed = "jEibeliJAhlEeyoOnjuNg";
        this.appVersion = "25.11.2";
        this.userAgent = `KT/${this.appVersion} An/14 ko`; // MoimHeaderInterceptor 분석 반영
    }

    /**
     * Device UUID 생성 (Hardware.kt 분석 로직)
     * 로직: SHA1("dkljleskljfeisflssljeif " + android_id)
     */
    generateDeviceUuid(androidId) {
        const salt = "dkljleskljfeisflssljeif ";
        return crypto.createHash('sha1')
            .update(salt + androidId)
            .digest('hex');
    }

    /**
     * 비밀번호 AES-256-CBC 암호화 (C70496a.m283826b 분석 로직)
     */
    encryptPassword(plainPassword) {
        // IV: 키의 앞 16자리
        const iv = Buffer.from(this.pwdKeySeed.substring(0, 16), 'utf8');
        
        // Key: 32바이트 패딩 (AES-256)
        const key = Buffer.alloc(32, 0);
        const seedBuffer = Buffer.from(this.pwdKeySeed, 'utf8');
        seedBuffer.copy(key, 0, 0, Math.min(seedBuffer.length, 32));

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(plainPassword, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        return encrypted;
    }

    /**
     * 공통 헤더 생성 (MoimHeaderInterceptor 분석 반영)
     */
    getHeaders() {
        return {
            'A': `android/${this.appVersion}/ko`,
            'C': crypto.randomUUID(), // 매 요청마다 새로운 UUID
            'User-Agent': this.userAgent,
            'Accept-Language': 'ko',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'auth.kakao.com'
        };
    }

    /**
     * 로그인 실행
     */
    async login() {
        const endpoint = 'https://auth.kakao.com/android/account/login.json';
        
        // 분석된 필수 Body 필드 구성
        const payload = {
            'email': this.email,
            'password': this.encryptPassword(this.password),
            'device_uuid': this.deviceUuid,
            'device_name': 'SM-S908N', // Build.MODEL 예시
            'model_name': 'SM-S908N',
            'permanent': 'true',
            'forced': 'false',
            // UVC3는 Native 영역(TalkHello)이므로 일단 null 전송 후 서버 반응 확인
            'uvc3': '' 
        };

        // URLSearchParams 형태로 변환 (application/x-www-form-urlencoded)
        const params = new URLSearchParams();
        for (const key in payload) {
            params.append(key, payload[key]);
        }

        try {
            console.log(`[Attempt] Login for: ${this.email}`);
            console.log(`[Device UUID]: ${this.deviceUuid}`);

            const response = await axios.post(endpoint, params.toString(), {
                headers: this.getHeaders()
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                console.error(`[Login Failed] Status: ${error.response.status}`);
                console.error(`[Error Data]:`, error.response.data);
            } else {
                console.error(`[Network Error]: ${error.message}`);
            }
            throw error;
        }
    }
}

module.exports = KakaoAuth;
