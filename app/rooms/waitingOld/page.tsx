'use client';
import { useEffect, useRef, useState } from 'react';
import './page.css';
import { PreJoin } from '@livekit/components-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { generateRoomId } from '@/lib/client-utils';

interface ConnectionInfo {
  clientId: string;
  fullname: string;
}

interface MessageInfo {
  sendId: string;
  content: string;
}

export default function Waiting() {
  const serverUrl = 'ws://localhost:8080';
  const router = useRouter();

  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [clientId, setClientId] = useState<string>('');
  // const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [message, setMessage] = useState<string>('');
  const [recipientId, setRecipientId] = useState('');
  const [fullname, setFullname] = useState('');
  const [disableConnect, setDisableConnect] = useState(false);

  const [isCallToVisible, setIsCallToVisible] = useState(false);
  const [callerId, setCallerId] = useState('');
  const [callerRoomId, setCallerRoomId] = useState('');

  let roomId = '';
  //useEffect(() => {
  const connect = () => {
    // Kết nối đến server WebSocket
    if (!clientId || !fullname) {
      console.log('!clientId || !fullname');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const socket = new WebSocket(serverUrl);
    // setWs(socket);
    wsRef.current = socket;
    socket.onopen = () => {
      console.log('Connected to WebSocket');
      // Đăng ký clientId khi kết nối
      socket.send(JSON.stringify({ type: 'register', clientId, fullname }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'new_connect':
          console.log('new_connect');
          console.log('data: ', data);
          setConnections(data.clientsInfo);
          break;
        case 'chat_message':
          console.log(`Message from ${data.sender}: ${data.message}`);
          setMessages((prev) => [...prev, { sendId: data.sender, content: data.message }]);
          break;

        case 'receive_response_call_request':
          if (data.isAccept) {
            router.push(`/rooms/${data.roomId}`);
          } else {
            alert(`!!! ${data.sender} can't connect now`);
          }
          break;
        case 'receive_call_request':
          setIsCallToVisible(true);
          setCallerId(data.sender);
          setCallerRoomId(data.roomId);
          break;
        default:
          console.error('ko có method nào');
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from WebSocket');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    setDisableConnect(true);

    return () => {
      socket.close();
    };
  };

  const sendMessage = () => {
    if (!recipientId || !message) {
      alert('cần nhập recipientId và message');
      return;
    }
    setMessages((prev) => [...prev, { sendId: 'YOU', content: message }]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat_message',
          clientId,
          recipientId, // ID của người nhận
          message,
        }),
      );
      setMessage('');
    }
  };

  const call = () => {
    roomId = generateRoomId();
    wsRef.current?.send(
      JSON.stringify({
        type: 'send_call_request',
        clientId,
        recipientId, // ID của người nhận
        roomId,
      }),
    );
    alert(`Please wait ${recipientId} accept!`);
  };

  return (
    <div data-lk-theme="default" className="container">
      <div className="login-div">
        <label>Username: </label> &nbsp;
        <input
          type="text"
          placeholder="Enter your ID"
          value={clientId}
          disabled={disableConnect}
          onChange={(e) => setClientId(e.target.value)}
        />
        &nbsp;<label>Full name: </label> &nbsp;
        <input
          type="text"
          placeholder="Recipient ID"
          value={fullname}
          disabled={disableConnect}
          onChange={(e) => setFullname(e.target.value)}
        />
        <button disabled={disableConnect} onClick={connect}>
          Login
        </button>
      </div>
      <h3>Waiting Room</h3>

      <div className="connection-group">
        {connections.map(
          (x) =>
            x.clientId != clientId && (
              <div
                className={
                  x.clientId == recipientId ? 'connection-btn active-recipientId' : 'connection-btn'
                }
                key={x.clientId}
                onClick={() => setRecipientId(x.clientId)}
              >
                {x.fullname}
              </div>
            ),
        )}
      </div>
      <div className="message-container">
        <h3>
          Chat with <span style={{ color: 'red' }}>{recipientId}</span>
        </h3>
        <input
          placeholder="Enter message"
          value={message}
          disabled={!recipientId}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage}>Send Message</button>
        <button onClick={call}>Call</button>
        {isCallToVisible && (
          <div>
            <h3>{callerId} want to call with you</h3>
            <button
              onClick={() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'response_call_request',
                      clientId,
                      roomId: callerRoomId,
                      recipientId: callerId,
                      isAccept: true,
                    }),
                  );
                }

                router.push(`/rooms/${callerRoomId}`);
              }}
            >
              Accept
            </button>
            <button
              onClick={() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'response_call_request',
                      clientId,
                      roomId: callerRoomId,
                      recipientId: callerId,
                      isAccept: false,
                    }),
                  );
                }
                setIsCallToVisible(false);
              }}
            >
              Deny
            </button>
          </div>
        )}

        <div>
          <h2>Messages: </h2>
          <ul>
            {messages.map((msg, index) => (
              <li key={index}>
                {msg.sendId}: {msg.content}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* <PreJoin /> */}
    </div>
  );
}
