const crypto = require('crypto');

class LocoCrypto {
  constructor() {
    // Loco 프로토콜에서 사용하는 고정된 IV (Initialization Vector)
    this.iv = Buffer.from([15, 8, 1, 0, 25, 71, 37, 220, 21, 245, 23, 224, 225, 21, 250, 85]);
    this.key = null; // 핸드셰이크를 통해 설정될 AES 세션 키
  }

  /**
   * AES 세션 키를 설정합니다.
   * @param {Buffer} key - 16바이트 또는 32바이트 키
   */
  setKey(key) {
    this.key = key;
  }

  /**
   * 데이터를 AES-CFB 모드로 암호화합니다.
   * @param {Buffer} data - 암호화할 BSON 데이터
   */
  encrypt(data) {
    if (!this.key) return data;
    const cipher = crypto.createCipheriv('aes-128-cfb', this.key, this.iv);
    return Buffer.concat([cipher.update(data), cipher.final()]);
  }

  /**
   * 암호화된 데이터를 복호화합니다.
   * @param {Buffer} encryptedData - 서버로부터 받은 암호화된 바디
   */
  decrypt(encryptedData) {
    if (!this.key) return encryptedData;
    const decipher = crypto.createDecipheriv('aes-128-cfb', this.key, this.iv);
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  /**
   * 핸드셰이크를 위한 RSA 공개키 암호화 (초기 키 교환용)
   * @param {Buffer} keyToEncrypt - 암호화할 세션 키
   * @param {string} publicKeyPem - 카카오 서버의 RSA 공개키
   */
  encryptRSA(keyToEncrypt, publicKeyPem) {
    return crypto.publicEncrypt({
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, keyToEncrypt);
  }
}

module.exports = new LocoCrypto();
