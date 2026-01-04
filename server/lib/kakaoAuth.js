const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const talkHello = require('../security/talkHello');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.authHost = "https://kauth.kakao.com";
        this.appVersion = '25.11.2';
        this.androidVersion = '14';
        this.language = 'ko';
    }

    /**
     * [LOGGING] 요청 데이터 시각화 도구
     */
    logRequest(url, headers, params) {
        console.log("┌───────────────── [KAKAO OUTGOING REQUEST] ─────────────────┐");
        console.log(`│ URL: ${url}`);
        console.log(`│ Method: POST`);
        console.log(`│ Headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n│ ')}`);
        
        // 비밀번호 마스킹 처리 후 바디 출력
        const maskedParams = new URLSearchParams(params);
        if (maskedParams.has('password')) maskedParams.set('password', '********');
        
        console.log(`│ Body: ${maskedParams.toString()}`);
        console.log("└────────────────────────────────────────────────────────────┘");
    }

    async login(email, password) {
        try {
            const deviceData = {
                os: "android",
                model: "SM-G991N",
                item_type: "J",
                app_ver: this.appVersion,
                protocol_ver: "1.1",
                device_uuid: this.config.kakao.deviceUuid
            };

            const encryptedUvc3 = talkHello.encrypt(deviceData);
            const headers = {
                'A': `android/${this.appVersion}/${this.language}`,
                'C': uuidv4(),
                'Accept-Language': this.language,
                'User-Agent': `KT/${this.appVersion} An/${this.androidVersion} ${this.language}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': 'kauth.kakao.com'
            };

            const params = {
                email: email,
                password: password,
                device_uuid: deviceData.device_uuid,
                os: deviceData.os,
                model: deviceData.model,
                v: this.androidVersion,
                app_ver: deviceData.app_ver,
                uvc3: encryptedUvc3,
                item_type: deviceData.item_type,
                lang: this.language,
                format: "json"
            };

            const targetUrl = `${this.authHost}/kakao_accounts/login.json`;

            // [LOGGING] 요청 전송 전 데이터 출력
            this.logRequest(targetUrl, headers, params);

            const response = await axios.post(targetUrl, 
                new URLSearchParams(params).toString(),
                { headers: headers }
            );

            // [LOGGING] 응답 수신 성공
            console.log(`[KakaoAuth Success] Response Data: ${JSON.stringify(response.data)}`);

            if (response.data.status === 0) {
                return { 
                    status: 0, 
                    userId: response.data.userId, 
                    access_token: response.data.access_token, 
                    deviceUuid: deviceData.device_uuid 
                };
            } else {
                throw new Error(response.data.message || "로그인 실패");
            }

        } catch (error) {
            console.error("┌───────────────── [KAKAO REQUEST ERROR] ──────────────────┐");
            if (error.response) {
                console.error(`│ Status: ${error.response.status}`);
                console.error(`│ Data: ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(`│ Message: ${error.message}`);
            }
            console.error("└────────────────────────────────────────────────────────────┘");
            throw error;
        }
    }
}

module.exports = KakaoAuth;
