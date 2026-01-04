const crypto = require('crypto');
const axios = require('axios');

/**
 * KakaoTalk Authentication Module (De-obfuscated Version)
 * 분석 대상 버전: Android 25.11.2
 */
class KakaoAuth {
    constructor(config = {}) {
        // 공통 설정 주입
        this.config = config;
        this.appVersion = "25.11.2";
        this.pwdKeySeed = "jEibeliJAhlEeyoOnjuNg";
        this.userAgent = `KT/${this.appVersion} An/14 ko`;
        
        // androidId가 없으면 고정값이라도 생성하여 일관성 유지
        this.androidId = config.androidId || 'default_android_device_id';
        this.deviceUuid = this.generateDeviceUuid(this.androidId);
    }

    /**
     * Device UUID 생성 (Hardware.kt 분석 로직)
     * SHA1("dkljleskljfeisflssljeif " + android_id)
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
        if (!plainPassword) {
            throw new Error('암호화할 비밀번호가 없습니다.');
        }

        // IV: 키의 앞 16자리
        const iv = Buffer.from(this.pwdKeySeed.substring(0, 16), 'utf8');
        
        // Key: 32바이트 패딩 (AES-256)
        const key = Buffer.alloc(32, 0);
        const seedBuffer = Buffer.from(this.pwdKeySeed, 'utf8');
        seedBuffer.copy(key, 0, 0, Math.min(seedBuffer.length, 32));

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(String(plainPassword), 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        return encrypted;
    }

    /**
     * 공통 헤더 생성 (MoimHeaderInterceptor 분석 반영)
     */
    getHeaders() {
        return {
            'A': `android/${this.appVersion}/ko`,
            'C': crypto.randomUUID(),
            'User-Agent': this.userAgent,
            'Accept-Language': 'ko',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'auth.kakao.com'
        };
    }

    /**
     * 로그인 실행
     * @param {string} email 사용자 이메일
     * @param {string} password 사용자 비밀번호 (평문)
     */
    async login(email, password) {
        if (!email || !password) {
            return { success: false, message: "이메일 또는 비밀번호가 누락되었습니다." };
        }

        const endpoint = 'https://auth.kakao.com/android/account/login.json';
        
        // 분석된 필수 Body 필드 구성
        const payload = {
            'email': email,
            'password': this.encryptPassword(password),
            'device_uuid': this.deviceUuid,
            'device_name': this.config.deviceName || 'SM-S908N',
            'model_name': this.config.modelName || 'SM-S908N',
            'permanent': 'true',
            'forced': 'false',
            'uvc3': '' // Native 영역 결과값이 없으므로 빈값 전송
        };

        const params = new URLSearchParams();
        for (const key in payload) {
            params.append(key, payload[key]);
        }

        try {
            console.log(`[Attempt] Login for: ${email}`);
            
            const response = await axios.post(endpoint, params.toString(), {
                headers: this.getHeaders()
            });

            // 카카오 응답 처리 (서버마다 응답 구조가 다를 수 있음)
            if (response.status === 200 && response.data.status === 0) {
                return {
                    success: true,
                    session: response.data,
                    message: "성공"
                };
            } else {
                return {
                    success: false,
                    message: response.data.message || "카카오 로그인 실패 (응답 코드 확인 필요)"
                };
            }
        } catch (error) {
            let errorMsg = error.message;
            if (error.response && error.response.data) {
                console.error(`[Kakao Response Error]:`, error.response.data);
                errorMsg = error.response.data.message || error.message;
            }
            return { success: false, message: errorMsg };
        }
    }
}

module.exports = KakaoAuth;
