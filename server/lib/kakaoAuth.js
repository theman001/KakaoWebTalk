const axios = require('axios');
const talkHello = require('../security/talkHello');

/**
 * 카카오 계정 인증 및 토큰 획득 클래스
 */
class KakaoAuth {
    constructor(config) {
        this.config = config;
        // 카카오 인증 서버 기본 설정
        this.authHost = "https://auth.kakao.com";
        this.userAgent = `KT/${config.kakao.appVersion} Android/11`;
    }

    /**
     * 카카오 계정 로그인 실행
     * @param {string} email - 사용자 이메일
     * @param {string} password - 사용자 비밀번호
     */
    async login(email, password) {
        try {
            console.log(`[KakaoAuth] 로그인 시도 중: ${email}`);

            // 1. 기기 인증 정보(UVC3) 구성 및 암호화
            const deviceData = {
                os: "android",
                model: "SM-G991N", // 임의의 최신 기종 정보
                item_type: "J",
                app_ver: this.config.kakao.appVersion,
                protocol_ver: this.config.kakao.protocolVersion,
                device_uuid: this.config.kakao.deviceUuid || "generated-uuid-placeholder"
            };

            // /server/security/talkHello.js 모듈 사용
            const encryptedUvc3 = talkHello.encrypt(deviceData);

            // 2. 카카오 인증 서버로 POST 요청 (API 규격 준수)
            const response = await axios.post(`${this.authHost}/login.json`, 
                new URLSearchParams({
                    email: email,
                    password: password,
                    device_uuid: deviceData.device_uuid,
                    access_token: "",
                    v: "android",
                    os: "11",
                    model: deviceData.model,
                    item_type: "J",
                    app_ver: deviceData.app_ver,
                    uvc3: encryptedUvc3 // 암호화된 기기 정보 주입
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': this.userAgent,
                        'X-VC': encryptedUvc3 // 헤더에도 암호화 값 포함 (필요시)
                    }
                }
            );

            const data = response.data;

            // 3. 결과 처리
            if (data.status === 0) {
                console.log(`[KakaoAuth] 로그인 성공: ${data.userId}`);
                return {
                    status: 0,
                    userId: data.userId,
                    access_token: data.access_token,
                    deviceUuid: deviceData.device_uuid
                };
            } else if (data.status === -100) {
                // 추가 인증(기기 등록)이 필요한 경우 등
                throw new Error("추가 인증 또는 기기 등록이 필요한 계정입니다.");
            } else {
                throw new Error(data.message || "카카오 서버 응답 오류");
            }

        } catch (error) {
            if (error.response) {
                console.error("[KakaoAuth] 서버 응답 에러:", error.response.data);
                throw new Error(`카카오 서버 에러: ${error.response.data.message || '로그인 실패'}`);
            }
            throw error;
        }
    }
}

module.exports = KakaoAuth;
