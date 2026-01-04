const crypto = require('crypto');
const talkHello = require('./talkHello');

/**
 * 카카오톡 전용 보안 알고리즘 모듈
 */
const KakaoCrypto = {
    // 분석 결과 2번: 패스워드 암호화 전용 키
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg",

    /**
     * 패스워드 암호화 (AES-128-CBC / PKCS7)
     * 분석 결과: 키와 IV로 "jEibeliJAhlEeyoOnjuNg"의 앞 16자리를 사용함
     */
    encryptPassword(password) {
        const key = Buffer.from(this.PW_ENC_KEY.substring(0, 16));
        const iv = Buffer.from(this.PW_ENC_KEY.substring(0, 16));
        
        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        let encrypted = cipher.update(password, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },

    /**
     * 분석 결과 1번: SHA-1 기반 Device UUID 생성
     */
    generateDeviceUuid(model) {
        const salt = "dkljleskljfeisflssljeif";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    },

    /**
     * 분석 결과 3번: uvc3 (하드웨어 정보 포함 암호화)
     */
    createUvc3(deviceData) {
        // 기존 talkHello 모듈을 사용하여 네이티브 암호화 수행
        return talkHello.encrypt(deviceData);
    }
};

module.exports = KakaoCrypto;
