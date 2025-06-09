/*
 * 参考にしたWebサイト
 * https://coosy.co.jp/blog/docker-react/
 * https://www.php.cn/ja/faq/614495.html
 */
import React, { useEffect, useState, useRef } from "react";
import {
  Stack,
  Group,
  Text,
  Image,
  Button,
  TextInput,
  ActionIcon,
  Loader,
} from "@mantine/core";

type MessageType = {
  message: string;
  content: any;
};

const Janken: React.FC = () => {
  const storedUUID = localStorage.getItem("uuid");
  const ws = useRef<WebSocket | null>(null);
  const [UUID, setUUID] = useState<string>("");
  const [hand, setHand] = useState<string>("");
  const [state, setState] = useState<string>("stand-by");
  const [result, setResult] = useState<string>("");
  const [opponent, setOpponent] = useState<string>("");
  const [gameUUID, setGameUUID] = useState<string>("");
  const [drawFlag, setDrawFlag] = useState<boolean>(false);
  const [inputHandleName, setInputHandleName] = useState<string>("");

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:8000");
    ws.current = websocket;

    const onOpen = () => {
      console.log(`WebSocket接続完了`);

      if(!storedUUID) {
        console.log("not found UUID. request the server to issue an ID.");
        websocket.send(JSON.stringify({ message: "reqUUID" }));
      } else {
        console.log("found UUID: " + storedUUID);
        websocket.send(JSON.stringify({ message: "authUUID", content: { uuid: storedUUID }}));
      }
    };
    websocket.addEventListener('open', onOpen);

    const onMessage = (event: MessageEvent) => {
      const message: MessageType = JSON.parse(event.data);
      console.log("received message: " + JSON.stringify(message));

      switch(message.message) {
        case "result":
          setState("result");
          setResult(message.content.result);
          console.log(result);
          break;
        
        case "assignUUID":
          console.log("assigned UUID: " + message.content.uuid);
          setUUID(message.content.uuid);
          setState("stand-by");
          localStorage.setItem("uuid", message.content.uuid);
          break;

        case "matched":
          setState("in-game");
          setOpponent(message.content.opponent);
          setGameUUID(message.content.gameUUID);
          break;
      }
    };
    websocket.addEventListener('message', onMessage);

    return () => {
      websocket?.close();
      websocket.removeEventListener('open', onOpen);
      websocket.removeEventListener('message', onMessage);
      console.log("connection closed");
    };
  }, []);

  useEffect(() => {
    if (result === "draw") {
      setDrawFlag(true);
      setState("in-game");
    }
  }, [result]);
  
  const joinMatchMaking = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = {
        message: "join-match-making",
        content: {
          uuid: UUID,
          name: inputHandleName
      }}
      ws.current.send(JSON.stringify(message));
      setState("in-queue");
    } else {
      console.warn("WebSocketが接続されていません");
    }
  };
  
  const throwHand = (hand: string) => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN)) {
      const message = {
        message: "throw-hand",
        content: {
          uuid: UUID,
          hand: hand,
          gameUUID: gameUUID
      }}
      ws.current.send(JSON.stringify(message));
      setState("wait-opponent");
      setHand(hand);
    } else {
      console.warn("WebSocketが接続されていません");
    }
  }

  switch(state) {
    case "stand-by":
      return (
        <>
          <Stack
            my={30}
            mx={30}
          >
            <TextInput
              w={240}
              radius="xl"
              label="プレイヤーネーム"
              value={inputHandleName}
              onChange={(event) => setInputHandleName(event.target.value)}
            />
            <Button
              w={120}
              variant="filled"
              radius="xl"
              onClick={joinMatchMaking}
            >
              マッチ開始
            </Button>
          </Stack>
        </>
      );

    case "in-queue":
      return (
        <>
          <Group
            mx="md"
            my="xs">
            <Loader color="blue" type="dots" />
            <Text>マッチング中…</Text>
          </Group>
        </>
      );

    case "in-game":
      return (
        <>
          <Text>あなた：{inputHandleName}</Text>
          <Text>相手：{opponent}</Text>
          <br/>
          <Text>{drawFlag ? "あいこで…" : "じゃんけん…"}</Text>
          <ActionIcon
            variant="transparent"
            onClick={() => throwHand("gu")}>
            <Image src="./images/janken_gu.png"/>
          </ActionIcon>
          
          <ActionIcon
            variant="transparent"
            onClick={() => throwHand("choki")}>
            <Image src="./images/janken_choki.png"/>
          </ActionIcon>
          
          <ActionIcon
            variant="transparent"
            onClick={() => throwHand("pa")}>
            <Image src="./images/janken_pa.png"/>
          </ActionIcon>
        </>
      );
    
    case "wait-opponent":
      return (
        <Group
          mx="md"
          my="xs">
          <Loader color="blue" type="dots" />
          <Text>相手を待っています</Text>
          <Image src={
            (() => {
              switch(hand) {
                case "gu":
                  return "./images/janken_gu.png";
                case "choki":
                  return "./images/janken_choki.png";
                case "pa":
                  return "./images/janken_pa.png";
              }
            })()
          }/>
        </Group>
      );

    case "result":
      return (
        <Stack>
          <Text>
            { result === "win"  ? "勝ち" :
              result === "lose" ? "負け" : "あいこ" }
          </Text>
        
          <Button
            w={120}
            variant="filled"
            radius="xl"
            onClick={() => setState("stand-by")}
          >
            戻る
          </Button>
        </Stack>
      );
      
    default:
      return (
        <>
          <Text>
            404 Not Found
          </Text>
        </>
      );
  }
};

export default Janken;
