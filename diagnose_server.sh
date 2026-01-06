#!/bin/bash

OUTPUT_FILE="server_debug_report.txt"

echo "=== [1] System Info ===" > $OUTPUT_FILE
uname -a >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "=== [2] Node & Process Check ===" >> $OUTPUT_FILE
node -v >> $OUTPUT_FILE
ps aux | grep node >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "=== [3] Network Port Check (Port 80/443) ===" >> $OUTPUT_FILE
sudo netstat -tulpn | grep -E ':(80|443)' >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "=== [4] File System Check (Public Directory) ===" >> $OUTPUT_FILE
ls -lR public >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "=== [5] Local Curl Test (Response Headers) ===" >> $OUTPUT_FILE
echo "--- /login ---" >> $OUTPUT_FILE
curl -I -v http://localhost/login >> $OUTPUT_FILE 2>&1
echo "--- /app.js ---" >> $OUTPUT_FILE
curl -I -v http://localhost/app.js >> $OUTPUT_FILE 2>&1
echo "--- /js/socket.io.js ---" >> $OUTPUT_FILE
curl -I -v http://localhost/js/socket.io.js >> $OUTPUT_FILE 2>&1
echo "" >> $OUTPUT_FILE

echo "=== [6] Verify Middleware Logic (index.js grep) ===" >> $OUTPUT_FILE
grep -A 20 "sessionMiddleware" server/index.js >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "=== [7] Recent Service Logs (Journalctl) ===" >> $OUTPUT_FILE
sudo journalctl -u kakaoweb.service -n 100 --no-pager >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "Diagnosis Complete. Report saved to $OUTPUT_FILE"
