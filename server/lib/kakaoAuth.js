const crypto = require('crypto');
const axios = require('axios');

class KakaoAuth {
    constructor(config = {}) {
        this.config = config;
        this.appVersion = "25.11.2";
        this.pwdKeySeed = "jEibeliJAhlEeyoOnjuNg";
        this.userAgent = `KT/${this.appVersion} An/14 ko`;
        this.androidId = config.androidId || 'default_device_id';
        this.deviceUuid = this.generateDeviceUuid(this.androidId);
    }

    generateDeviceUuid(androidId) {
        const salt = "dkljleskljfeisflssljeif ";
        return crypto.createHash('sha1').update(salt + androidId).digest('hex');
    }

    encryptPassword(plainPassword) {
        if (!plainPassword) throw new Error('비밀번호가 입력되지 않았습니다.');
        const iv = Buffer.from(this.pwdKeySeed.substring(0, 16), 'utf8');
        const key = Buffer.alloc(32, 0);
        Buffer.from(this.pwdKeySeed, 'utf8').copy(key, 0, 0, 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        return cipher.update(String(plainPassword), 'utf8', 'base64') + cipher.final('base64');
    }

    async login(email, password) {
        try {
            const payload = {
                'email': email,
                'password': this.encryptPassword(password),
                'device_uuid': this.deviceUuid,
                'device_name': this.config.deviceName || 'SM-S908N',
                'model_name': this.config.modelName || 'SM-S908N',
                'permanent': 'true',
                'forced': 'false',
                'uvc3': ''
            };

            const params = new URLSearchParams(payload);
            const response = await axios.post('https://auth.kakao.com/android/account/login.json', params.toString(), {
                headers: {
                    'A': `android/${this.appVersion}/ko`,
                    'C': crypto.randomUUID(),
                    'User-Agent': this.userAgent,
                    'Accept-Language': 'ko',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Host': 'auth.kakao.com'
                }
            });

            return { success: response.data.status === 0, session: response.data, message: response.data.message };
        } catch (error) {
            const msg = error.response ? error.response.data.message : error.message;
            return { success: false, message: msg };
        }
    }
}

module.exports = KakaoAuth;
