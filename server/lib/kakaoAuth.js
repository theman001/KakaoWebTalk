const crypto = require('crypto');
const axios = require('axios');

/**
 * KakaoAuth: Ghidra 분석 네이티브 키 및 이중 암호화 반영 버전
 */
class KakaoAuth {
    constructor(config = {}) {
        this.email = config.email;
        this.password = config.password;
        this.appVersion = "11.0.5";
        this.androidId = config.androidId || this.generateRandomHex(16);
        this.userAgent = `KakaoTalk/${this.appVersion} (Android 13; ko_KR; SM-S908N)`;

        // [Layer 1] 네이티브(.so) Ghidra 분석 추출 키 및 IV
        // Ghidra에서 확인된 리틀 엔디안 상수들을 바이트 배열로 정제 [cite: 5, 20]
        this.nativeKey = Buffer.from([
            0xd3, 0x17, 0xb4, 0x36, 0xed, 0x44, 0xdd, 0x2a, 
            0x47, 0xc6, 0x5b, 0xa9, 0x22, 0xea, 0x39, 0xc0,
            0x17, 0xfb, 0x40, 0xb3, 0x2d, 0x5c, 0x27, 0xf4,
            0x3a, 0xdd, 0x51, 0xcf, 0x49, 0xf1, 0x5a, 0xc4
        ]);
        this.nativeIv = Buffer.from([
            0x20, 0x4b, 0x0e, 0x3a, 0x43, 0x15, 0x54, 0x2b,
            0x1a, 0x5a, 0x34, 0x24, 0x47, 0x40, 0x09, 0x51
        ]);

        // [Layer 2] AbuseDetectUtil.m213055g에서 추출된 Java 레이어 키/IV [cite: 1]
        this.abuseKey = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
        this.abuseIv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);

        // [Password] C70496a 비밀번호 암호화용 시드 [cite: 1, 4]
        this.pwdSeed = "jEibeliJAhlEeyoOnjuNg";
    }

    generateRandomHex(len) {
        return crypto.randomBytes(len / 2).toString('hex');
    }

    /**
     * 비밀번호 암호화 (AES-256-CBC / PKCS7) [cite: 1, 4]
     */
    encryptPassword(password) {
        if (!password) return "";
        const key = Buffer.alloc(32, this.pwdSeed);
        const iv = key.slice(0, 16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(password, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }

    /**
     * uvc3 생성: 네이티브(Layer1) -> 자바(Layer2) 이중 암호화 구조 
     */
    generateUvc3() {
        const deviceData = {
            "cpuCore": 8,
            "screenSize": "1080x2340",
            "totalMemory": 8589934592,
            "os_version": "13",
            "model": "SM-S908N",
            "android_id": this.androidId,
            "timestamp": Math.floor(Date.now() / 1000)
        };
        const jsonStr = JSON.stringify(deviceData);

        // Layer 1: Native AES-256-CBC (libtalkand_aes)
        const cipher1 = crypto.createCipheriv('aes-256-cbc', this.nativeKey, this.nativeIv);
        let l1 = cipher1.update(jsonStr, 'utf8', 'base64');
        l1 += cipher1.final('base64');

        // Layer 2: Java AES-128-CBC (AbuseDetectUtil)
        const cipher2 = crypto.createCipheriv('aes-128-cbc', this.abuseKey, this.abuseIv);
        let l2 = cipher2.update(l1, 'utf8', 'base64');
        l2 += cipher2.final('base64');

        return l2;
    }

    async login() {
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

        const payload = {
            'email': this.email,
            'password': this.encryptPassword(this.password),
            'device_uuid': deviceUuid,
            'device_name': 'SM-S908N',
            'model_name': 'SM-S908N',
            'permanent': 'true',
            'forced': 'false',
            'uvc3': uvc3
        };

        const params = new URLSearchParams(payload);

        try {
            console.log("[Request Headers]:", headers);
            console.log("[Request Payload (uvc3 Generated)]");
            
            const response = await axios.post(url, params.toString(), { headers });
            
            console.log("[Kakao Response]:", response.data);
            return { success: response.data.status === 0, data: response.data };

        } catch (error) {
            console.error("========== [KAKAO API ERROR] ==========");
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", JSON.stringify(error.response.data, null, 2));
            } else {
                console.error("Message:", error.message);
            }
            return { success: false, message: "접근 차단 또는 암호화 오류" };
        }
    }
}

module.exports = KakaoAuth;
