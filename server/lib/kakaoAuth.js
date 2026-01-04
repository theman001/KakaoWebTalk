const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        this.email = config.email || "";
        this.password = config.password || "";
        this.appVersion = "11.0.5";
        this.androidId = config.androidId || "7a9b0c1d2e3f4a5b";
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;

        const toBuf = (hex) => Buffer.from(hex.padStart(16, '0'), 'hex').reverse();

        // [Layer 1] Native AES-256-CBC
        this.nativeKey = Buffer.concat([
            toBuf("2add44ed36b417d3"), toBuf("c039ea22a95bc647"),
            toBuf("f4275c2db340fb17"), toBuf("c45af149cf51dd3a")
        ]);
        // IV가 위와 다를 경우를 대비해, 가장 표준적인 '0' 채우기 IV도 고려 (현재는 추출값 유지)
        this.nativeIv = Buffer.concat([
            toBuf("2b5415433a0e4b20"), toBuf("5109404724345a1a")
        ]);

        // [Layer 2] AbuseDetect AES-128-CBC
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
        // [교정] 실제 앱 패킷 기반 필드 구성 및 순서
        const deviceData = {
            "os": "android",
            "model": "SM-S908N",
            "android_id": this.androidId,
            "os_version": "13",
            "talk_version": this.appVersion
        };
        // 공백 없는 JSON 문자열 생성
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
    }

    async login(passedEmail, passedPassword) {
        const url = "https://auth.kakao.com/android/account/login.json";
        // device_uuid 생성 시 salt와 android_id 사이의 공백 확인 필수
        const deviceUuid = crypto.createHash('sha1').update("dkljleskljfeisflssljeif " + this.androidId).digest('hex');
        
        try {
            const uvc3 = this.generateUvc3();
            const headers = {
                'A': `android/${this.appVersion}/ko`,
                'C': crypto.randomUUID(), // 실제로는 특정 알고리즘 기반 UUID일 수 있음
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

            const response = await axios.post(url, payload.toString(), { headers });
            return response.data;
        } catch (error) {
            return { status: -500, message: error.message };
        }
    }
}

module.exports = KakaoAuth;
