/*
 * 参考にしたWebサイト
 * https://coosy.co.jp/blog/docker-react/
 * https://www.php.cn/ja/faq/614495.html
 */
import React, { useEffect, useState, useRef } from "react";
import { Button, TextInput, Group, Stack, Box } from "@mantine/core";

type MessageType = {
  content: {
    message: string;
    handleName: string;
  }
};

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [inputHandleName, setInputHandleName] = useState<string>("");
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:8000");
    ws.current = websocket;

    const onOpen = () => {
      console.log("WebSocket接続完了");
    };
    websocket.addEventListener('open', onOpen);

    const onMessage = (event: MessageEvent) => {
      const message: MessageType = JSON.parse(event.data);
      console.log("received message: " + message.content);
      setMessages((prevMessages) => [...prevMessages, message]);
    };
    websocket.addEventListener('message', onMessage);

    return () => {
      websocket?.close();
      websocket.removeEventListener('open', onOpen);
      websocket.removeEventListener('message', onMessage);
    };
  }, []);

  const sendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log("sended message: " + inputMessage);
      ws.current.send(JSON.stringify({ content: { message: inputMessage, handleName: inputHandleName } }));
      setInputMessage("");
    } else {
      console.warn("WebSocketが接続されていません");
    }
  };

  return (
    <Box
      my={30}
      mx={30}
    >
      <Stack>
        {messages.map((message, index) => (
          <Box
            key={index}
          >
            { message.content.handleName + ": " + message.content.message }
          </Box>
        ))}
      </Stack>
      <Stack
        gap="xs"
      >
        <TextInput
          w={120}
          size="xs"
          radius="xl"
          label="ハンドルネーム"
          value={inputHandleName}
          onChange={(event) => setInputHandleName(event.target.value)}
        />
        <Group
          align="end"
        >
          <TextInput
            radius="xl"
            label="メッセージ"
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
          />
          <Button
            variant="filled"
            radius="xl"
            onClick={sendMessage}
          >
            送信
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

export default ChatBox;
