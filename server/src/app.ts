/* 参考にしたサイト
https://qiita.com/coret/items/59ccfa7457f8491b6b35
*/
import { WebSocket, WebSocketServer } from "ws";
import Redis from "ioredis";
import { randomUUID } from 'crypto';

type Player = {
  client: WebSocket;
  state: string;
  name?: string;
};

const redis       = new Redis({ host: "redis", port: 6379 });
const redisSub    = new Redis({ host: "redis", port: 6379 });
const server      = new WebSocketServer({ port: 8000 });

const clients     = new Set<WebSocket>(); // 接続中のクライアントを格納するSet
const playersUUID = new Map<string, Player>();

function updatePlayer(uuid: string, state: string, name?: string) {
  const player = playersUUID.get(uuid);

  if(player) {
    if(state) { player.state = state }
    if(name)  { player.name = name }
    playersUUID.set(uuid, player);

    return true;
  } else { return false }
}

function assignNewUUID(ws: WebSocket, name?: string) {
  const player: Player = {
    client: ws,
    state: "stand-by",
    name: name
  }
  const uuid = randomUUID();
  playersUUID.set(uuid, player);
  ws.send(JSON.stringify({ message: "assignUUID", content: { uuid: uuid }}));
}

console.log(`WebSocket Server is running on port 8000`);

redisSub.subscribe("match-notification");
redisSub.on("message", (channel, message) => {
  console.log(`Publish received from ${channel}: ${message}`);
  if(channel === "match-notification") {
    const data = JSON.parse(message);
    const player1UUID = data?.player1;
    const player2UUID = data?.player2;
    const player1 = playersUUID.get(player1UUID);
    const player2 = playersUUID.get(player2UUID);
    const player1name = player1?.name || "NoName";
    const player2name = player2?.name || "NoName";

    if(player1?.client && player2?.client) {
      player1.client.send(JSON.stringify({ message: "matched", content: { opponent: player2name }}));
      player2.client.send(JSON.stringify({ message: "matched", content: { opponent: player1name }}));
      
      updatePlayer(player1UUID, "in-game");
      updatePlayer(player2UUID, "in-game");
      console.log(`Matched: ${player1name} vs ${player2name}`);
    }
  }
});

server.on("connection", (ws: WebSocket) => {
  console.log("Client has connected");
  clients.add(ws); // クライアントを追加

  ws.on("message", async (rawData) => {
    const data = JSON.parse(rawData.toString());
    console.log("Received data => ", data);
    
    switch(data.message) {
      case "reqUUID":
        console.log("Client requested UUID")
        assignNewUUID(ws, data.content?.name);
        break;

      case "authUUID":
        console.log(`Client requested to authenticate UUID(${data.content?.uuid})`);
        if(data.content?.uuid) {
          if(playersUUID.has(data.content.uuid)){
            ws.send(JSON.stringify({ message: "assignUUID", content: { uuid: data.content.uuid }}));
            break;
        }}
        assignNewUUID(ws, data.content?.name);
        break;
      
      case "join-match-making":
        if(ws === playersUUID.get(data.content?.uuid)?.client) {
          if(playersUUID.get(data.content.uuid)?.state === "stand-by") {
            console.log("Joined match making");
            updatePlayer(data.content.uuid, "in-queue", data.content?.name);
            await redis.lpush("matchMaking-queue", data.content.uuid);
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