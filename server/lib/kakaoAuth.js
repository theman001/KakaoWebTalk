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
            // 상세 에러 로깅 (404, 401 등 확인용)
            if (error.response) {
                console.error("[Auth Error] 서버 응답:", error.response.status, error.response.data);
            } else {
                console.error("[Auth Error] 통신 실패:", error.message);
            }
            throw error;
        }
    }
}

module.exports = KakaoAuth;
