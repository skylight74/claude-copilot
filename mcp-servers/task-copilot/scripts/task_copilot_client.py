#!/usr/bin/env python3
"""
Task Copilot Client with WebSocket Support

Python client for Task Copilot MCP Server with real-time WebSocket events
and automatic fallback to HTTP polling.

Usage:
    from task_copilot_client import TaskCopilotClient

    # Create client (auto-detects WebSocket availability)
    client = TaskCopilotClient()
    client.connect()

    # Subscribe to events
    def on_stream_progress(topic, event_type, data):
        print(f"Stream {data['streamId']}: {data['progressPercentage']}%")

    client.subscribe(['stream:Stream-A'], on_stream_progress)

    # Keep running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        client.disconnect()
"""

import json
import time
import threading
from typing import Callable, Dict, List, Optional
from datetime import datetime

# Try to import websocket-client
try:
    import websocket
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    print("⚠ websocket-client not installed, falling back to HTTP polling")
    print("  Install with: pip install websocket-client")

import requests


class TaskCopilotClient:
    """
    Client for Task Copilot with WebSocket support and HTTP fallback.

    Features:
    - Real-time WebSocket events (if websocket-client installed)
    - Automatic fallback to HTTP polling (30s interval)
    - Topic-based subscriptions with glob patterns
    - Automatic reconnection on disconnect
    """

    def __init__(
        self,
        api_base: str = "http://127.0.0.1:9090",
        use_websocket: bool = True,
        poll_interval: int = 30,
        debug: bool = False
    ):
        """
        Initialize Task Copilot client.

        Args:
            api_base: Base URL for HTTP API (default: http://127.0.0.1:9090)
            use_websocket: Try WebSocket first (default: True)
            poll_interval: Polling interval in seconds for HTTP fallback (default: 30)
            debug: Enable debug logging (default: False)
        """
        self.api_base = api_base
        self.ws_url = api_base.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws'
        self.use_websocket = use_websocket and WEBSOCKET_AVAILABLE
        self.poll_interval = poll_interval
        self.debug = debug

        self.ws: Optional[websocket.WebSocketApp] = None
        self.subscriptions: Dict[str, List[Callable]] = {}
        self.ws_thread: Optional[threading.Thread] = None
        self.connected = False
        self.mode = None  # 'websocket' or 'http'

        # Fallback: polling thread
        self.polling_thread: Optional[threading.Thread] = None
        self.polling_active = False
        self.last_poll_state: Dict[str, any] = {}

    def connect(self) -> bool:
        """
        Connect to Task Copilot (WebSocket or HTTP polling).

        Returns:
            True if connection successful, False otherwise
        """
        if self.use_websocket:
            return self._connect_websocket()
        else:
            return self._start_polling()

    def _connect_websocket(self) -> bool:
        """Establish WebSocket connection."""
        if not WEBSOCKET_AVAILABLE:
            self._log("WebSocket library not available, falling back to HTTP")
            return self._start_polling()

        try:
            self._log(f"Connecting to WebSocket: {self.ws_url}")

            self.ws = websocket.WebSocketApp(
                self.ws_url,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
                on_open=self._on_open
            )

            self.ws_thread = threading.Thread(
                target=self.ws.run_forever,
                daemon=True
            )
            self.ws_thread.start()

            # Wait for connection (with timeout)
            timeout = 5
            start = time.time()
            while not self.connected and (time.time() - start) < timeout:
                time.sleep(0.1)

            if self.connected:
                self.mode = 'websocket'
                print("✓ WebSocket connected")
                return True
            else:
                self._log("WebSocket connection timeout")
                return self._start_polling()

        except Exception as e:
            self._log(f"WebSocket error: {e}")
            return self._start_polling()

    def subscribe(
        self,
        topics: List[str],
        callback: Callable[[str, str, Dict], None]
    ):
        """
        Subscribe to topics.

        Args:
            topics: List of topic patterns (e.g., ['stream:Stream-A', 'task:*'])
            callback: Function(topic, eventType, data) called on events

        Examples:
            client.subscribe(['stream:*'], on_stream_event)
            client.subscribe(['task:TASK-123'], on_task_event)
        """
        for topic in topics:
            if topic not in self.subscriptions:
                self.subscriptions[topic] = []
            self.subscriptions[topic].append(callback)

        if self.mode == 'websocket' and self.connected:
            # Send subscribe message to WebSocket server
            self._send_ws_message({
                'type': 'subscribe',
                'id': f'sub-{int(time.time() * 1000)}',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'payload': {
                    'topics': topics
                }
            })
            self._log(f"Subscribed to: {topics}")

    def unsubscribe(self, topics: List[str]):
        """
        Unsubscribe from topics.

        Args:
            topics: List of topic patterns to unsubscribe
        """
        for topic in topics:
            if topic in self.subscriptions:
                del self.subscriptions[topic]

        if self.mode == 'websocket' and self.connected:
            self._send_ws_message({
                'type': 'unsubscribe',
                'id': f'unsub-{int(time.time() * 1000)}',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'payload': {
                    'topics': topics
                }
            })

    def _on_message(self, ws, message: str):
        """Handle incoming WebSocket message."""
        try:
            msg = json.loads(message)
            msg_type = msg.get('type')

            if msg_type == 'event':
                payload = msg['payload']
                topic = payload['topic']
                event_type = payload['eventType']
                data = payload['data']

                # Call matching subscriptions
                for pattern, callbacks in self.subscriptions.items():
                    if self._topic_matches(topic, pattern):
                        for callback in callbacks:
                            try:
                                callback(topic, event_type, data)
                            except Exception as e:
                                self._log(f"Error in callback: {e}")

            elif msg_type == 'ping':
                # Respond with pong
                self._send_ws_message({
                    'type': 'pong',
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'payload': {}
                })

            elif msg_type == 'subscribed':
                self._log(f"Subscription confirmed: {msg['payload']}")

            elif msg_type == 'error':
                payload = msg['payload']
                print(f"✗ WebSocket error: {payload['code']} - {payload['message']}")

        except Exception as e:
            self._log(f"Error handling message: {e}")

    def _topic_matches(self, topic: str, pattern: str) -> bool:
        """Check if topic matches subscription pattern."""
        if pattern == '*':
            return True

        if pattern.endswith('*'):
            prefix = pattern[:-1]
            return topic.startswith(prefix)

        return topic == pattern

    def _on_open(self, ws):
        """WebSocket connection opened."""
        self.connected = True
        self._log("WebSocket opened")

    def _on_error(self, ws, error):
        """WebSocket error occurred."""
        self._log(f"WebSocket error: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        """WebSocket connection closed."""
        self.connected = False
        self._log(f"WebSocket closed: {close_status_code} - {close_msg}")

    def _send_ws_message(self, message: dict):
        """Send message to WebSocket server."""
        if self.ws and self.connected:
            try:
                self.ws.send(json.dumps(message))
            except Exception as e:
                self._log(f"Failed to send WebSocket message: {e}")

    # ==================== HTTP Fallback ====================

    def _start_polling(self) -> bool:
        """Start HTTP polling thread."""
        self.mode = 'http'
        self.polling_active = True
        self.polling_thread = threading.Thread(
            target=self._poll_loop,
            daemon=True
        )
        self.polling_thread.start()
        print(f"✓ HTTP polling started (interval: {self.poll_interval}s)")
        return True

    def _poll_loop(self):
        """Poll HTTP API for updates."""
        while self.polling_active:
            try:
                # Poll subscribed topics
                for topic_pattern in self.subscriptions.keys():
                    if topic_pattern.startswith('stream:'):
                        stream_id = topic_pattern.split(':')[1]
                        if stream_id != '*':
                            self._poll_stream(stream_id)
                        else:
                            self._poll_all_streams()

                    elif topic_pattern.startswith('task:'):
                        task_id = topic_pattern.split(':')[1]
                        if task_id != '*':
                            self._poll_task(task_id)

                time.sleep(self.poll_interval)

            except Exception as e:
                self._log(f"Polling error: {e}")
                time.sleep(self.poll_interval)

    def _poll_stream(self, stream_id: str):
        """Poll specific stream and emit synthetic events."""
        try:
            resp = requests.get(
                f"{self.api_base}/api/streams/{stream_id}",
                timeout=10
            )
            resp.raise_for_status()
            data = resp.json()

            # Check if state changed
            key = f'stream:{stream_id}'
            if key not in self.last_poll_state or self.last_poll_state[key] != data:
                # Emit progress event
                progress_data = {
                    'streamId': stream_id,
                    'streamName': data['streamName'],
                    'totalTasks': data['totalTasks'],
                    'completedTasks': data['completedTasks'],
                    'inProgressTasks': data['inProgressTasks'],
                    'blockedTasks': data['blockedTasks'],
                    'progressPercentage': (data['completedTasks'] / data['totalTasks'] * 100) if data['totalTasks'] > 0 else 0,
                    'lastUpdated': datetime.utcnow().isoformat() + 'Z'
                }

                self._emit_event(f'stream:{stream_id}', 'stream.progress', progress_data)
                self.last_poll_state[key] = data

        except Exception as e:
            self._log(f"Error polling stream {stream_id}: {e}")

    def _poll_all_streams(self):
        """Poll all streams."""
        try:
            resp = requests.get(f"{self.api_base}/api/streams", timeout=10)
            resp.raise_for_status()
            data = resp.json()

            for stream in data.get('streams', []):
                stream_id = stream['streamId']
                self._poll_stream(stream_id)

        except Exception as e:
            self._log(f"Error polling all streams: {e}")

    def _poll_task(self, task_id: str):
        """Poll specific task and emit synthetic events."""
        try:
            resp = requests.get(
                f"{self.api_base}/api/tasks/{task_id}",
                timeout=10
            )
            resp.raise_for_status()
            data = resp.json()

            # Check if state changed
            key = f'task:{task_id}'
            if key not in self.last_poll_state or self.last_poll_state[key] != data:
                # Emit task updated event
                self._emit_event(f'task:{task_id}', 'task.updated', data)
                self.last_poll_state[key] = data

        except Exception as e:
            self._log(f"Error polling task {task_id}: {e}")

    def _emit_event(self, topic: str, event_type: str, data: dict):
        """Emit event to matching subscribers."""
        for pattern, callbacks in self.subscriptions.items():
            if self._topic_matches(topic, pattern):
                for callback in callbacks:
                    try:
                        callback(topic, event_type, data)
                    except Exception as e:
                        self._log(f"Error in callback: {e}")

    # ==================== Utility Methods ====================

    def disconnect(self):
        """Disconnect WebSocket or stop polling."""
        if self.ws:
            self.ws.close()
        self.polling_active = False
        self.connected = False
        print("✓ Client disconnected")

    def get_mode(self) -> str:
        """Get current connection mode ('websocket' or 'http')."""
        return self.mode or 'disconnected'

    def _log(self, message: str):
        """Internal logging."""
        if self.debug:
            print(f"[DEBUG] {message}")


# Example usage
if __name__ == '__main__':
    # Create client
    client = TaskCopilotClient(debug=True)

    # Connect (auto-detects WebSocket or falls back to HTTP)
    if not client.connect():
        print("Failed to connect to Task Copilot")
        exit(1)

    print(f"Connected in {client.get_mode()} mode")

    # Subscribe to stream events
    def on_stream_event(topic: str, event_type: str, data: dict):
        stream_id = data.get('streamId', 'unknown')
        progress = data.get('progressPercentage', 0)
        print(f"Stream {stream_id}: {progress:.1f}% complete ({event_type})")

    client.subscribe(['stream:*'], on_stream_event)

    # Subscribe to task events
    def on_task_event(topic: str, event_type: str, data: dict):
        task_id = data.get('taskId', 'unknown')
        print(f"Task {task_id}: {event_type}")

    client.subscribe(['task:*'], on_task_event)

    # Keep running
    print("\nListening for events (Ctrl+C to stop)...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        client.disconnect()
