const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const kakaoCrypto = require('../security/kakaoCrypto');

class KakaoAuth {
    constructor(config) {
        this.config = config;
        // ✅ 분석 결과: SubDeviceLoginService.BASE_URL = "{SERVER_TRANSFER_URL}/android/account/"
        // 실제 도메인은 C90388j.m346863l()로 동적으로 결정되지만, 일반적으로 auth.kakao.com 사용
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

            // ⚠️ 실험적 테스트: 복호화 모드 시뮬레이션 (APK 코드의 .a() 메서드)
            // 환경 변수로 제어 가능: USE_DECRYPT_MODE=true
            const useDecryptMode = process.env.USE_DECRYPT_MODE === 'true';
            const encryptedPassword = useDecryptMode
                ? kakaoCrypto.encryptPasswordAlternative(password)
                : kakaoCrypto.encryptPassword(password);

            if (useDecryptMode) {
                console.log("[EXPERIMENTAL] Using decrypt mode simulation (APK .a() method)");
            }

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
            // Analysis Result from p052Aq.C1140a & p210DO.C3935c
            const userAgent = `android/${this.appVersion}/${this.language}`;

            // Device-Info Header Construction (p210DO.C3935c.e())
            // Format: android/{os_ver}; uuid={uuid}; ssaid={ssaid}; model={model}; screen_resolution={res}; sim={sim}; uvc3={uvc3}
            const deviceInfoParts = [
                `android/${this.androidVersion}`,
                `uuid=${deviceUuid}`,
                `ssaid=${deviceUuid}`, // Assuming ssaid is same or specific, sending uuid for now
                `model=${this.model}`,
                `screen_resolution=${hwInfo.screenSize}`,
                `sim=${hwInfo.network_operator}/450/05`, // Example SIM info
                `uvc3=${uvc3}`
            ];
            const deviceInfoHeader = deviceInfoParts.join("; ");

            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': userAgent,
                'A': userAgent, // Commonly ‘A’ header mirrors UA or short version in Kakao apps
                'Accept-Language': this.language,
                'Device-Info': deviceInfoHeader,
                'Host': 'auth.kakao.com'
            };

            // 4. Request Body 파라미터 구성
            // SubDeviceLoginParams, uvc3 removed from body as it is in header now
            const params = {
                email: email,
                password: encryptedPassword,
                device_uuid: deviceUuid,
                device_name: "Galaxy S21",
                forced: true,
                permanent: true,
                model_name: this.model,

                // HTTP 요청용 추가 파라미터
                os: "android",
                model: this.model,
                v: this.androidVersion,
                app_ver: this.appVersion,
                // uvc3: uvc3, // Removed from body
                item_type: "J",
                lang: this.language,
                format: "json"
            };

            // ✅ 분석 결과: SubDeviceLoginService.m194179c() → @POST("login.json")
            // BASE_URL = "{SERVER_TRANSFER_URL}/android/account/"
            // 최종 URL: https://auth.kakao.com/android/account/login.json
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

            // ✅ 분석 결과: SubDeviceLoginResponse 응답 구조
            // 필드: server_time, userId, profileId, countryIso, accountId, sessionKey,
            //       access_token, refresh_token, token_type, loginFailedAccountToken,
            //       autoLoginAccountId, displayAccountId, title, description, button,
            //       uri, anotherEmailVerificationUri, mainDeviceAgentName, mainDeviceAppVersion
            // ⚠️ 주의: SubDeviceLoginResponse에는 'status' 필드가 없습니다!
            // 에러 응답은 다른 형식일 수 있으므로, userId나 access_token 존재 여부로 성공 판단

            const responseData = response.data;
            console.log(`[KakaoAuth Success] HTTP ${response.status} - User ID: ${responseData.userId || 'N/A'}`);

            // 성공 여부 판단: userId와 access_token이 있으면 성공
            if (!responseData.userId || !responseData.access_token) {
                // 실패 응답 처리
                const errorMessage = responseData.message ||
                    responseData.title ||
                    responseData.description ||
                    "로그인 실패";

                console.warn(`[KakaoAuth Warning] Message: ${errorMessage}`);
                console.warn(`[Full Response]: ${JSON.stringify(responseData)}`);

                // status 필드가 있는 경우 (다른 에러 응답 형식)
                if (responseData.status !== undefined && responseData.status !== 0) {
                    // status: -404는 암호화/무결성 검증 실패를 의미할 수 있음
                    if (responseData.status === -404) {
                        console.error(`[KakaoAuth Error] Status -404: 암호화된 데이터 복호화 실패 또는 필수 보안 필드 무결성 깨짐`);
                        console.error(`[KakaoAuth Error] 가능한 원인:`);
                        console.error(`  - Password 암호화 방식 불일치`);
                        console.error(`  - UVC3 암호화/검증 실패`);
                        console.error(`  - Request Body 파라미터 누락 또는 형식 오류`);
                    }
                }

                // 에러 응답에도 status 필드를 추가하여 기존 코드와 호환성 유지
                responseData.status = responseData.status || -1;
                responseData.message = errorMessage;
            } else {
                // 성공 응답에 status 필드 추가 (기존 코드와 호환성 유지)
                responseData.status = 0;
            }

            return responseData;

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
