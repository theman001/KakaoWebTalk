const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        this.email = config.email || "";
        this.password = config.password || "";
        this.appVersion = "11.0.5";
        this.androidId = config.androidId || "7a9b0c1d2e3f4a5b";
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;

        try {
            // [Layer 1] Native Constants - Little Endian 복원
            this.nativeKey = Buffer.concat([
                Buffer.from("2add44ed36b417d3", 'hex').reverse(),
                Buffer.from("c039ea22a95bc647", 'hex').reverse(),
                Buffer.from("f4275c2db340fb17", 'hex').reverse(),
                Buffer.from("c45af149cf51dd3a", 'hex').reverse()
            ]);
            this.nativeIv = Buffer.concat([
                Buffer.from("2b5415433a0e4b20", 'hex').reverse(),
                Buffer.from("5109404724345a1a", 'hex').reverse()
            ]);

            // [Layer 2] AbuseDetect Constants
            this.abuseKey = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
            this.abuseIv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);

            this.pwdSeed = "jEibeliJAhlEeyoOnjuNg";
        } catch (e) {
            console.error("[Constructor Error]:", e);
        }
    }

    encryptPassword(password) {
        const target = password || this.password;
        if (!target) return "";
        try {
            const key = Buffer.alloc(32, this.pwdSeed);
            const iv = key.slice(0, 16);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            return cipher.update(String(target), 'utf8', 'base64') + cipher.final('base64');
        } catch (e) {
            console.error("[Password Encrypt Error]:", e.message);
            return "";
        }
    }

    generateUvc3() {
        try {
            // [중요] 실제 카카오톡 앱의 uvc JSON 필드 순서와 구성을 최대한 맞춤
            const deviceData = {
                "os": "android",
                "model": "SM-S908N",
                "os_version": "13",
                "android_id": this.androidId,
                "app_version": this.appVersion
            };
            const jsonStr = JSON.stringify(deviceData);

            // Layer 1 (Native)
            const cipher1 = crypto.createCipheriv('aes-256-cbc', this.nativeKey, this.nativeIv);
            let l1 = cipher1.update(jsonStr, 'utf8', 'base64');
            l1 += cipher1.final('base64');

            // Layer 2 (AbuseDetect)
            const cipher2 = crypto.createCipheriv('aes-128-cbc', this.abuseKey, this.abuseIv);
            let l2 = cipher2.update(l1, 'utf8', 'base64');
            l2 += cipher2.final('base64');

            return l2;
        } catch (e) {
            console.error("[uvc3 Generate Error]:", e.message);
            return "error_uvc3";
        }
    }

    async login(passedEmail, passedPassword) {
        const loginEmail = passedEmail || this.email;
        const loginPassword = passedPassword || this.password;

        if (!loginEmail || !loginPassword) {
            console.log("[Login] Missing Credentials");
            return { success: false, message: "이메일/비밀번호 누락" };
        }

        const url = "https://auth.kakao.com/android/account/login.json";
        const deviceUuid = crypto.createHash('sha1').update("dkljleskljfeisflssljeif " + this.androidId).digest('hex');
        const uvc3 = this.generateUvc3();

        const headers = {
            'A': `android/${this.appVersion}/ko`,
            'C': crypto.randomUUID(),
            'User-Agent': this.userAgent,
            'Accept-Language': 'ko-KR',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'auth.kakao.com',
            'Connection': 'Keep-Alive'
        };

        const payload = new URLSearchParams({
            'email': loginEmail,
            'password': this.encryptPassword(loginPassword),
            'device_uuid': deviceUuid,
            'device_name': 'SM-S908N',
            'model_name': 'SM-S908N',
            'permanent': 'true',
            'forced': 'false',
            'uvc3': uvc3
        });

        try {
            console.log("---- [Login Request Start] ----");
            const response = await axios.post(url, payload.toString(), { headers });
            console.log("[Kakao Server Response]:", response.data);
            return { success: response.data.status === 0, data: response.data };
        } catch (error) {
            console.error("---- [Login Request Error] ----");
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", error.response.data);
                return { success: false, message: error.response.data.message || "서버 응답 에러" };
            }
            console.error("Error Message:", error.message);
            return { success: false, message: "네트워크 오류" };
        }
    }
}

module.exports = KakaoAuth;
