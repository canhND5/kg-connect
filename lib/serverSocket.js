const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Map(); // Lưu trữ clientId và WebSocket tương ứng
const clientsInfo = new Map(); // Lưu trữ clientId và WebSocket tương ứng

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Đăng ký client khi kết nối
  ws.on('message', (data) => {
    const parsedData = JSON.parse(data);
    // const { type, clientId, fullname, recipientId, message, roomId } =
    //   parsedData;

    const { type, clientId, ...restData } = parsedData;

    console.log('parsedData.type: ', parsedData.type);
    console.log('parsedData.clientId: ', parsedData.clientId);

    if (type === 'register') {
      const { fullname } = restData;
      // Lưu clientId khi đăng ký
      clients.set(clientId, ws);
      clientsInfo.set(clientId, fullname);
      console.log(`Client registered: ${clientId}`);
      clients.forEach((ws) =>
        ws.send(
          JSON.stringify({
            type: 'new_connect',
            clientsInfo: Array.from(clientsInfo, ([clientId, fullname]) => ({
              clientId,
              fullname,
            })),
          }),
        ),
      );
    } else if (type === 'chat_message') {
      const { message, recipientId } = restData;

      // Gửi tin nhắn đến người nhận
      const recipientSocket = clients.get(recipientId);
      if (recipientSocket) {
        recipientSocket.send(
          JSON.stringify({
            type: 'chat_message',
            sender: clientId,
            message,
          }),
        );
      } else {
        console.log(`Recipient ${recipientId} not connected`);
      }
    } else if (type === 'send_call_request') {
      const { roomId, recipientId } = restData;

      // Gửi call_request đến người nhận
      const recipientSocket = clients.get(recipientId);
      if (recipientSocket) {
        recipientSocket.send(
          JSON.stringify({
            type: 'receive_call_request',
            sender: clientId,
            roomId,
          }),
        );
      } else {
        console.log(`Recipient ${recipientId} not connected`);
      }
    } else if (type === 'response_call_request') {
      const { recipientId, roomId, isAccept } = restData;

      // Gửi phản hồi cuộc gọi đến người nhận
      const recipientSocket = clients.get(recipientId);
      if (recipientSocket) {
        recipientSocket.send(
          JSON.stringify({
            type: 'receive_response_call_request',
            sender: clientId,
            roomId,
            isAccept,
          }),
        );
      } else {
        console.log(`Recipient ${recipientId} not connected`);
      }
    }
  });

  ws.on('close', () => {
    // Xóa client khi ngắt kết nối
    for (const [key, value] of clients.entries()) {
      if (value === ws) {
        clients.delete(key);
        clientsInfo.delete(key);
        console.log(`Client disconnected: ${key}`);
      }
    }
  });
});

console.log('WebSocket server running on ws://localhost:8080');

/* {
  "name": "websocket-chat",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "ws": "^8.18.0"
  }
}

*/
