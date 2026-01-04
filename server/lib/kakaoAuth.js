const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        this.email = config.email || "";
        this.password = config.password || "";
        this.appVersion = "11.0.5";
        this.androidId = config.androidId || "7a9b0c1d2e3f4a5b";
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;

        // 8바이트(64비트) 정수를 리틀 엔디안 버퍼로 변환하는 헬퍼
        const toBuf = (hex) => {
            // 16진수 문자열을 16자(8바이트)로 맞춤 (앞에 0 채우기)
            const padded = hex.padStart(16, '0');
            return Buffer.from(padded, 'hex').reverse();
        };

        try {
            // [Layer 1] Native Constants (Ghidra 분석 기반)
            // Key: 32바이트 (local_80, uStack_78, uStack_70, uStack_68)
            this.nativeKey = Buffer.concat([
                toBuf("2add44ed36b417d3"), // local_80
                toBuf("c039ea22a95bc647"), // uStack_78
                toBuf("f4275c2db340fb17"), // uStack_70
                toBuf("c45af149cf51dd3a")  // uStack_68
            ]);

            // IV: 16바이트 (local_40, uStack_38)
            this.nativeIv = Buffer.concat([
                toBuf("2b5415433a0e4b20"), // local_40
                toBuf("5109404724345a1a")  // uStack_38
            ]);

            // [Layer 2] AbuseDetect Constants (Java 추출)
            this.abuseKey = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
            this.abuseIv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);
            
            this.pwdSeed = "jEibeliJAhlEeyoOnjuNg";
        } catch (e) {
            console.error("[Crypto Init Error]:", e);
        }
    }

    encryptPassword(password) {
        const target = password || this.password;
        if (!target) return "";
        const key = Buffer.alloc(32, this.pwdSeed);
        const iv = key.slice(0, 16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        return cipher.update(String(target), 'utf8', 'base64') + cipher.final('base64');
    }

    generateUvc3() {
        // [구조 보정] 실제 앱은 최소한의 필드만 포함하거나 순서가 고정됨
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
        let l1 = cipher1.update(jsonStr, 'utf8', 'base64');
        l1 += cipher1.final('base64');

        // Layer 2 (AbuseDetect AES-128-CBC)
        const cipher2 = crypto.createCipheriv('aes-128-cbc', this.abuseKey, this.abuseIv);
        let l2 = cipher2.update(l1, 'utf8', 'base64');
        l2 += cipher2.final('base64');

        return l2;
    }

    async login(passedEmail, passedPassword) {
        const url = "https://auth.kakao.com/android/account/login.json";
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

            console.log("---- [Login Attempt with Fixed IV] ----");
            const response = await axios.post(url, payload.toString(), { headers });
            console.log("[Server Result]:", response.data);
            return { success: response.data.status === 0, data: response.data };
        } catch (error) {
            console.error("[Login Process Error]:", error.message);
            return { success: false, message: "로그인 처리 실패" };
        }
    }
}

module.exports = KakaoAuth;
