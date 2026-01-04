const crypto = require('crypto');
const talkHello = require('./talkHello');

const KakaoCrypto = {
    // 1순위 반영: Password 암호화 규격 (C70496a)
    PW_ENC_KEY: "jEibeliJAhlEeyoOnjuNg", // 22자 -> 나머지는 패딩 처리될 수 있으나 분석상 전체 32바이트 KEY로 사용

    encryptPassword(password) {
        // 분석 결과에 따라 32바이트 KEY와 16바이트 IV 구성
        const key = Buffer.alloc(32, 0);
        Buffer.from(this.PW_ENC_KEY).copy(key);
        const iv = Buffer.alloc(16, 0);
        Buffer.from(this.PW_ENC_KEY.substring(0, 16)).copy(iv);

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(password, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },

    // 2순위 반영: uvc3 2단계 암호화 (Native -> Java Wrapper)
    createUvc3(hwInfo) {
        // Step A: TalkHello 네이티브 암호화 (AES-256-CBC)
        const step1Base64 = talkHello.encrypt(JSON.stringify(hwInfo));
        const step1Buffer = Buffer.from(step1Base64, 'base64');

        // Step B: 분석된 바이트 배열 기반 재암호화 (AES/CBC/PKCS5)
        const step2Key = Buffer.from([-2, -80, 46, 7, -3, 116, 58, 92, -26, 120, 41, -64, 101, 23, 51, -107]);
        const step2Iv = Buffer.from([70, 86, 58, -15, -4, -61, -83, 90, -28, -99, -82, -76, 19, 61, -5, 11]);

        const cipher = crypto.createCipheriv('aes-128-cbc', step2Key, step2Iv);
        let encrypted = cipher.update(step1Buffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return encrypted.toString('base64');
    },

    generateDeviceUuid(model) {
        const salt = "dkljleskljfeisflssljeif";
        return crypto.createHash('sha1').update(model + salt).digest('hex');
    }
};

module.exports = KakaoCrypto;
