const axios = require('axios');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        
        /**
         * 1. 분석된 정보를 바탕으로 인스턴스 설정
         * - baseURL: talk_login API가 위치한 auth.kakao.com 사용
         */
        this.client = axios.create({
            baseURL: "https://auth.kakao.com", 
            headers: {
                // APK 내부 헤더 및 분석된 KA 헤더
                'KA': 'sdk/1.0.0 os/android/13 lang/ko_KR res/1080x2277 device/SM-S908N origin/unknown',
                'Content-Type': 'application/json; charset=UTF-8', // JSON 형식으로 변경
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'Accept': 'application/json',
                'Host': 'auth.kakao.com'
            },
            timeout: 10000
        });

        /**
         * 2. 확정된 엔드포인트
         */
        this.authUrl = "/v1/internal/talk_login";

        // 패킷 디버깅 인터셉터
        this.client.interceptors.request.use(request => {
            console.log('----- [보내는 패킷 정보] -----');
            console.log('Full URL:', request.baseURL + request.url);
            console.log('Method:', request.method.toUpperCase());
            console.log('Body:', JSON.stringify(request.data, null, 2)); // JSON 시각화
            console.log('---------------------------');
            return request;
        });
    }

    async login(email, password) {
        try {
            /**
             * 3. 파라미터 구성 (PassCodeLoginRequest 구조 반영)
             * - 분석된 DTO 구조에 따라 'device' 객체 내부에 'uuid'를 넣어야 합니다.
             */
            const payload = {
                email: email,
                password: password, // 만약 403이 계속되면 이 값을 ChaCha20으로 암호화해야 함
                device: {
                    uuid: this.config.kakao?.deviceUuid || "default-uuid"
                }
            };

            console.log(`[Auth] JSON 규격으로 로그인 시도 중: ${this.authUrl}`);

            const response = await this.client.post(this.authUrl, payload);

            // 응답 데이터 처리
            if (response.data && (response.status === 200 || response.data.access_token)) {
                console.log(">>> 카카오 인증 성공!");
                return {
                    success: true,
                    session: response.data
                };
            }
        } catch (error) {
            console.error("---------- [Kakao API Debug] ----------");
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", JSON.stringify(error.response.data, null, 2));
                
                if (error.response.status === 403) {
                    console.error("분석: JSON 구조는 맞으나 비밀번호 암호화(ChaCha20)가 누락되었을 가능성이 높습니다.");
                }
            } else {
                console.error("Error Message:", error.message);
            }
            console.error("---------------------------------------");
            return {
                success: false,
                status: error.response?.status,
                message: error.message
            };
        }
    }
}

module.exports = KakaoAuth;
