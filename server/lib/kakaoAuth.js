const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        this.email = config.email || "";
        this.password = config.password || "";
        this.appVersion = "11.0.5";
        this.androidId = config.androidId || "7a9b0c1d2e3f4a5b";
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;

        // 8바이트 리틀 엔디안 변환
        const toBuf = (hex) => Buffer.from(hex.padStart(16, '0'), 'hex').reverse();

        // [Layer 1] Native Key: Ghidra 스택 순서 최적화
        this.nativeKey = Buffer.concat([
            toBuf("2add44ed36b417d3"), toBuf("c039ea22a95bc647"),
            toBuf("f4275c2db340fb17"), toBuf("c45af149cf51dd3a")
        ]);
        
        // IV를 0으로 설정 (Rust Cipher 기본값 대응)
        this.nativeIv = Buffer.alloc(16, 0);

        // [Layer 2] AbuseDetect Constants
        this.abuseKey = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
        this.abuseIv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);
        
        this.pwdSeed = "jEibeliJAhlEeyoOnjuNg";
    }

    encryptPassword(password) {
        const key = Buffer.alloc(32, this.pwdSeed);
        const iv = key.slice(0, 16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        return cipher.update(String(password), 'utf8', 'base64') + cipher.final('base64');
    }

    generateUvc3() {
        // [보정] 필드 순서: 서버 파서와 일치하도록 재배치
        const deviceData = {
            "os": "android",
            "model": "SM-S908N",
            "android_id": this.androidId,
            "os_version": "13",
            "talk_version": this.appVersion
        };
        const jsonStr = JSON.stringify(deviceData);

        // Layer 1 (Native AES-256-CBC)
        const cipher1 = crypto.createCipheriv('aes-256-cbc', this.nativeKey, this.nativeIv);
        const l1Raw = Buffer.concat([cipher1.update(jsonStr, 'utf8'), cipher1.final()]);

        // [핵심 보정] Layer 1의 바이너리 결과물을 그대로 Layer 2의 입력값(UTF-8 해석 방지)으로 사용
        const cipher2 = crypto.createCipheriv('aes-128-cbc', this.abuseKey, this.abuseIv);
        // l1Raw를 Buffer로 입력하고 최종 결과만 base64로 출력
        let l2 = cipher2.update(l1Raw, null, 'base64');
        l2 += cipher2.final('base64');

        return l2;
    }

    async login(passedEmail, passedPassword) {
        const url = "https://auth.kakao.com/android/account/login.json";
        // device_uuid의 salt 공백 재확인
        const deviceUuid = crypto.createHash('sha1').update("dkljleskljfeisflssljeif " + this.androidId).digest('hex');
        
        try {
            const uvc3 = this.generateUvc3();
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

            console.log("---- [Login Attempt: Full Binary Layering] ----");
            const response = await axios.post(url, payload.toString(), { headers });
            
            console.log("[Server Result]:", response.data);
            return response.data;
        } catch (error) {
            console.error("[Login Failed]:", error.message);
            return { status: -500, message: "System Error" };
        }
    }
}

module.exports = KakaoAuth;
