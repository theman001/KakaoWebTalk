const axios = require('axios');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        // 1. 인증 전용 axios 인스턴스 생성 (권장)
        this.client = axios.create({
            baseURL: "https://auth.kakao.com",
            timeout: 5000
        });

        this.authUrl = "/login/talk_v2"; // baseURL을 설정했으므로 경로만 작성

        // 2. 인터셉터 설정을 생성자 내부로 이동
        this.client.interceptors.request.use(request => {
            console.log('----- [보내는 패킷 정보] -----');
            console.log('URL:', request.baseURL + request.url);
            console.log('Headers:', JSON.stringify(request.headers, null, 2));
            console.log('Body:', request.data);
            console.log('---------------------------');
            return request;
        });
    }

    async login(email, password) {
        try {
            // 요청 데이터 구성
            const params = new URLSearchParams();
            params.append('email', email);
            params.append('password', password);
            params.append('device_uuid', this.config.kakao?.deviceUuid || "default-uuid");
            params.append('os_version', "13");
            params.append('model', "SM-S908N");
            params.append('app_version', "10.4.5");
            params.append('os', "android");
            params.append('net_type', "WIFI");

            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'A': 'android/10.4.5/ko',
                'Host': 'auth.kakao.com'
            };

            console.log(`[Auth] 카카오 서버로 인증 시도 중: ${email}`);

            // this.client 인스턴스를 사용하여 요청
            const response = await this.client.post(this.authUrl, params.toString(), { headers });

            if (response.data && response.data.status === 0) {
                console.log(">>> 카카오 인증 성공!");
                return {
                    success: true,
                    session: response.data
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
                console.error("Status:", error.response.status);
                console.error("Data:", JSON.stringify(error.response.data, null, 2));
            } else {
                console.error("Error Message:", error.message);
            }
            console.error("---------------------------------------");
            throw error;
        }
    }
}

module.exports = KakaoAuth;
