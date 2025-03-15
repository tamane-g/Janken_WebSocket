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
  const [messages, setMessages] = useState<MessageType[]>([]);
  const storedUUID = localStorage.getItem("uuid");
  const UUID = storedUUID || crypto.randomUUID();
  const ws = useRef<WebSocket | null>(null);

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
      setMessages((prevMessages) => [...prevMessages, message]);
    };
    websocket.addEventListener('message', onMessage);

    return () => {
      websocket?.close();
      websocket.removeEventListener('open', onOpen);
      websocket.removeEventListener('message', onMessage);
      console.log("connection closed");
    };
  }, []);

  const startMatching = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = {
        message: "start-matching",
        content: {
          uuid: UUID,
      }}
      ws.current.send(JSON.stringify(message));

    } else {
      console.warn("WebSocketが接続されていません");
    }
  };

  return (
    <Box
      my={30}
      mx={30}
    >
      <Stack
        my="md"
      >
        {messages.map((message, index) => (
          <Paper
            key={index}
            shadow="xs"
            p="md"
          >
            <Stack
              gap="xs"
              ml={6}
            >
              <Text
                m={-5}
              >
                { message.content.message }
              </Text>
            </Stack>
          </Paper>
        ))}
      </Stack>
      <Button
        variant="filled"
        radius="xl"
        onClick={startMatching}
      >
        マッチ開始
      </Button>
    </Box>
  );
};

export default Janken;
