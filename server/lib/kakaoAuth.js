const axios = require('axios');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        // 디버깅으로 확인된 실제 모바일 인증 엔드포인트
        this.authUrl = "https://auth.kakao.com/login/talk_v2"; 
    }

    async login(email, password) {
        try {
            // 1. 요청 본문 데이터 (x-www-form-urlencoded 형식 강제)
            const params = new URLSearchParams();
            params.append('email', email);
            params.append('password', password);
            params.append('device_uuid', this.config.kakao?.deviceUuid || "default-uuid");
            params.append('os_version', "13");
            params.append('model', "SM-S908N");
            params.append('app_version', "10.4.5");
            params.append('os', "android");
            params.append('net_type', "WIFI");

            // 2. 헤더 설정 (정상 클라이언트 위장)
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'A': 'android/10.4.5/ko',
                'Host': 'auth.kakao.com'
            };

            console.log(`[Auth] 카카오 서버(${this.authUrl})로 인증 시도 중: ${email}`);

            const response = await axios.post(this.authUrl, params.toString(), { headers });

            if (response.data && response.data.status === 0) {
                console.log(">>> 카카오 인증 성공!");
                return {
                    success: true,
                    session: response.data // access_token, session_key 포함
                };
            } else {
                console.warn("[Auth] 로그인 실패:", response.data.error_message);
                return {
                    success: false,
                    message: response.data.error_message || "응답 데이터 오류"
                };
            }
        } catch (error) {
            console.error("---------- [Kakao API Debug] ----------");
            if (error.response) {
                // 카카오 서버가 응답은 줬지만 에러인 경우 (400, 401, 404 등)
                console.error("Status:", error.response.status);
                console.error("Data:", JSON.stringify(error.response.data, null, 2));
            } else {
                // 네트워크 연결 자체가 안 된 경우 (Timeout, DNS 등)
                console.error("Error Message:", error.message);
            }
            console.error("---------------------------------------");
            throw error;
        }
    }
}

module.exports = KakaoAuth;
