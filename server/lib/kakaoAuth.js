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

            // UVC3 복호화 검증 (디버깅용)
            if (uvc3) {
                const decryptedHwInfo = kakaoCrypto.decryptUvc3(uvc3);
                if (decryptedHwInfo) {
                    console.log("┌──────── [UVC3 DECRYPTION VERIFICATION] ────────┐");
                    console.log("│ ✅ UVC3 복호화 성공");
                    console.log("├────────────────────────────────────────┤");
                    console.log("│ [Original hwInfo]");
                    console.log(`│   Fields count: ${Object.keys(hwInfo).length}`);
                    console.log("├────────────────────────────────────────┤");
                    console.log("│ [Decrypted hwInfo]");
                    console.log(`│   Fields count: ${Object.keys(decryptedHwInfo).length}`);
                    console.log("├────────────────────────────────────────┤");
                    
                    // 필드 비교
                    const originalKeys = Object.keys(hwInfo).sort();
                    const decryptedKeys = Object.keys(decryptedHwInfo).sort();
                    const missingKeys = originalKeys.filter(k => !decryptedKeys.includes(k));
                    const extraKeys = decryptedKeys.filter(k => !originalKeys.includes(k));
                    
                    if (missingKeys.length > 0) {
                        console.log(`│ ⚠️  Missing keys in decrypted: ${missingKeys.join(', ')}`);
                    }
                    if (extraKeys.length > 0) {
                        console.log(`│ ⚠️  Extra keys in decrypted: ${extraKeys.join(', ')}`);
                    }
                    
                    // 값 비교 (주요 필드만)
                    const keyFields = ['va', 'cpuName', 'batteryPct', 'screenSize', 'network_operator'];
                    let matchCount = 0;
                    let mismatchCount = 0;
                    
                    keyFields.forEach(key => {
                        if (hwInfo[key] !== undefined && decryptedHwInfo[key] !== undefined) {
                            const originalVal = JSON.stringify(hwInfo[key]);
                            const decryptedVal = JSON.stringify(decryptedHwInfo[key]);
                            if (originalVal === decryptedVal) {
                                matchCount++;
                            } else {
                                mismatchCount++;
                                console.log(`│ ❌ Mismatch [${key}]: original=${originalVal}, decrypted=${decryptedVal}`);
                            }
                        }
                    });
                    
                    if (matchCount > 0 && mismatchCount === 0) {
                        console.log(`│ ✅ All checked fields match (${matchCount} fields)`);
                    } else if (mismatchCount > 0) {
                        console.log(`│ ⚠️  ${mismatchCount} field(s) mismatch`);
                    }
                    
                    console.log("└────────────────────────────────────────┘");
                } else {
                    console.error("[UVC3 Decryption] ❌ 복호화 실패 - UVC3 생성에 문제가 있을 수 있습니다.");
                }
            } else {
                console.error("[UVC3 Creation] ❌ UVC3 생성 실패");
            }

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
        console.log(`│ [METHOD]  : POST`);
        console.log("├────────────────────────────────────────┤");
        console.log("│ [HEADERS]");
        Object.entries(headers).forEach(([key, val]) => {
            console.log(`│   ${key.padEnd(15)} : ${val}`);
        });
        console.log("├────────────────────────────────────────┤");
        console.log("│ [BODY PARAMETERS]");
        Object.entries(params).forEach(([key, val]) => {
            const displayVal = (key === 'uvc3' || key === 'password') && val && val.length > 50
                ? `${val.substring(0, 50)}... [Total: ${val.length} chars]`
                : val;
            console.log(`│   ${key.padEnd(15)} : ${displayVal}`);
        });
        console.log("└────────────────────────────────────────┘");
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
