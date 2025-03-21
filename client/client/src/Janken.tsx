/*
 * 参考にしたWebサイト
 * https://coosy.co.jp/blog/docker-react/
 * https://www.php.cn/ja/faq/614495.html
 */
import React, { useEffect, useState, useRef } from "react";
import { Text, Button, TextInput, Paper, Group, Stack, Box } from "@mantine/core";

type MessageType = {
  message: string;
  content: any;
};

const Janken: React.FC = () => {
  const storedUUID = localStorage.getItem("uuid");
  const UUID = storedUUID || crypto.randomUUID();
  const ws = useRef<WebSocket | null>(null);
  const [inputHandleName, setInputHandleName] = useState<string>("");

  if(!storedUUID) {
    localStorage.setItem("uuid", UUID);
  }

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:8000");
    ws.current = websocket;

    const onOpen = () => {
      websocket.send(JSON.stringify({ message: "auth", content: { uuid: UUID } }));
      console.log(`WebSocket接続完了(uuid: ${UUID})`);
    };
    websocket.addEventListener('open', onOpen);

    const onMessage = (event: MessageEvent) => {
      const message: MessageType = JSON.parse(event.data);
      console.log("received message: " + JSON.stringify(message));
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

    } else {
      console.warn("WebSocketが接続されていません");
    }
  };

  return (
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
  );
};

export default Janken;
