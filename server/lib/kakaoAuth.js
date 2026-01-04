const axios = require('axios');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.client = axios.create({
            headers: {
                'KA': 'sdk/1.0.0 os/android/13 lang/ko_KR res/1080x2277 device/SM-S908N origin/unknown',
                'Content-Type': 'application/json; charset=UTF-8',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'Host': 'auth.kakao.com'
            },
            timeout: 10000
        });
    }

    /**
     * 핵심: login 전에 호출되어야 하는 CheckIn 시뮬레이션
     */
    async login(email, password) {
        try {
            const uuid = this.config.kakao?.deviceUuid || "553120ac9dcbb762";

            // 1단계: 실제로는 여기서 /v1/internal/checkin 같은 곳을 먼저 찔러야 함
            // 현재는 login 시도 시 데이터 규격을 최대한 Xp.U0(Request)와 맞춤
            const payload = {
                email: email,
                password: password,
                device: {
                    uuid: uuid,
                    appVersion: "10.4.5",
                    os: "android",
                    language: "ko",
                    mccmnc: "45005",
                    networkType: 1,
                    protocolVersion: "1",
                    revision: 0 // Xp.U0 클래스의 필드 반영
                }
            };

            console.log(`[Auth] CheckIn 기반 규격으로 로그인 시도 중...`);
            
            // 만약 auth.kakao.com이 -404를 계속 준다면, 
            // 이는 '허가된 호스트'가 아니기 때문일 수 있음.
            const response = await this.client.post("https://auth.kakao.com/v1/internal/talk_login", payload);
            
            console.log("----- [서버 응답 데이터] -----");
            console.log(JSON.stringify(response.data, null, 2));
            return response.data;

        } catch (error) {
            console.error("----- [에러 로그 확인] -----");
            console.error("Status:", error.response?.status);
            console.error("Data:", JSON.stringify(error.response?.data, null, 2));
            return { success: false, status: error.response?.status };
        }
    }
}

module.exports = KakaoAuth;
