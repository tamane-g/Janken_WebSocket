/*
 * 参考にしたWebサイト
 * https://coosy.co.jp/blog/docker-react/
 * https://www.php.cn/ja/faq/614495.html
 */
import React, { useEffect, useState, useRef } from "react";

type MessageType = {
  content: string;
};

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
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
      console.log("sended message: " + inputValue);
      ws.current.send(JSON.stringify({ content: inputValue }));
      setInputValue("");
    } else {
      console.warn("WebSocketが接続されていません");
    }
  };

  return (
    <div>
      <div>
        {messages.map((message, index) => (
          <p key={index}>{"Jane Doe: " + message.content}</p>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
      />
      <button onClick={sendMessage}>送信</button>
    </div>
  );
};

export default ChatBox;
