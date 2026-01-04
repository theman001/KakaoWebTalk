const axios = require('axios');
const { URLSearchParams } = require('url');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        
        /**
         * 1. 분석된 정보를 바탕으로 인스턴스 설정
         * - baseURL: 스캔 결과 유효 경로가 확인된 kapi.kakao.com 사용
         * - headers: JdDapiHeaderInterceptor 및 APK 분석에서 추출된 필수값
         */
        this.client = axios.create({
            baseURL: "https://kapi.kakao.com", 
            headers: {
                // [필수] APK 내 소스코드에서 확인된 Admin Key
                'Authorization': 'KakaoAK d0ede325b798076919f0012eba6dab8b',
                // [필수] 카카오 SDK 및 디바이스 식별 헤더 (스캔 시 403 우회용)
                'KA': 'sdk/1.0.0 os/android/13 lang/ko_KR res/1080x2277 device/SM-S908N origin/unknown',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'Host': 'kapi.kakao.com'
            },
            timeout: 10000
        });

        /**
         * 2. 확정된 엔드포인트
         * - POST 스캔 결과 403 Forbidden 응답으로 실존이 확인된 내부 로그인 경로
         */
        this.authUrl = "/v1/internal/p";

        // 패킷 디버깅을 위한 인터셉터
        this.client.interceptors.request.use(request => {
            console.log('----- [보내는 패킷 정보] -----');
            console.log('Full URL:', request.baseURL + request.url);
            console.log('Method:', request.method.toUpperCase());
            console.log('Headers:', JSON.stringify(request.headers, null, 2));
            console.log('Body:', request.data);
            console.log('---------------------------');
            return request;
        });
    }

    async login(email, password) {
        try {
            const params = new URLSearchParams();
            
            /**
             * 3. 파라미터 구성
             * - 카카오는 보안상 'password' 대신 'p' 필드를 사용하는 경우가 많으므로 
             * - 실패 시 p로 교체하여 테스트하십시오.
             */
            params.append('email', email);
            params.append('p', password); // 'password' 대신 'p' 사용
            
            // 기기 및 환경 정보 (APK 내부 로직 기반)
            params.append('device_uuid', this.config.kakao?.deviceUuid || "default-uuid");
            params.append('os_version', "13");
            params.append('model', "SM-S908N");
            params.append('app_version', "10.4.5");
            params.append('os', "android");
            params.append('net_type', "WIFI");

            console.log(`[Auth] 카카오 내부 로그인 경로로 시도 중: ${this.authUrl}`);

            const response = await this.client.post(this.authUrl, params.toString());

            // 응답 데이터 처리
            if (response.data && (response.data.status === 0 || response.data.access_token)) {
                console.log(">>> 카카오 인증 성공!");
                return {
                    success: true,
                    session: response.data
                };
            } else {
                return {
                    success: false,
                    message: response.data.error_message || "응답 데이터 형식 불일치"
                };
            }
        } catch (error) {
            console.error("---------- [Kakao API Debug] ----------");
            if (error.response) {
                // 403이 계속 뜬다면 Body 데이터의 암호화(p 필드) 문제일 가능성이 큽니다.
                console.error("Status:", error.response.status);
                console.error("Data:", JSON.stringify(error.response.data, null, 2));
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
