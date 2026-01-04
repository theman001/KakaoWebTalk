const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const talkHello = require('../security/talkHello');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.authHost = "https://auth.kakao.com";
        // 분석 결과에 따른 하드코딩된 버전 정보 (v25.11.2)
        this.appVersion = '25.11.2';
        this.androidVersion = '14';
        this.language = 'ko';
    }

    /**
     * 분석된 규격에 따른 필수 헤더 생성
     */
    generateHeaders() {
        return {
            'A': `android/${this.appVersion}/${this.language}`,
            'C': uuidv4(), // 매 요청마다 새로운 UUID 생성
            'Accept-Language': this.language,
            'User-Agent': `KT/${this.appVersion} An/${this.androidVersion} ${this.language}`,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'auth.kakao.com'
        };
    }

    async login(email, password) {
        try {
            console.log(`[KakaoAuth] 로그인 시도 (v${this.appVersion}): ${email}`);

            const deviceData = {
                os: "android",
                model: "SM-G991N",
                item_type: "J",
                app_ver: this.appVersion,
                protocol_ver: "1.1",
                device_uuid: this.config.kakao.deviceUuid
            };

            // 기존 분석된 AES-256-CBC 로직으로 UVC3 생성
            const encryptedUvc3 = talkHello.encrypt(deviceData);

            const params = new URLSearchParams({
                email: email,
                password: password,
                device_uuid: deviceData.device_uuid,
                os: deviceData.os,
                v: this.androidVersion,
                model: deviceData.model,
                app_ver: deviceData.app_ver,
                item_type: deviceData.item_type,
                uvc3: encryptedUvc3,
                lang: this.language
            });

            // 생성된 필수 헤더 적용
            const headers = this.generateHeaders();

            const response = await axios.post(`${this.authHost}/android/account/login.json`, 
                params.toString(),
                { headers: headers }
            );

            const data = response.data;

            if (data.status === 0) {
                console.log(`[KakaoAuth] 로그인 성공: ${data.userId}`);
                return {
                    status: 0,
                    userId: data.userId,
                    access_token: data.access_token,
                    deviceUuid: deviceData.device_uuid
                };
            } else {
                console.error(`[KakaoAuth Error] Status: ${data.status}, Msg: ${data.message}`);
                throw new Error(data.message || "로그인 실패");
            }

        } catch (error) {
            if (error.response) {
                console.error("[KakaoAuth Debug] Full Error Data:", JSON.stringify(error.response.data));
                throw new Error(error.response.data.message || "카카오 서버 접근 거부");
            }
            throw error;
        }
    }
}

module.exports = KakaoAuth;
