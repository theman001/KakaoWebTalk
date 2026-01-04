const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        this.email = config.email || "";
        this.password = config.password || "";
        this.appVersion = "11.0.5";
        this.androidId = config.androidId || "7a9b0c1d2e3f4a5b";
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;

        // [Layer 1] 네이티브 상수 조합 보정 (Stack Reverse Order)
        // Ghidra 스택은 거꾸로 쌓일 가능성이 높으므로 순서를 반전시켜 시도합니다.
        this.nativeKey = Buffer.concat([
            Buffer.from("c45af149cf51dd3a", 'hex').reverse(), // uStack_68
            Buffer.from("f4275c2db340fb17", 'hex').reverse(), // uStack_70
            Buffer.from("c039ea22a95bc647", 'hex').reverse(), // uStack_78
            Buffer.from("2add44ed36b417d3", 'hex').reverse()  // local_80
        ]);
        
        this.nativeIv = Buffer.concat([
            Buffer.from("ab706428573c2fdf", 'hex').reverse(), // uStack_28 (새로 발견된 스택값)
            Buffer.from("aaae49ac5a06cb4", 'hex').reverse()   // uStack_30
        ]);

        this.abuseKey = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
        this.abuseIv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);
        this.pwdSeed = "jEibeliJAhlEeyoOnjuNg";
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
        // [보정] 카카오 네이티브에서 기대하는 실제 uvc 필드명 (순서 포함)
        const deviceData = {
            "os": "android",
            "model": "SM-S908N",
            "os_version": "13",
            "android_id": this.androidId,
            "talk_version": this.appVersion, // app_version 대신 talk_version 사용 가능성
            "timestamp": Math.floor(Date.now() / 1000)
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

    async login(passedEmail, passedPassword) {
        const url = "https://auth.kakao.com/android/account/login.json";
        const deviceUuid = crypto.createHash('sha1').update("dkljleskljfeisflssljeif " + this.androidId).digest('hex');
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

        try {
            console.log("---- [Final Attempt Start] ----");
            const response = await axios.post(url, payload.toString(), { headers });
            console.log("[Server Result]:", response.data);
            return { success: response.data.status === 0, data: response.data };
        } catch (error) {
            console.error("[Request Failed]:", error.message);
            return { success: false, message: "통신 실패" };
        }
    }
}

module.exports = KakaoAuth;
