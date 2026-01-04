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
     * [LOGGING] 카카오 서버 전송 데이터 상세 시각화
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
            // uvc3와 password는 매우 길기 때문에 가독성을 위해 요약 출력
            const displayVal = (key === 'uvc3' || key === 'password') && val.length > 50 
                ? `${val.substring(0, 50)}... [Total: ${val.length} chars]`
                : val;
            console.log(`│   ${key.padEnd(15)} : ${displayVal}`);
        });
        console.log("└──────────────────── [KAKAO AUTH REQUEST END] ────────────────────┘");
    }

    async login(email, password) {
        try {
            // 1. 보안 모듈을 통한 데이터 가공 및 생성
            // 분석 결과 1순위: SHA-1 40자 Device UUID
            const deviceUuid = this.config.kakao.deviceUuid || kakaoCrypto.generateDeviceUuid(this.model);
            
            // 분석 결과 2순위: C70496a 기반 AES-256-CBC 패스워드 암호화
            const encryptedPassword = kakaoCrypto.encryptPassword(password);
            
            // 분석 결과 3순위: 2단계 암호화용 하드웨어 정보 구성
            const hwInfo = {
                os: "android",
                model: this.model,
                item_type: "J",
                app_ver: this.appVersion,
                protocol_ver: "1.1",
                device_uuid: deviceUuid,
                device_name: "Galaxy S21",
                cpuName: "exynos2100", // 분석 기반 추가 필드
                batteryPct: 95,        // 분석 기반 추가 필드
                screenSize: "2400x1080", // 분석 기반 추가 필드
                va: []                 // VerifyApps 빈 배열
            };

            // uvc3 생성 (Native AES-256 -> Java Layer AES-128 재암호화)
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

            // 3. 요청 파라미터 구성 (분석된 누락 필드 보강)
            const params = {
                email: email,
                password: encryptedPassword,
                device_uuid: deviceUuid,
                os: hwInfo.os,
                model: hwInfo.model,
                model_name: hwInfo.model, // 보강 필드
                v: this.androidVersion,
                app_ver: this.appVersion,
                uvc3: uvc3,
                item_type: hwInfo.item_type,
                lang: this.language,
                device_name: hwInfo.device_name,
                forced: "true",
                permanent: "true",       // 보강 필드
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
            
            if (response.data.status !== 0) {
                console.warn(`[KakaoAuth Warning] Message: ${response.data.message || 'Unknown'}`);
            }
            
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
