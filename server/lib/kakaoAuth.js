const axios = require('axios');
const { URLSearchParams } = require('url');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        
        // 1. 분석된 정보를 바탕으로 인스턴스 설정
        this.client = axios.create({
            // ZzngHostUtil 분석 결과에 따른 API 베이스 URL
            baseURL: "https://kapi.kakao.com", 
            headers: {
                // JdDapiHeaderInterceptor에서 추출된 필수 Admin Key
                'Authorization': 'KakaoAK d0ede325b798076919f0012eba6dab8b',
                // 보안 및 앱 식별을 위한 KA 헤더
                'KA': 'sdk/1.0.0 os/android/13 lang/ko_KR res/1080x2277 device/SM-S908N origin/unknown',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)'
            },
            timeout: 10000
        });

        // JdDapi 키워드 기반 추정 경로 (최종 경로는 JADX @POST 검색 결과 반영 필요)
        this.authUrl = "/v1/dapi/login/talk";

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
            const params = new URLSearchParams();
            params.append('email', email);
            params.append('password', password); // TODO: 암호화 필드(p) 확인 시 수정 필요
            params.append('device_uuid', this.config.kakao?.deviceUuid || "default-uuid");
            params.append('os_version', "13");
            params.append('model', "SM-S908N");
            params.append('app_version', "10.4.5");
            params.append('os', "android");
            params.append('net_type', "WIFI");

            console.log(`[Auth] 카카오 API 서버로 인증 시도 중: ${email}`);

            const response = await this.client.post(this.authUrl, params.toString());

            if (response.data && response.data.status === 0) {
                console.log(">>> 카카오 인증 성공!");
                return {
                    success: true,
                    session: response.data
                };
            } else {
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
