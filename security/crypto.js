// security/crypto.js
import crypto from "crypto";

export class CryptoService {

    constructor() {
        this.key = "NOT_A_REAL_KEY"; // mock key
    }

    encrypt(payload) {
         const iv = crypto.randomBytes(12);
         const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);
         let enc = cipher.update(JSON.stringify(payload), "utf8", "base64");
         enc += cipher.final("base64");
         const tag = cipher.getAuthTag().toString("base64");
         
         return `${iv}.${enc}.${tag}`;

        return "MOCK_ENCRYPTED_" + Buffer.from(JSON.stringify(payload)).toString("base64");
    }

    decrypt(token) {
         const [iv, enc, tag] = token.split(".");
         const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, Buffer.from(iv,"base64"));
         decipher.setAuthTag(Buffer.from(tag,"base64"));
         let dec = decipher.update(enc,"base64","utf8");
         dec += decipher.final("utf8");
         return JSON.parse(dec);

        const raw = token.replace("MOCK_ENCRYPTED_", "");
        return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    }
}
