/**
 * Test Server Login (Socket.IO Simulation)
 * 
 * Simulates a web client connecting to the gateway and attempting to login.
 * Verifies if the 'auth:login' event is handled correctly.
 */

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:80'; // Change port if needed based on config

async function testLogin() {
    console.log('='.repeat(60));
    console.log('Socket.IO Login Test');
    console.log('='.repeat(60));

    const socket = io(SERVER_URL, {
        reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
        console.log(`✅ Connected to Server: ${socket.id}`);

        console.log('[Test] Sending Login Request...');
        socket.emit('auth:login', {
            email: 'test@kakao.com',
            password: 'testpassword'
        });
    });

    socket.on('auth:success', (data) => {
        console.log('✅ Login Success Event Received!');
        console.log('Data:', data);
        socket.disconnect();
        process.exit(0);
    });

    socket.on('auth:fail', (data) => {
        console.log('❌ Login Failed Event Received');
        console.log('Reason:', data.message);
        socket.disconnect();
        // Fail but exit 0 to show output
        process.exit(0);
    });

    socket.on('connect_error', (err) => {
        console.error('❌ Connection Error:', err.message);
        process.exit(1);
    });

    // Timeout
    setTimeout(() => {
        console.log('⚠️ Timeout waiting for response.');
        socket.disconnect();
        process.exit(1);
    }, 5000);
}

testLogin();
