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
            const crypto = require('crypto');
            
            /**
             * 카카오 규격에 맞는 UUID 생성 함수
             * @returns {string} 16자리 hex 문자열 (Android ID 대용)
             */
            function generateKakaoUuid() {
                // 실제 안드로이드 식별자와 유사한 16진수 16자 생성
                return crypto.randomBytes(8).toString('hex');
            }
            
            // ... 클래스 내부 login 함수 중 ...
            const payload = {
                email: email,
                password: password,
                device: {
                    // 이전에 사용한 "your-device-uuid"를 제거하고 규격화된 값 사용
                    uuid: this.config.kakao?.deviceUuid || generateKakaoUuid()
                }
            };

            console.log(`[Auth] JSON 규격으로 로그인 시도 중: ${this.authUrl}`);

            const response = await this.client.post(this.authUrl, payload);

            // 로그를 상세히 찍어 실제 데이터 확인
            console.log("----- [서버 응답 데이터] -----");
            console.log(JSON.stringify(response.data, null, 2));
            console.log("----------------------------");
            
            // 성공 조건 강화
            if (response.data && response.data.access_token) {
                console.log(">>> [진짜] 카카오 인증 성공!");
                return { success: true, session: response.data };
            } else {
                console.log(">>> [가짜] 인증 실패 또는 에러 응답");
                return { success: false, message: response.data.message || "인증 실패" };
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
