const axios = require('axios');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.client = axios.create({
            timeout: 10000,
            headers: {
                'KA': 'sdk/1.0.0 os/android/13 lang/ko_KR res/1080x2277 device/SM-S908N origin/unknown',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'Content-Type': 'application/json; charset=UTF-8'
            }
        });
    }

    /**
     * 1단계: CheckIn 시도
     * @returns {Promise<Object>} 서버로부터 할당받은 Host 정보
     */
    async checkIn() {
        const checkInUrl = "https://status.kakao.com/checkin/.json"; // 예시 경로 (실제 경로는 분석 필요)
        const payload = {
            appVersion: "10.4.5",
            os: "android",
            deviceUuid: this.config.kakao.deviceUuid
        };

        console.log("[Auth] 1단계: CheckIn 시도 중...");
        const response = await this.client.post(checkInUrl, payload);
        return response.data; // host, port 등이 포함된 객체
    }

    async login(email, password) {
        try {
            // 실제 로직에서는 여기서 checkIn()을 먼저 호출하여 host를 받아와야 함
            const targetHost = "https://auth.kakao.com"; 

            const payload = {
                email: email,
                password: password,
                device: {
                    uuid: this.config.kakao.deviceUuid,
                    os: "android",
                    appVersion: "10.4.5",
                    mccmnc: "45005"
                }
            };

            console.log(`[Auth] 2단계: 로그인 시도 중 (${targetHost})...`);
            const response = await this.client.post(`${targetHost}/v1/internal/talk_login`, payload);
            
            console.log("----- [서버 응답 데이터] -----");
            console.log(JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error) {
            console.error("Login Error:", error.response?.data || error.message);
        }
    }
}
