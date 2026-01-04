const axios = require('axios');
const crypto = require('crypto');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.client = axios.create({
            // Xp.A (CheckIn) 분석 결과에 따라 호스트는 유동적일 수 있음
            baseURL: "https://auth.kakao.com", 
            headers: {
                'KA': 'sdk/1.0.0 os/android/13 lang/ko_KR res/1080x2277 device/SM-S908N origin/unknown',
                'Content-Type': 'application/json; charset=UTF-8',
                'User-Agent': 'KakaoTalk/10.4.5 (Android/13; light; ko)',
                'Accept': 'application/json'
            },
            timeout: 10000
        });
    }

    async login(email, password) {
        try {
            /**
             * 1. Xp.U0 (Request) 클래스 필드 반영
             * - 분석된 데이터 구조에 따라 필수 기기 정보(mccmnc, os 등)를 포함합니다.
             */
            const payload = {
                email: email,
                password: password,
                device: {
                    uuid: this.config.kakao?.deviceUuid || "553120ac9dcbb762",
                    appVersion: "10.4.5",
                    os: "android",
                    language: "ko",
                    mccmnc: "45005", // 분석된 Request 클래스의 mccmnc 필드 반영
                    networkType: 1,  // WIFI 기준
                    protocolVersion: "1"
                }
            };

            console.log(`[Auth] 분석된 Request 규격으로 시도 중...`);

            const response = await this.client.post("/v1/internal/talk_login", payload);

            console.log("----- [서버 응답 데이터] -----");
            console.log(JSON.stringify(response.data, null, 2));
            console.log("----------------------------");

            // Xp.B2 및 성공 조건 검증
            if (response.data && response.data.access_token) {
                return { success: true, session: response.data };
            } else {
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error("---------- [Kakao API Debug] ----------");
            console.error("Status:", error.response?.status);
            console.error("Data:", JSON.stringify(error.response?.data, null, 2));
            return { success: false, message: error.message };
        }
    }
}

module.exports = KakaoAuth;
