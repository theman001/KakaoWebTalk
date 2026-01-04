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

    /**
     * [LOGGING] 카카오 서버 전송 데이터 상세 출력
     */
    logDetailedRequest(url, headers, rawPassword, encryptedPassword, params) {
        console.log("┌─────────────────── [KAKAO AUTH REQUEST START] ───────────────────┐");
        console.log(`│ [URL]    : ${url}`);
        console.log(`│ [METHOD] : POST`);
        console.log("├──────────────────────────────────────────────────────────────────┤");
        console.log("│ [HEADERS]");
        Object.entries(headers).forEach(([key, val]) => {
            console.log(`│   ${key.padEnd(15)} : ${val}`);
        });
        console.log("├──────────────────────────────────────────────────────────────────┤");
        console.log("│ [PASSWORD VALIDATION]");
        console.log(`│   Plaintext       : ${rawPassword}`);
        console.log(`│   Encrypted (AES) : ${encryptedPassword}`);
        console.log("├──────────────────────────────────────────────────────────────────┤");
        console.log("│ [REQUEST BODY]");
        Object.entries(params).forEach(([key, val]) => {
            // uvc3는 너무 길어서 일부만 출력 (필요시 전체 출력 가능)
            const displayVal = (key === 'uvc3' || key === 'password') && val.length > 50 
                ? val.substring(0, 50) + "..." 
                : val;
            console.log(`│   ${key.padEnd(15)} : ${displayVal}`);
        });
        console.log("└──────────────────── [KAKAO AUTH REQUEST END] ────────────────────┘");
    }

    async login(email, password) {
        try {
            // 1. 보안 모듈을 통한 데이터 가공 및 생성
            const deviceUuid = this.config.kakao.deviceUuid || kakaoCrypto.generateDeviceUuid(this.model);
            const encryptedPassword = kakaoCrypto.encryptPassword(password);
            
            const hwInfo = {
                os: "android",
                model: this.model,
                item_type: "J",
                app_ver: this.appVersion,
                protocol_ver: "1.1",
                device_uuid: deviceUuid,
                device_name: "Galaxy S21",
                cpu: "exynos2100",
                screen: "2400x1080"
            };

            // uvc3 생성 (TalkHello 네이티브 암호화)
            const uvc3 = kakaoCrypto.createUvc3(hwInfo);

            // 2. HTTP 헤더 구성
            const headers = {
                'A': `android/${this.appVersion}/${this.language}`,
                'C': uuidv4(),
                'Accept-Language': this.language,
                'User-Agent': `KT/${this.appVersion} An/${this.androidVersion} ${this.language}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': 'auth.kakao.com'
            };

            // 3. 요청 파라미터 구성
            const params = {
                email: email,
                password: encryptedPassword,
                device_uuid: deviceUuid,
                os: hwInfo.os,
                model: hwInfo.model,
                v: this.androidVersion,
                app_ver: this.appVersion,
                uvc3: uvc3,
                item_type: hwInfo.item_type,
                lang: this.language,
                device_name: hwInfo.device_name,
                forced: "true",
                format: "json"
            };

            const targetUrl = `${this.authHost}/android/account/login.json`;

            // [LOGGING] 전송 직전 모든 데이터 상세 로깅
            this.logDetailedRequest(targetUrl, headers, password, encryptedPassword, params);

            // 4. 실제 요청 전송
            const response = await axios.post(targetUrl, 
                new URLSearchParams(params).toString(),
                { headers: headers }
            );

            // [LOGGING] 응답 성공 로깅
            console.log(`[KakaoAuth Success] HTTP ${response.status} - User ID: ${response.data.userId || 'N/A'}`);
            
            return response.data;

        } catch (error) {
            console.error("┌─────────────────── [KAKAO AUTH ERROR INFO] ───────────────────┐");
            if (error.response) {
                console.error(`│ STATUS : ${error.response.status}`);
                console.error(`│ DATA   : ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(`│ MESSAGE: ${error.message}`);
            }
            console.error("└───────────────────────────────────────────────────────────────┘");
            throw error;
        }
    }
}

module.exports = KakaoAuth;
