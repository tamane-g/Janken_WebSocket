/* 参考にしたサイト
https://qiita.com/coret/items/59ccfa7457f8491b6b35
*/
import { WebSocket, WebSocketServer } from "ws";
import Redis from "ioredis";

type Player = {
  client: WebSocket;
  state: string;
};

const redis       = new Redis({ host: "redis", port: 6379 });
const server      = new WebSocketServer({ port: 8000 });

const clients     = new Set<WebSocket>(); // 接続中のクライアントを格納するSet
const playersUUID = new Map<string, Player>();

function updatePlayerState(uuid: string, state: string) {
  const player = playersUUID.get(uuid);

  if(player) {
    player.state = state; 
    playersUUID.set(uuid, player);

    return true;
  } else { return false }
}

console.log(`WebSocket Server is running on port 8000`);

server.on("connection", (ws: WebSocket) => {
  console.log("Client has connected");
  clients.add(ws); // クライアントを追加

  ws.on("message", async (rawData) => {
    const data = JSON.parse(rawData.toString());
    console.log("Received data => ", data);
    
    switch(data.message) {
      case "auth":
        if(data.content?.uuid) {
          console.log("Client authenticated")
          const player: Player = {
            client: ws,
            state: "stand-by"
          }
          playersUUID.set(data.content.uuid, player);
        }
        
        break;
      
      case "join-match-making":
        if(ws === playersUUID.get(data.content?.uuid)?.client) {
          if(playersUUID.get(data.content.uuid)?.state === "stand-by") {
            console.log("Joined match making");
            updatePlayerState(data.content.uuid, "in-queue");
            await redis.lpush("matchMaking-queue", JSON.stringify({ id: data.content.uuid }));
          } else {
            console.log("Already joined");
          }
        } else {
          console.log("Authentication failed");
        }

        break;
    }
  });

  ws.on("close", () => {
    console.log("Client has disconnected");
    clients.delete(ws); // クライアントを削除
  });
});