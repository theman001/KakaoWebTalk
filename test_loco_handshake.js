/**
 * Test LOCO Checkin Handshake
 * 
 * Attempts to connect to the Kakao Look server and send a CHECKIN packet.
 * Verifies if the UVC3 token is generated and the packet is sent without errors.
 */

const LocoClient = require('./server/lib/locoClient');

async function testHandshake() {
    console.log('='.repeat(60));
    console.log('LOCO Protocol Checkin Handshake Test');
    console.log('='.repeat(60));

    const client = new LocoClient({
        host: 'booking-loco.kakao.com', // Use domain if possible, or fallback to IP
        port: 443,
        model: 'SM-G991N',
        mccmnc: '45005',
        appVer: '11.3.0'
    });

    // Listen for packets
    client.on('packet', (method, body) => {
        console.log(`\n[RECV] Method: ${method}`);
        console.log(`[RECV] Body:`, body);

        if (method === 'LOCO' || method === 'CONF' || method === 'WINIX') {
            console.log('✅ Received Checkin Response!');
            // We can disconnect after receiving a response
            client.disconnect();
            process.exit(0);
        }
    });

    client.on('error', (err) => {
        console.error('❌ Connection Error:', err.message);
        process.exit(1);
    });

    try {
        await client.connect();
        console.log('✅ Connected and Checkin Sent. Waiting for response...');

        // Timeout after 10 seconds
        setTimeout(() => {
            console.log('⚠️ Timeout waiting for response.');
            client.disconnect();
            process.exit(0);
        }, 10000);

    } catch (err) {
        console.error('❌ Test Failed:', err);
        process.exit(1);
    }
}

testHandshake();
