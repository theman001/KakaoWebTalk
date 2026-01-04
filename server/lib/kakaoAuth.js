const axios = require('axios');
const talkHello = require('../security/talkHello');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.authHost = "https://auth.kakao.com";
        // 카카오톡 정식 버전 정보와 매칭되는 User-Agent 사용
        this.userAgent = `KakaoTalk/${this.config.kakao.appVersion} (Android 11; SM-G991N; ko)`;
    }

    async login(email, password) {
        try {
            console.log(`[KakaoAuth] 로그인 시도 중: ${email}`);

            const deviceData = {
                os: "android",
                model: "SM-G991N",
                item_type: "J",
                app_ver: this.config.kakao.appVersion,
                protocol_ver: this.config.kakao.protocolVersion,
                device_uuid: this.config.kakao.deviceUuid || "generated-uuid-placeholder"
            };

            const encryptedUvc3 = talkHello.encrypt(deviceData);

            // 카카오 서버가 '올바른 접근'으로 인식하기 위한 필수 파라미터 보강
            const params = new URLSearchParams({
                email: email,
                password: password,
                device_uuid: deviceData.device_uuid,
                os: "android",
                v: "11",
                model: deviceData.model,
                app_ver: deviceData.app_ver,
                item_type: "J",
                uvc3: encryptedUvc3,
                lang: "ko" // 언어 설정 추가
            });

            const response = await axios.post(`${this.authHost}/login.json`, 
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': this.userAgent,
                        'Host': 'auth.kakao.com',
                        'A-VC': encryptedUvc3, // 일부 버전에서 X-VC 대신 A-VC 사용
                        'Accept': '*/*',
                        'Accept-Language': 'ko-KR'
                    }
                }
            );

            const data = response.data;

            if (data.status === 0) {
                return {
                    status: 0,
                    userId: data.userId,
                    access_token: data.access_token,
                    deviceUuid: deviceData.device_uuid
                };
            } else {
                // 서버에서 내려주는 구체적인 에러 메시지 확인
                throw new Error(data.message || `Status: ${data.status}`);
            }

        } catch (error) {
            // 상세 로그 출력 (원인 파악용)
            if (error.response && error.response.data) {
                console.error("[KakaoAuth Remote Error]:", JSON.stringify(error.response.data));
                throw new Error(error.response.data.message || "카카오 서버 거부");
            }
            throw error;
        }
    }
}

module.exports = KakaoAuth;
