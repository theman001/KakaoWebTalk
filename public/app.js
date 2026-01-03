const socket = io();

// 1. 페이지 로드 시 세션 복구 시도
const sessionId = localStorage.getItem("web_kakao_sid");
if (sessionId) {
    socket.emit("auth:restore", sessionId);
}

// 2. 메시지 수신 리스너
socket.on("chat:receive", (data) => {
    const chatBox = document.getElementById("messages");
    chatBox.innerHTML += `<div><b>${data.sender}:</b> ${data.message}</div>`;
});

// 3. 메시지 전송 함수
function sendMessage() {
    const msgInput = document.getElementById("msgInput");
    const chatId = document.getElementById("currentChatId").value;
    
    socket.emit("chat:send", {
        chatId: chatId,
        message: msgInput.value
    });
    msgInput.value = "";
}

// 인증 실패 시 로그인 페이지로 이동
socket.on("auth:required", () => {
    window.location.href = "/login.html";
});
