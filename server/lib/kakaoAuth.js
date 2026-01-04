const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        this.email = config.email;
        this.password = config.password;
        this.appVersion = "11.0.5";
        this.androidId = config.androidId || "7a9b0c1d2e3f4a5b"; // 고정값 권장 (테스트용)
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;

        // [Layer 1] 보정된 Native AES-256-CBC Constants
        // Ghidra 스택 할당 순서(local_80 -> uStack_78 -> uStack_70 -> uStack_68)를 반영한 32바이트 Key
        this.nativeKey = Buffer.concat([
            this.leHexToBuffer("2add44ed36b417d3"), // local_80
            this.leHexToBuffer("c039ea22a95bc647"), // uStack_78
            this.leHexToBuffer("f4275c2db340fb17"), // uStack_70
            this.leHexToBuffer("c45af149cf51dd3a")  // uStack_68
        ]);

        // Ghidra: local_40 -> uStack_38 조합의 16바이트 IV
        this.nativeIv = Buffer.concat([
            this.leHexToBuffer("2b5415433a0e4b20"), // local_40
            this.leHexToBuffer("5109404724345a1a")  // uStack_38
        ]);

        // [Layer 2] AbuseDetectUtil AES-128-CBC
        this.abuseKey = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
        this.abuseIv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);

        this.pwdSeed = "jEibeliJAhlEeyoOnjuNg";
    }

    // Little Endian Hex String을 Buffer로 변환
    leHexToBuffer(hex) {
        return Buffer.from(hex, 'hex').reverse();
    }

    encryptPassword(password) {
        const key = Buffer.alloc(32, this.pwdSeed);
        const iv = key.slice(0, 16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        return cipher.update(password, 'utf8', 'base64') + cipher.final('base64');
    }

    generateUvc3() {
        // uvc 데이터 조립 (필드 순서가 중요할 수 있음)
        const deviceData = {
            "os": "android",
            "model": "SM-S908N",
            "android_id": this.androidId,
            "os_version": "13",
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
    }

    async login() {
        const url = "https://auth.kakao.com/android/account/login.json";
        // Salt가 포함된 정교한 Device UUID 생성
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
            'email': this.email,
            'password': this.encryptPassword(this.password),
            'device_uuid': deviceUuid,
            'device_name': 'SM-S908N',
            'model_name': 'SM-S908N',
            'permanent': 'true',
            'forced': 'false',
            'uvc3': uvc3
        });

        const response = await axios.post(url, payload.toString(), { headers });
        console.log("[Kakao Response]:", response.data);
        return response.data;
    }
}

module.exports = KakaoAuth;
