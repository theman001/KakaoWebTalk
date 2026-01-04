// security/fingerprint.js
import crypto from "crypto";

export function buildDeviceFingerprint(deviceInfo) {
     const seed = `${deviceInfo.model}|${deviceInfo.os}|${deviceInfo.ram}`;
     const fp = crypto.createHash("sha256").update(seed).digest("hex");
     return fp;
}
