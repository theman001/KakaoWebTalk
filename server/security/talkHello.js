const crypto = require('crypto');

/**
 * TalkHello.encrypt() Node.js 구현
 * 분석 기반: libtalkand_aes_v11.3.0.so (Ghidra)
 */
class TalkHello {
    constructor() {
        // [분석 결과 1.3] AES-256 키 (32 bytes)
        this.KEY = Buffer.from(
            '3add51cf49f15ac4204b0e3a4315542bd317b436ed44dd2a47c65ba922ea39c0',
            'hex'
        );
        
        // [분석 결과 1.3] IV (16 bytes)
        this.IV = Buffer.from(
            'df2f3c57286470abb46ca0c59ae4aa0a',
            'hex'
        );
    }

    /**
     * 카카오톡 기기 인증(UVC3) 문자열 암호화
     * @param {string|object} input - 암호화할 데이터
     * @returns {string} - Base64 인코딩된 암호문
     */
    encrypt(input) {
        try {
            const data = typeof input === 'string' ? input : JSON.stringify(input);
            const cipher = crypto.createCipheriv('aes-256-cbc', this.KEY, this.IV);
            
            cipher.setAutoPadding(true); // PKCS#7 패딩 적용

            let encrypted = cipher.update(data, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            return encrypted;
        } catch (error) {
            console.error('[Security Error] Encryption failed:', error.message);
            throw error;
        }
    }
}

// 싱글톤으로 수출
module.exports = new TalkHello();
