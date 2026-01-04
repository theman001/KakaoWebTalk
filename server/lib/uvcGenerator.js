const crypto = require('crypto');

/**
 * KakaoTalk uvc3 Generator (Dual-Layer Encryption)
 */
class UvcGenerator {
    constructor() {
        // [Layer 1] 네이티브(.so)에서 추출한 상수 (Little-endian 처리)
        // Ghidra: local_80, uStack_78, uStack_70, uStack_68 조합
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

        // [Layer 2] AbuseDetectUtil.m213055g에서 추출한 상수
        this.abuseKey = Buffer.from([254, 176, 46, 7, 253, 116, 58, 92, 230, 120, 41, 192, 101, 23, 51, 149]);
        this.abuseIv = Buffer.from([70, 86, 58, 241, 252, 195, 173, 90, 228, 157, 174, 180, 19, 61, 251, 11]);
    }

    /**
     * Layer 1: Native AES-256-CBC Encryption + Base64
     */
    encryptLayer1(plainText) {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.nativeKey, this.nativeIv);
        cipher.setAutoPadding(true);
        let encrypted = cipher.update(plainText, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }

    /**
     * Layer 2: AbuseDetect AES-128-CBC Encryption + Base64
     */
    encryptLayer2(layer1Output) {
        const cipher = crypto.createCipheriv('aes-128-cbc', this.abuseKey, this.abuseIv);
        cipher.setAutoPadding(true);
        let encrypted = cipher.update(layer1Output, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }

    /**
     * 최종 uvc3 생성 함수
     */
    generate(deviceData) {
        const jsonStr = JSON.stringify(deviceData);
        const l1 = this.encryptLayer1(jsonStr);
        const l2 = this.encryptLayer2(l1);
        return l2;
    }
}

// 사용 예시
const generator = new UvcGenerator();
const uvc3 = generator.generate({
    "cpuCore": 8,
    "screenSize": "1080x2340",
    "totalMemory": 8589934592,
    "os_version": "13",
    "model": "SM-S908N",
    "android_id": "your_android_id_here"
});

console.log("Generated uvc3:", uvc3);
