import { WebSocket, WebSocketServer } from "ws";

const port = 8000; // サーバーのポート番号
const server = new WebSocketServer({ port });
const clients = new Set<WebSocket>(); // 接続中のクライアントを格納するSet

type MessageType = {
  handleName: string;
  message:    string;
};

console.log(`WebSocket Server is running on port ${port}`);

server.on("connection", (ws: WebSocket) => {
  console.log("Client has connected");
  clients.add(ws); // クライアントを追加
  console.log("Client: ", ws);

  ws.on("message", (message: MessageType) => {
    console.log("Received message => ", {message});
    // すべてのクライアントにメッセージをブロードキャスト
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`${message}`);
      }
    });
  });

  ws.on("close", () => {
    console.log("Client has disconnected");
    clients.delete(ws); // クライアントを削除
  });
});