const crypto = require('crypto');

/**
 * Layer 1: libtalkand_aes_v11.3.0.so 분석 기반 네이티브 암호화
 */
class NativeCipher {
    constructor() {
        // Ghidra 스택 분석 결과: local_80, uStack_78, uStack_70, uStack_68 조합
        this.key = Buffer.from([
            0xd3, 0x17, 0xb4, 0x36, 0xed, 0x44, 0xdd, 0x2a, 
            0x47, 0xc6, 0x5b, 0xa9, 0x22, 0xea, 0x39, 0xc0,
            0x17, 0xfb, 0x40, 0xb3, 0x2d, 0x5c, 0x27, 0xf4,
            0x3a, 0xdd, 0x51, 0xcf, 0x49, 0xf1, 0x5a, 0xc4
        ]);

        // Ghidra 분석 결과: local_40, uStack_38 조합 (진짜 IV)
        this.iv = Buffer.from([
            0x20, 0x4b, 0x0e, 0x3a, 0x43, 0x15, 0x54, 0x2b,
            0x1a, 0x5a, 0x34, 0x24, 0x47, 0x40, 0x09, 0x51
        ]);
    }

    encrypt(plainText) {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
        let encrypted = cipher.update(plainText, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }
}

module.exports = new NativeCipher();
