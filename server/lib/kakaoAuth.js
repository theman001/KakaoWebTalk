const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const kakaoCrypto = require('../security/kakaoCrypto');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        // URL 문자열에 공백이나 제어문자가 포함되지 않도록 trim() 처리
        this.authHost = "https://auth.kakao.com".trim();
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
            
            // 2. uvc3 내부용 하드웨어 정보 (정밀화된 실제 안드로이드 규격)
            const hwInfo = {
                va: [],                       // [필수] VerifyApps 배열
                installReferrer: "",          // [필수]
                apkChecksum: "",              // [필수]
                appHierarchy: "",             // [필수]
                
                cpuName: "exynos2100",
                cpuPlatform: "exynos",
                cpuCore: 8,
                cpuAbi: "arm64-v8a",
                
                batteryPct: 95,               // ✅ batteryLevel -> batteryPct 정정
                batteryStatus: "charging",
                batteryHealth: "good",
                powerSource: "usb",
                
                brightness: 128,
                screenSize: "2400x1080",
                screenDensity: 420,
                screenPpi: 432,
                screenRefreshRate: 60,
                isMultiWindow: false,
                
                volume: 7,
                totalMemory: 8589934592,      // 8GB
                webviewVersion: "120.0.6099.210",
                
                network_operator: "SKT",      // snake_case 주의
                is_roaming: false,
                supportMultiSim: true,
                sims: []
            };

            const uvc3 = kakaoCrypto.createUvc3(hwInfo);

            // 3. HTTP Headers 설정
            const headers = {
                'A': `android/${this.appVersion}/${this.language}`,
                'C': uuidv4(),
                'Accept-Language': this.language,
                'User-Agent': `KT/${this.appVersion} An/${this.androidVersion} ${this.language}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': 'auth.kakao.com'
            };

            // 4. Request Body 파라미터 구성
            const params = {
                email: email,
                password: encryptedPassword,
                device_uuid: deviceUuid,
                os: "android",
                model: this.model,
                model_name: this.model, 
                v: this.androidVersion,
                app_ver: this.appVersion,
                uvc3: uvc3,
                item_type: "J",
                lang: this.language,
                device_name: "Galaxy S21",
                forced: "true",
                permanent: "true",       
                format: "json"
            };

            // URL 생성 시 발생할 수 있는 잠재적 오류 방지
            const targetUrl = `${this.authHost}/android/account/login.json`.replace(/\s/g, '');

            // 상세 요청 로그 출력
            this.logDetailedRequest(targetUrl, params, headers);

            // 5. POST 요청 실행
            const response = await axios.post(
                targetUrl, 
                new URLSearchParams(params).toString(),
                { 
                    headers: headers,
                    timeout: 10000 // 타임아웃 추가
                }
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

    logDetailedRequest(url, params, headers) {
        console.log("┌──────── [KAKAO AUTH REQUEST START] ────────┐");
        console.log(`│ [URL]     : ${url}`);
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
        } else if (error.request) {
            console.error(`│ MESSAGE: Request failed (No response)`);
            console.error(`│ DETAILS: ${error.message}`);
        } else {
            console.error(`│ MESSAGE: ${error.message}`);
        }
        console.error("└────────────────────────────────────────┘");
    }
}

module.exports = KakaoAuth;
