const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const kakaoCrypto = require('../security/kakaoCrypto');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        this.authHost = "https://auth.kakao.com";
        this.appVersion = "25.11.2";
        this.androidVersion = "14";
        this.language = "ko";
        this.model = "SM-G991N";
    }

    /**
     * 카카오톡 로그인 실행
     */
    async login(email, password) {
        try {
            // 1. 보안 식별자 및 암호화 데이터 생성
            const deviceUuid = this.config.kakao.deviceUuid || kakaoCrypto.generateDeviceUuid(this.model);
            const encryptedPassword = kakaoCrypto.encryptPassword(password);
            
            // 2. [중요] uvc3 내부용 하드웨어 정보 (CamelCase 적용 및 필드 정밀화)
            // 서버 복호화 시 대조 데이터로 사용됨
            const hwInfo = {
                osName: "android",
                osVersion: this.androidVersion,
                model: this.model,
                appVersion: this.appVersion,
                deviceUuid: deviceUuid,
                deviceName: "Galaxy S21",
                language: this.language,
                screenSize: "2400x1080",
                itemType: "J",
                cpuName: "exynos2100",
                batteryLevel: 95
            };

            const uvc3 = kakaoCrypto.createUvc3(hwInfo);

            // 3. HTTP Headers 설정 (A, C 헤더 및 User-Agent)
            const headers = {
                'A': `android/${this.appVersion}/${this.language}`,
                'C': uuidv4(), // 매 요청마다 새로운 UUID 생성 (Replay Attack 방지)
                'Accept-Language': this.language,
                'User-Agent': `KT/${this.appVersion} An/${this.androidVersion} ${this.language}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': 'auth.kakao.com'
            };

            // 4. [수정] Request Body (os: undefined 문제 해결)
            const params = {
                email: email,
                password: encryptedPassword,
                device_uuid: deviceUuid,
                os: "android",                // ✅ Fixed: hwInfo.os 대신 직접 할당
                model: this.model,
                model_name: this.model, 
                v: this.androidVersion,       // osVersion과 매칭
                app_ver: this.appVersion,     // appVersion과 매칭
                uvc3: uvc3,
                item_type: "J",
                lang: this.language,
                device_name: "Galaxy S21",
                forced: "true",
                permanent: "true",       
                format: "json"
            };

            // 상세 요청 로그 출력 (디버깅용)
            this.logDetailedRequest(params, headers);

            // 5. POST 요청 실행
            const response = await axios.post(
                `${this.authHost}/android/account/login.json`, 
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
            this.handleError(error);
            throw error;
        }
    }

    logDetailedRequest(params, headers) {
        console.log("┌──────── [KAKAO AUTH REQUEST START] ────────┐");
        console.log(`│ [URL]     : ${this.authHost}/android/account/login.json`);
        console.log(`│ [HEADERS] : A=${headers['A']}, C=${headers['C']}`);
        console.log(`│ [BODY]    : email=${params.email}, os=${params.os}, v=${params.v}`);
        console.log(`│ [UVC3]    : ${params.uvc3.substring(0, 50)}...`);
        console.log("└────────────────────────────────────────────┘");
    }

    handleError(error) {
        console.error("┌──────── [KAKAO AUTH ERROR INFO] ────────┐");
        if (error.response) {
            console.error(`│ STATUS : ${error.response.status}`);
            console.error(`│ DATA   : ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`│ MESSAGE: ${error.message}`);
        }
        console.error("└────────────────────────────────────────┘");
    }
}

module.exports = KakaoAuth;
