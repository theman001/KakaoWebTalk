const crypto = require('crypto');

/**
 * Layer 2: AbuseDetect (Java Layer) AES-128-CBC 재암호화
 */
class AbuseDetect {
    constructor() {
        // 보고서 2.3절의 부호 있는 바이트 배열을 Uint8로 변환
        this.key = Buffer.from([-2, -80, 46, 7, -3, 116, 58, 92, -26, 120, 41, -64, 101, 23, 51, -107].map(b => b & 0xFF));
        this.iv = Buffer.from([70, 86, 58, -15, -4, -61, -83, 90, -28, -99, -82, -76, 19, 61, -5, 11].map(b => b & 0xFF));
    }

    encrypt(layer1Output) {
        const cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
        let encrypted = cipher.update(layer1Output, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }
}

module.exports = new AbuseDetect();
