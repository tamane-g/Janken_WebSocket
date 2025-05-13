/*
 * 参考にしたWebサイト
 * https://coosy.co.jp/blog/docker-react/
 * https://www.php.cn/ja/faq/614495.html
 */
import React, { useEffect, useState, useRef } from "react";
import { Text, Button, TextInput, Stack, ActionIcon, Image } from "@mantine/core";

type MessageType = {
  message: string;
  content: any;
};

const Janken: React.FC = () => {
  const storedUUID = localStorage.getItem("uuid");
  const ws = useRef<WebSocket | null>(null);
  const [UUID, setUUID] = useState<string>("");
  const [state, setState] = useState<string>("stand-by");
  const [opponent, setOpponent] = useState<string>("");
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
        case "assignUUID":
          console.log("assigned UUID: " + message.content.uuid);
          setUUID(message.content.uuid);
          localStorage.setItem("uuid", message.content.uuid);
          break;

        case "matched":
          setState("in-game");
          setOpponent(message.content.opponent);
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
          <Text>
            マッチング中…
          </Text>
        </>
      );

    case "in-game":
      return (
        <>
          {opponent}
          <ActionIcon variant="transparent">
            <Image src="./images/janken_gu.png"/>
          </ActionIcon>
          <ActionIcon variant="transparent">
            <Image src="./images/janken_choki.png"/>
          </ActionIcon>
          <ActionIcon variant="transparent">
            <Image src="./images/janken_pa.png"/>
          </ActionIcon>
        </>
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
