/**
 * LOCO Protocol Packet Structures
 * Based on reverse engineering of KakaoTalk Android Client
 */

const LocoPacketStructs = {
    /**
     * CHECKIN Packet (Mobile)
     * Sent when the app starts to register/check-in with the booking server.
     */
    Checkin: {
        method: 'CHECKIN',
        types: {
            userId: 'long',
            os: 'string', // 'android'
            netType: 'int', // 0: WIFI, 1: 3G, 2: LTE...
            appVer: 'string', // '11.3.0'
            mccmnc: 'string',
            lang: 'string', // 'ko'
            countryIso: 'string', // 'KR'
            uvc3: 'string', // Encrypted Hardware Info (TalkHello + AES-128)
            // ... add other necessary fields
        }
    },

    /**
     * LOGINLIST Packet
     * Standard Login Packet
     */
    LoginList: {
        method: 'LOGINLIST',
        types: {
            appVer: 'string',
            prtVer: 'string', // Protocol Version
            os: 'string',
            lang: 'string',
            oauthToken: 'string', // if using OAuth
            encData: 'string', // Encrypted password/auth data
            uuid: 'string',
            // ...
        }
    },
    
    /**
     * BUYCS (Buy Call Server)
     * Request to get a chat server address
     */
    BuyCS: {
        method: 'BUYCS',
        types: {
            chatId: 'long',
            // ...
        }
    }
};

module.exports = LocoPacketStructs;
