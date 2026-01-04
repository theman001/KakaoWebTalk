const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        // config에서 값을 가져오거나 기본값을 설정
        this.email = config.email || "";
        this.password = config.password || ""; 
        this.appVersion = "11.0.5";
        this.androidId = config.androidId || "7a9b0c1d2e3f4a5b";
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;

        // [Layer 1] Native Constants
        this.nativeKey = Buffer.concat([
            this.leHexToBuffer("2add44ed36b417d3"),
            this.leHexToBuffer("c039ea22a95bc647"),
            this.leHexToBuffer("f4275c2db340fb17"),
            this.leHexToBuffer("c45af149cf51dd3a")
        ]);
        this.nativeIv = Buffer.concat([
            this.leHexToBuffer("2b5415433a0e4b20"),
            this.leHexToBuffer("5109404724345a1a")
        ]);

        // [Layer 2] AbuseDetect Constants
        this.abuseKey = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
        this.abuseIv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);

        this.pwdSeed = "jEibeliJAhlEeyoOnjuNg";
    }

    leHexToBuffer(hex) {
        return Buffer.from(hex, 'hex').reverse();
    }

    encryptPassword(password) {
        // [수정] password가 없을 경우 에러 방지
        const targetPw = password || this.password;
        if (!targetPw) {
            console.error("[Error] encryptPassword: Password is empty");
            return "";
        }
        
        const key = Buffer.alloc(32, this.pwdSeed);
        const iv = key.slice(0, 16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        return cipher.update(String(targetPw), 'utf8', 'base64') + cipher.final('base64');
    }

    generateUvc3() {
        const deviceData = {
            "os": "android",
            "model": "SM-S908N",
            "android_id": this.androidId,
            "os_version": "13",
            "app_version": this.appVersion
        };
        const jsonStr = JSON.stringify(deviceData);

        const cipher1 = crypto.createCipheriv('aes-256-cbc', this.nativeKey, this.nativeIv);
        let l1 = cipher1.update(jsonStr, 'utf8', 'base64');
        l1 += cipher1.final('base64');

        const cipher2 = crypto.createCipheriv('aes-128-cbc', this.abuseKey, this.abuseIv);
        let l2 = cipher2.update(l1, 'utf8', 'base64');
        l2 += cipher2.final('base64');

        return l2;
    }

    // [수정] 인자를 받지 않더라도 constructor의 값을 쓰도록 유연하게 변경
    async login(passedEmail, passedPassword) {
        const loginEmail = passedEmail || this.email;
        const loginPassword = passedPassword || this.password;

        if (!loginEmail || !loginPassword) {
            return { success: false, message: "이메일 또는 비밀번호가 누락되었습니다." };
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
            const response = await axios.post(url, payload.toString(), { headers });
            return response.data;
        } catch (error) {
            console.error("Login API Error:", error.message);
            throw error;
        }
    }
}

module.exports = KakaoAuth;
