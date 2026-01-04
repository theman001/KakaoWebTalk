// public/app.js
const socket = io();

document.getElementById('loginBtn').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("이메일과 비밀번호를 모두 입력해주세요.");
        return;
    }

    console.log("[Socket] 로그인 요청 전송...");
    // 규격 변경: login_request -> auth:login
    socket.emit('auth:login', {
        email: email,
        password: password
    });
});

// 규격 변경: login_response -> auth:success
socket.on('auth:success', (data) => {
    console.log("[Socket] 로그인 성공");
    localStorage.setItem('kakao_session', data.sessionId);
    window.location.href = '/chat'; // Clean URI 적용
});

socket.on('auth:fail', (data) => {
    alert("로그인 실패: " + data.message);
});
