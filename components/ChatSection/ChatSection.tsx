import React, { useState } from "react";
import { Input, List } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import style from "./ChatSection.module.css";

const { TextArea } = Input;

interface MessageInfo {
  from: string;
  to: string;
  content: string;
}
interface ChatSectionProps {
  open: boolean;
  sendTo: string;
  onclose: () => void;
}
const ChatSection = ({ open, sendTo, onclose }: ChatSectionProps) => {
  const [messages, setMessages] = useState<MessageInfo[]>([
    { content: "hello bạn", from: "user_1", to: "user_2" },
    { content: "helll nhé", from: "user_2", to: "user_1" },
  ]);
  const [input, setInput] = useState("");

  const handleSendMessage = () => {
    if (input.trim()) {
      setMessages([
        ...messages,
        {
          content: input,
          from: localStorage.getItem("username") ?? "NoName",
          to: "ABC",
        },
      ]);
      setInput("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Ngăn ngừa hành động mặc định (chẳng hạn như tạo dòng mới)
      handleSendMessage();
    }
  };

  if (!open) {
    return <></>;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "15px",
        right: "20%",
        maxWidth: "400px",
        minWidth: "300px",
        margin: "0 auto",
        // padding: "10px",
        border: "solid 3px #ccc",
        borderRadius: "15px",
      }}
    >
      <div
        style={{
          backgroundColor: "blueviolet",
          padding: "3px",
          borderRadius: "12px 12px 0 0",
        }}
      >
        <strong>Send to: {sendTo}</strong>
        <span className={style.closeIcon} onClick={onclose}>
          <CloseCircleOutlined />
        </span>
      </div>
      <div
        style={{
          height: "300px",
          overflowY: "auto",
          padding: "0 5px",
          marginBottom: "20px",
        }}
      >
        <List
          dataSource={messages}
          renderItem={(message, index) => (
            <List.Item style={{ padding: "5px" }} key={index}>
              <div
                style={{
                  width: "100%",
                  marginBottom: "2px",
                  display: "flex",
                  justifyContent:
                    localStorage.getItem("username") == message.from
                      ? "flex-end"
                      : "flex-start",
                }}
              >
                <span
                  style={{
                    padding: "5px",
                    backgroundColor:
                      localStorage.getItem("username") == message.from
                        ? "white"
                        : "#AABBCC",

                    borderRadius: "5px",
                  }}
                >
                  {message.content}
                </span>
              </div>
            </List.Item>
          )}
        />
      </div>
      <TextArea
        rows={3}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default ChatSection;
