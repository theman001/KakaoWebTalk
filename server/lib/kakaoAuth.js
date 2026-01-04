const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const kakaoCrypto = require('../security/kakaoCrypto');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.authHost = "https://auth.kakao.com";
        this.appVersion = '25.11.2';
        this.androidVersion = '14';
        this.language = 'ko';
        this.model = "SM-G991N";
    }

    logDetailedRequest(url, headers, rawPassword, encryptedPassword, params) {
        console.log("┌──────── [KAKAO AUTH REQUEST START] ────────┐");
        console.log(`│ [URL]    : ${url}`);
        console.log(`│ [METHOD] : POST`);
        console.log("├────────────────────────────────────────┤");
        console.log("│ [HEADERS]");
        Object.entries(headers).forEach(([key, val]) => {
            console.log(`│   ${key.padEnd(15)} : ${val}`);
        });
        console.log("├────────────────────────────────────────┤");
        console.log("│ [PASSWORD VALIDATION]");
        console.log(`│   Plaintext       : ${rawPassword}`);
        console.log(`│   Encrypted (AES) : ${encryptedPassword}`);
        console.log("├────────────────────────────────────────┤");
        console.log("│ [REQUEST BODY]");
        Object.entries(params).forEach(([key, val]) => {
            const displayVal = (key === 'uvc3' || key === 'password') && val.length > 50 
                ? `${val.substring(0, 50)}... [Total: ${val.length} chars]`
                : val;
            console.log(`│   ${key.padEnd(15)} : ${displayVal}`);
        });
        console.log("└──────── [KAKAO AUTH REQUEST END] ────────┘");
    }

    async login(email, password) {
        try {
            const deviceUuid = this.config.kakao.deviceUuid || kakaoCrypto.generateDeviceUuid(this.model);
            const encryptedPassword = kakaoCrypto.encryptPassword(password);
            
            // 분석 1순위: uvc3 내부 하드웨어 정보 정밀화
            const hwInfo = {
                os: "android",
                model: this.model,
                item_type: "J",
                app_ver: this.appVersion,
                protocol_ver: "1.1",
                device_uuid: deviceUuid,
                device_name: "Galaxy S21",
                cpuName: "exynos2100", 
                batteryPct: 95,        
                screenSize: "2400x1080",
                va: []                 
            };

            const uvc3 = kakaoCrypto.createUvc3(hwInfo);

            const headers = {
                'A': `android/${this.appVersion}/${this.language}`,
                'C': uuidv4(),
                'Accept-Language': this.language,
                'User-Agent': `KT/${this.appVersion} An/${this.androidVersion} ${this.language}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': 'auth.kakao.com'
            };

            const params = {
                email: email,
                password: encryptedPassword,
                device_uuid: deviceUuid,
                os: hwInfo.os,
                model: hwInfo.model,
                model_name: hwInfo.model, 
                v: this.androidVersion,
                app_ver: this.appVersion,
                uvc3: uvc3,
                item_type: hwInfo.item_type,
                lang: this.language,
                device_name: hwInfo.device_name,
                forced: "true",
                permanent: "true",       
                format: "json"
            };

            const targetUrl = `${this.authHost}/android/account/login.json`;
            this.logDetailedRequest(targetUrl, headers, password, encryptedPassword, params);

            const response = await axios.post(targetUrl, 
                new URLSearchParams(params).toString(),
                { headers: headers }
            );

            console.log(`[KakaoAuth Success] HTTP ${response.status} - User ID: ${response.data.userId || 'N/A'}`);
            
            if (response.data.status !== 0) {
                console.warn(`[KakaoAuth Warning] Message: ${response.data.message || 'Unknown'}`);
                console.warn(`[Full Response]: ${JSON.stringify(response.data)}`);
            }
            
            return response.data;

        } catch (error) {
            console.error("┌──────── [KAKAO AUTH ERROR INFO] ────────┐");
            if (error.response) {
                console.error(`│ STATUS : ${error.response.status}`);
                console.error(`│ DATA   : ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(`│ MESSAGE: ${error.message}`);
            }
            console.error("└────────────────────────────────────────┘");
            throw error;
        }
    }
}

module.exports = KakaoAuth;
