/* 参考にしたサイト
https://qiita.com/coret/items/59ccfa7457f8491b6b35
*/
import { WebSocket, WebSocketServer } from "ws";
import Redis from "ioredis";
import { randomUUID } from 'crypto';
import { flattenDiagnosticMessageText } from "typescript";

type Player = {
  client: WebSocket;
  state: string;
  name?: string;
  gameInfo: {
    gameUUID?: string;
    hand?: string;
  };
};

type Game = {
  player1: {
    uuid: string;
    hand?: string;
  }
  player2: {
    uuid: string;
    hand?: string;
  }
};

const redis       = new Redis({ host: "redis", port: 6379 });
const redisSub    = new Redis({ host: "redis", port: 6379 });
const server      = new WebSocketServer({ port: 8000 });

const clients     = new Set<WebSocket>();
const playersUUID = new Map<string, Player>();
const gamesUUID   = new Map<string, Game>();

function updatePlayer(uuid: string, state?: string, name?: string, gameId?: string, hand?: string) {
  const player = playersUUID.get(uuid);

  if(player) {
    if(state)  { player.state = state }
    if(name)   { player.name = name }
    if(gameId) { player.gameInfo.gameUUID = gameId }
    if(hand)   { player.gameInfo.hand = hand }
    playersUUID.set(uuid, player);

    return true;
  }
  return false;
}

function assignNewUUID(ws: WebSocket, name?: string) {
  const player: Player = {
    client: ws,
    state: "stand-by",
    name: name,
    gameInfo: {}
  }
  const uuid = randomUUID();
  playersUUID.set(uuid, player);
  ws.send(JSON.stringify({ message: "assignUUID", content: { uuid: uuid }}));
  console.log(`Assigned new UUID(${uuid}).`);
}

function makeNewGame(gameUUID: string, player1UUID: string, player2UUID: string) {
  const game: Game = {
    player1: {
      uuid: player1UUID
    },
    player2: {
      uuid: player2UUID
  }}
  gamesUUID.set(gameUUID, game);
}

function throwHand(gameUUID: string, playerUUID: string, hand: string) {
  const game = gamesUUID.get(gameUUID);
  
  if(game) {
    if(game.player1.uuid == playerUUID) {
      game.player1.hand = hand;
    } else if(game.player2.uuid == playerUUID) {
      game.player2.hand = hand;
    } else {
      console.log("Unknown UUID");
    }
    if(game.player1.hand && game.player2.hand) {
      const result = judge(game);
      
      updatePlayer(game.player1.uuid, "stand-by","","","");
      updatePlayer(game.player2.uuid, "stand-by","","","");
      
      const player1 = playersUUID.get(game.player1.uuid);
      const player2 = playersUUID.get(game.player2.uuid);
      if(player1?.client && player2?.client) {
        player1.client.send(JSON.stringify({ message: "result", content: {
          result: (() => {
            switch(result) {
              case "p1_win":
                return "win";
              case "p2_win":
                return "lose";
              case "draw":
                return "draw";
            }
          })()
        }}));
        
        player2.client.send(JSON.stringify({ message: "result", content: {
          result: (() => {
            switch(result) {
              case "p1_win":
                return "lose";
              case "p2_win":
                return "win";
              case "draw":
                return "draw";
            }
          })()
        }}));
      }
      
      if(result != "draw") {
        gamesUUID.delete(gameUUID);
      }
    }
  } else {
    console.log("Game not found");
  }
}

function judge(game: Game) {
  if(game.player1.hand == game.player2.hand) {
    console.log("draw");
    return "draw"
  }
  
  else if((game.player1.hand == "gu"    && game.player2.hand == "choki")  ||
          (game.player1.hand == "choki" && game.player2.hand == "pa")     ||
          (game.player1.hand == "pa"    && game.player2.hand == "gu")) {
    console.log("player1 win");
    return "p1_win";
  }
  
  else {
    console.log("player2 win");
    return "p2_win"
  }
}

console.log(`WebSocket Server is running on port 8000`);

redisSub.subscribe("match-notification");
redisSub.on("message", (channel, message) => {
  console.log(`Publish received from ${channel}: ${message}`);
  if(channel === "match-notification") {
    const data = JSON.parse(message);
    const gameUUID = data?.gameUUID;
    const player1UUID = data?.player1;
    const player2UUID = data?.player2;
    const player1 = playersUUID.get(player1UUID);
    const player2 = playersUUID.get(player2UUID);
    const player1name = player1?.name || "NoName";
    const player2name = player2?.name || "NoName";

    if(player1?.client && player2?.client) {
      player1.client.send(JSON.stringify({ message: "matched", content: { opponent: player2name, gameUUID: gameUUID }}));
      player2.client.send(JSON.stringify({ message: "matched", content: { opponent: player1name, gameUUID: gameUUID }}));
      
      updatePlayer(player1UUID, "in-game");
      updatePlayer(player2UUID, "in-game");
      
      makeNewGame(gameUUID, player1UUID, player2UUID);
      
      console.log(`Matched: ${player1name} vs ${player2name}`);
    } else {
      console.log("Clients not found")
    }
  }
});

server.on("connection", (ws: WebSocket) => {
  console.log("Client has connected");
  clients.add(ws);

  ws.on("message", async (rawData) => {
    const data = JSON.parse(rawData.toString());
    console.log("Received data => ", data);
    
    switch(data.message) {
      case "reqUUID":
        console.log("Client requested to assign new UUID.")
        assignNewUUID(ws, data.content?.name);
        break;

      case "authUUID":
        console.log(`Client requested to authenticate UUID(${data.content?.uuid}).`);
        if(data.content?.uuid) {
          if(playersUUID.has(data.content.uuid)){
            console.log("Authentication succeed.");
            updatePlayer(data.content.uuid, "stand-by");
            ws.send(JSON.stringify({ message: "assignUUID", content: { uuid: data.content.uuid }}));
          } else {
            assignNewUUID(ws, data.content?.name);
          }
        } else {
          assignNewUUID(ws, data.content?.name);
        }
        break;
      
      case "join-match-making":
        if(ws === playersUUID.get(data.content?.uuid)?.client) {
          if(playersUUID.get(data.content.uuid)?.state === "stand-by") {
            console.log("Joined match making");
            updatePlayer(data.content.uuid, "in-queue", data.content?.name);
            await redis.lpush("matchMaking-queue", data.content.uuid);
          } else {
            console.log("Client isn't stand-by");
          }
        } else {
          assignNewUUID(ws, data.content?.name);
        }
        break;
        
      case "throw-hand":
        if(ws === playersUUID.get(data.content?.uuid)?.client) {
          if(playersUUID.get(data.content.uuid)?.state === "in-game") {
            updatePlayer(data.content.uuid, "wait-result", data.content?.name);
            throwHand(data.content.gameUUID, data.content.uuid, data.content.hand);
          } else {
            console.log("Client isn't in-game");
          }
        } else {
          console.log("Authentication failed");
        }
    }
  });

  ws.on("close", () => {
    console.log("Client has disconnected");
    clients.delete(ws); // クライアントを削除
  });
});