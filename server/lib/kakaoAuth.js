const axios = require('axios');
const qs = require('querystring'); // 데이터 포맷 변환용

class KakaoAuth {
    constructor(config) {
        this.config = config;
        // 디버깅으로 확인된 실제 모바일 인증 엔드포인트 (예시)
        this.authUrl = "https://auth.kakao.com/login/talk_v2"; 
    }

    async login(email, password) {
        try {
            // 1. 요청 본문 데이터 (디버깅 시 확인된 필수 필드들)
            const postData = qs.stringify({
                email: email,
                password: password,
                device_uuid: this.config.kakao.deviceUuid, // config.yaml에서 로드
                os_version: "13", // Android 버전
                model: "SM-S908N", // 디버깅 시 사용한 모델명
                app_version: "10.4.5", // 실제 APK 버전
                os: "android", // win32에서 android로 수정
                net_type: "WIFI"
            });

            // 2. 헤더 설정 (정상 클라이언트로 속이는 핵심 부분)
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'A': 'android/10.4.5/ko', // 카카오 전용 커스텀 헤더
                'Host': 'auth.kakao.com'
            };

            console.log("[Auth] 카카오 서버로 인증 시도 중...");

            const response = await axios.post(this.authUrl, postData, { headers });

            // 카카오 응답 처리 (성공 시 status는 보통 0)
            if (response.data && response.data.status === 0) {
                console.log(">>> 카카오 인증 성공!");
                return {
                    success: true,
                    authToken: response.data.access_token,
                    sessionKey: response.data.session_key,
                    userId: response.data.userId
                };
            } else {
                return {
                    success: false,
                    message: response.data.error_message || "응답 데이터 오류"
                };
            }
        } catch (error) {
            // 서버 로그에 구체적인 에러 찍기
            console.error("[Auth Error] 상세 내용:", error.response ? error.response.data : error.message);
            throw new Error(error.message);
        }
    }
}

module.exports = KakaoAuth;
