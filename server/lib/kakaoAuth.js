const axios = require('axios');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.client = axios.create({
            timeout: 15000, // 서버 지연에 대비해 시간 연장
            headers: {
                // 앱에서 실제로 사용하는 최소한의 필수 헤더만 구성
                'KA': 'sdk/1.0.0 os/android/13 lang/ko_KR res/1080x2277 device/SM-S908N origin/unknown',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'Content-Type': 'application/json; charset=UTF-8',
                'Host': 'auth.kakao.com',
                'Connection': 'Keep-Alive',
                'Accept-Encoding': 'gzip'
            }
        });
    }

    async login(email, password) {
        try {
            const uuid = this.config.kakao?.deviceUuid || "553120ac9dcbb762";

            const payload = {
                email: email,
                password: password,
                device: {
                    uuid: uuid,
                    appVersion: "10.4.5",
                    os: "android",
                    mccmnc: "45005",
                    language: "ko"
                }
            };

            console.log(`[Auth] 재시도: ${email} 계정으로 로그인 요청 전송...`);
            
            // 실제 앱에서 /v1/internal/talk_login 이 맞는지 확인이 필요함
            const response = await this.client.post("https://auth.kakao.com/v1/internal/talk_login", payload);
            
            console.log("[Auth] 서버 응답 수신 성공");
            return response.data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.error("[Critical] 서버 응답 타임아웃 - 패킷이 차단되었을 가능성");
            } else {
                console.error("Status:", error.response?.status);
                console.error("Data:", error.response?.data ? "HTML/JSON 수신됨" : "내용 없음");
            }
            return { success: false };
        }
    }
}

module.exports = KakaoAuth;
