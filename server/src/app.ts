/* 参考にしたサイト
https://qiita.com/coret/items/59ccfa7457f8491b6b35
*/
import { WebSocket, WebSocketServer } from "ws";

const port = 8000; // サーバーのポート番号
const server = new WebSocketServer({ port });
const clients = new Set<WebSocket>(); // 接続中のクライアントを格納するSet
const clientsUUID = new Map<WebSocket, String>();

console.log(`WebSocket Server is running on port ${port}`);

server.on("connection", (ws: WebSocket) => {
  console.log("Client has connected");
  clients.add(ws); // クライアントを追加

  ws.on("message", (rawData) => {
    const data = JSON.parse(rawData.toString());
    console.log("Received data => ", data);
    
    switch(data.message) {
      case "auth":
        if(data.content?.uuid) {
          console.log("client authenticated")
          clientsUUID.set(ws, data.content.uuid);
        }
        
        break;
      
      case "start-matching":
        if(data.content?.uuid === clientsUUID.get(ws)) {
          console.log("matching start");
        } else {
          console.log("matching authentication failed");
        }

        break;
    }
  });

  ws.on("close", () => {
    console.log("Client has disconnected");
    clients.delete(ws); // クライアントを削除
  });
});