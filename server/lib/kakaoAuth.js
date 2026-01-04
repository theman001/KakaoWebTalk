const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const talkHello = require('../security/talkHello');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.authHost = "https://auth.kakao.com";
        this.appVersion = '25.11.2';
        this.androidVersion = '14';
        this.language = 'ko';
        this.model = "SM-G991N"; // 갤럭시 S21
    }

    /**
     * 기기 모델명 기반으로 고유 UUID 생성 (32자리 Hex)
     */
    generateDeviceUuid() {
        if (this.config.kakao.deviceUuid) return this.config.kakao.deviceUuid;
        // 모델명을 해싱하여 기기별 고유값 생성 (테스트용)
        return crypto.createHash('md5').update(this.model + "salt").digest('hex');
    }

    logRequest(url, headers, params) {
        console.log("┌───────────────── [KAKAO OUTGOING REQUEST] ─────────────────┐");
        console.log(`│ URL: ${url}`);
        const maskedParams = new URLSearchParams(params);
        if (maskedParams.has('password')) maskedParams.set('password', '********');
        console.log(`│ Body: ${maskedParams.toString()}`);
        console.log("└────────────────────────────────────────────────────────────┘");
    }

    async login(email, password) {
        try {
            // 기종(SM-G991N)과 매칭되는 UUID 생성
            const deviceUuid = this.generateDeviceUuid();

            const deviceData = {
                os: "android",
                model: this.model,
                item_type: "J",
                app_ver: this.appVersion,
                protocol_ver: "1.1",
                device_uuid: deviceUuid
            };

            const encryptedUvc3 = talkHello.encrypt(deviceData);
            
            const headers = {
                'A': `android/${this.appVersion}/${this.language}`,
                'C': uuidv4(),
                'Accept-Language': this.language,
                'User-Agent': `KT/${this.appVersion} An/${this.androidVersion} ${this.language}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            };

            const params = {
                email: email,
                password: password,
                device_uuid: deviceUuid,
                os: deviceData.os,
                model: deviceData.model,
                v: this.androidVersion,
                app_ver: deviceData.app_ver,
                uvc3: encryptedUvc3,
                item_type: deviceData.item_type,
                lang: this.language
            };

            const targetUrl = `${this.authHost}/android/account/login.json`;
            this.logRequest(targetUrl, headers, params);

            const response = await axios.post(targetUrl, 
                new URLSearchParams(params).toString(),
                { headers: headers }
            );

            return response.data;

        } catch (error) {
            console.error("┌───────────────── [KAKAO REQUEST ERROR] ──────────────────┐");
            if (error.response) {
                console.error(`│ Status: ${error.response.status}`);
                console.error(`│ Data: ${error.response.data.toString().substring(0, 500)}`);
            }
            console.error("└────────────────────────────────────────────────────────────┘");
            throw error;
        }
    }
}

module.exports = KakaoAuth;
