const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        this.config = config;
        // 버전을 실제 존재하는 안정화 버전으로 변경 시도
        this.appVersion = "11.0.5"; 
        this.pwdKeySeed = "jEibeliJAhlEeyoOnjuNg";
        this.userAgent = `KT/${this.appVersion} An/13 ko`; // Android 13 정도로 설정
        this.androidId = config.androidId || 'default_device_id';
        this.deviceUuid = this.generateDeviceUuid(this.androidId);
    }

    generateDeviceUuid(androidId) {
        const salt = "dkljleskljfeisflssljeif ";
        return crypto.createHash('sha1').update(salt + androidId).digest('hex');
    }

    encryptPassword(plainPassword) {
        if (!plainPassword) throw new Error('비밀번호가 입력되지 않았습니다.');
        const iv = Buffer.from(this.pwdKeySeed.substring(0, 16), 'utf8');
        const key = Buffer.alloc(32, 0);
        Buffer.from(this.pwdKeySeed, 'utf8').copy(key, 0, 0, 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        return cipher.update(String(plainPassword), 'utf8', 'base64') + cipher.final('base64');
    }

    async login(email, password) {
        try {
            const payload = {
                'email': email,
                'password': this.encryptPassword(password),
                'device_uuid': this.deviceUuid,
                'device_name': 'android', // 모델명 대신 단순화
                'model_name': 'SM-S908N',
                'permanent': 'true',
                'forced': 'false'
                // 'uvc3'를 아예 전송하지 않음 (Legacy 호환성 테스트)
            };
    
            const params = new URLSearchParams(payload);
            const headers = {
                'A': `android/${this.appVersion}/ko`,
                // 'C' 헤더(UUID)를 제거하거나 형식을 바꿈 (필요 시)
                'User-Agent': `KakaoTalk ${this.appVersion} An/13 ko`, // UA 형식 변경
                'Accept-Language': 'ko',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': 'auth.kakao.com'
            };

            console.log("[Request Headers]:", headers);
            console.log("[Request Payload]:", payload);

            const response = await axios.post('https://auth.kakao.com/android/account/login.json', params.toString(), {
                headers: headers
            });

            console.log("[Kakao Success]:", response.data);
            return { success: response.data.status === 0, session: response.data, message: response.data.message };

        } catch (error) {
            // [서버 로그 강화]
            console.error("========== [KAKAO API ERROR] ==========");
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", JSON.stringify(error.response.data, null, 2));
            } else {
                console.error("Message:", error.message);
            }
            console.error("=======================================");

            const msg = error.response ? (error.response.data.message || "올바르지 않은 접근") : error.message;
            return { success: false, message: msg };
        }
    }
}

module.exports = KakaoAuth;
