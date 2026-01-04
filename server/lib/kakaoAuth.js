const axios = require('axios');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.client = axios.create({
            timeout: 10000,
            // 헤더 순서와 구성을 실제 앱과 최대한 유사하게 재배치
            headers: {
                'Host': 'auth.kakao.com',
                'X-Kakao-Api-Level': '45', // 전형적인 카카오 내부 API 레벨
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'KA': 'sdk/1.0.0 os/android/13 lang/ko_KR res/1080x2277 device/SM-S908N origin/unknown',
                'Content-Type': 'application/json; charset=UTF-8',
                'Accept': 'application/json',
                'Connection': 'keep-alive'
            }
        });
    }

    async login(email, password) {
        try {
            const uuid = this.config.kakao?.deviceUuid || "553120ac9dcbb762";

            // [가설] talk_login 전에 config를 받아오는 단계가 필요할 수 있음
            // 현재는 바로 로그인을 시도하되, 페이로드를 IdCardScannerConfig 규격에 맞춰 정교화
            const payload = {
                email: email,
                password: password,
                device: {
                    uuid: uuid,
                    appVersion: "10.4.5",
                    os: "android",
                    mccmnc: "45005",
                    language: "ko",
                    revision: 0
                },
                // IdCardScannerConfig 분석 결과, 서버는 상세한 설정값을 검증할 수 있음
                extra: {
                    osType: "android",
                    bizCode: "MPPAlipayPlusClient"
                }
            };

            console.log(`[Auth] 보안 장벽 우회 시도 중 (Target: /v1/internal/talk_login)`);
            
            // 주소 뒤에 불필요한 슬래시나 파라미터가 붙지 않도록 주의
            const response = await this.client.post("https://auth.kakao.com/v1/internal/talk_login", payload);
            
            return response.data;
        } catch (error) {
            // HTML 에러가 올 경우 텍스트만 추출하여 핵심 메시지 파악
            const errorData = error.response?.data;
            if (typeof errorData === 'string' && errorData.includes('<title>')) {
                const title = errorData.match(/<title>(.*?)<\/title>/)?.[1];
                console.error(`[Critical] 서버가 HTML 페이지를 반환함: ${title}`);
            }
            console.error("Status:", error.response?.status);
            return { success: false, status: error.response?.status };
        }
    }
}

module.exports = KakaoAuth;
