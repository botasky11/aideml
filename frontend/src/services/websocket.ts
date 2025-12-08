import type { WebSocketMessage } from '@/types';

type MessageHandler = (message: WebSocketMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Set<MessageHandler> = new Set();

  constructor(private experimentId: string) {
    console.log(`[WS_CLIENT] WebSocketService created for experiment: ${experimentId}`);
  }

  connect() {
    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000';
    const url = `${wsUrl}/api/v1/experiments/ws/${this.experimentId}`;

    console.log(`[WS_CLIENT] Attempting to connect to: ${url}`);
    console.log(`[WS_CLIENT] Environment VITE_WS_URL: ${(import.meta as any).env?.VITE_WS_URL}`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`[WS_CLIENT] ✅ WebSocket connected successfully for experiment ${this.experimentId}`);
      console.log(`[WS_CLIENT] Connection time: ${new Date().toISOString()}`);
      console.log(`[WS_CLIENT] ReadyState: ${this.ws?.readyState} (OPEN = 1)`);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      console.log(`[WS_CLIENT] 📨 Received message for experiment ${this.experimentId}:`, event.data);
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log(`[WS_CLIENT] Parsed message type: ${message.type}`);
        console.log(`[WS_CLIENT] Message data:`, message.data);
        console.log(`[WS_CLIENT] Active handlers count: ${this.handlers.size}`);

        let handlerIndex = 0;
        this.handlers.forEach((handler) => {
          handlerIndex++;
          console.log(`[WS_CLIENT] Calling handler #${handlerIndex}`);
          handler(message);
        });

        console.log(`[WS_CLIENT] All handlers executed successfully`);
      } catch (error) {
        console.error(`[WS_CLIENT] ❌ Failed to parse WebSocket message:`, error);
        console.error(`[WS_CLIENT] Raw data:`, event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error(`[WS_CLIENT] ❌ WebSocket error for experiment ${this.experimentId}:`, error);
      console.error(`[WS_CLIENT] ReadyState: ${this.ws?.readyState}`);
    };

    this.ws.onclose = (event) => {
      console.log(`[WS_CLIENT] WebSocket closed for experiment ${this.experimentId}`);
      console.log(`[WS_CLIENT] Close code: ${event.code}, reason: ${event.reason}`);
      console.log(`[WS_CLIENT] Was clean: ${event.wasClean}`);
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`[WS_CLIENT] 🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      console.log(`[WS_CLIENT] Reconnect delay: ${delay}ms`);

      setTimeout(() => {
        console.log(`[WS_CLIENT] Executing reconnect attempt #${this.reconnectAttempts}`);
        this.connect();
      }, delay);
    } else {
      console.error(`[WS_CLIENT] ❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached for experiment ${this.experimentId}`);
    }
  }

  subscribe(handler: MessageHandler) {
    console.log(`[WS_CLIENT] Adding message handler for experiment ${this.experimentId}`);
    console.log(`[WS_CLIENT] Total handlers before add: ${this.handlers.size}`);
    this.handlers.add(handler);
    console.log(`[WS_CLIENT] Total handlers after add: ${this.handlers.size}`);
    return () => {
      console.log(`[WS_CLIENT] Removing message handler for experiment ${this.experimentId}`);
      this.handlers.delete(handler);
    };
  }

  disconnect() {
    console.log(`[WS_CLIENT] Disconnecting WebSocket for experiment ${this.experimentId}`);
    if (this.ws) {
      console.log(`[WS_CLIENT] Closing WebSocket connection, current state: ${this.ws.readyState}`);
      this.ws.close();
      this.ws = null;
    }
    console.log(`[WS_CLIENT] Clearing ${this.handlers.size} handlers`);
    this.handlers.clear();
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[WS_CLIENT] Sending message to server:`, message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn(`[WS_CLIENT] Cannot send message, WebSocket is not open. ReadyState: ${this.ws?.readyState}`);
    }
  }
}
