const crypto = require('crypto');
const axios = require('axios');
const uvcFactory = require('../security/uvcFactory');

class KakaoAuth {
    constructor(config = {}) {
        this.email = config.email || "";
        this.password = config.password || "";
        this.appVersion = config.kakao?.appVersion || "11.0.5";
        this.androidId = config.androidId || "7a9b0c1d2e3f4a5b";
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;
    }

    /**
     * 비밀번호 암호화 (기존 Java C70496a 로직 대응 필요 시 수정)
     * 현재는 단순 평문 전송 방지용 스텁입니다.
     */
    encryptPassword(password) {
        // 실제 카카오톡은 RSA 또는 커스텀 암호화를 사용합니다.
        // 분석된 솔트: "jEibeliJAhlEeyoOnjuNg"
        return password; 
    }

    /**
     * 최종 로그인 프로세스
     */
    async login(passedEmail, passedPassword) {
        const url = "https://auth.kakao.com/android/account/login.json";
        
        // 1. device_uuid 생성 (분석된 솔트 포함)
        const deviceUuid = crypto.createHash('sha1')
            .update("dkljleskljfeisflssljeif " + this.androidId)
            .digest('hex');
        
        // 2. uvc3 생성을 위한 기기 정보 구성 (APK 보고서 2.2절 기준 필드)
        const deviceInfoData = {
            "va": "8.3.5.2",
            "installReferrer": "google_play",
            "apkChecksum": "V64/p+X...", // 실제 체크섬 값 필요
            "cpuName": "snapdragon",
            "batteryPct": 85,
            "volume": 7,
            "totalMemory": 8589934592,
            "network_operator": "SKT"
            // uvcFactory에서 정의된 fieldOrder에 따라 자동 정렬됨
        };

        try {
            // 3. 통합 보안 모듈을 통한 uvc3 생성 (Native + Abuse Layer)
            const uvc3 = uvcFactory.generate(deviceInfoData);

            const headers = {
                'A': `android/${this.appVersion}/ko`,
                'C': crypto.randomUUID(),
                'User-Agent': this.userAgent,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Host': 'auth.kakao.com'
            };

            const payload = new URLSearchParams({
                'email': passedEmail || this.email,
                'password': this.encryptPassword(passedPassword || this.password),
                'device_uuid': deviceUuid,
                'device_name': 'SM-S908N',
                'model_name': 'SM-S908N',
                'permanent': 'true',
                'forced': 'false',
                'uvc3': uvc3
            });

            console.log(`[Login] Attempting login for: ${passedEmail || this.email}`);
            console.log(`[Login] Generated UVC3: ${uvc3.substring(0, 20)}...`);

            const response = await axios.post(url, payload.toString(), { headers });
            
            if (response.data.status === 0) {
                console.log("[Login] Success: Auth Token acquired.");
            } else {
                console.warn(`[Login] Result: ${response.data.message} (Code: ${response.data.status})`);
            }

            return {
                ...response.data,
                deviceUuid: deviceUuid
            };

        } catch (error) {
            console.error("[Login] Connection Error:", error.message);
            return { status: -500, message: "서버 연결 실패: " + error.message };
        }
    }
}

module.exports = KakaoAuth;
