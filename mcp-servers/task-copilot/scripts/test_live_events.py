#!/usr/bin/env python3
"""
Test live WebSocket events by subscribing and waiting for events.

Run this script in one terminal, then trigger a task update via MCP
to see events in real-time.
"""

import sys
import json
import time
import signal

sys.path.insert(0, 'scripts')
from task_copilot_client import TaskCopilotClient

API_BASE = "http://127.0.0.1:9090"

def on_event(topic: str, event_type: str, data: dict):
    """Callback for received events."""
    print(f"\n{'='*60}")
    print(f"📥 EVENT RECEIVED")
    print(f"{'='*60}")
    print(f"Topic:      {topic}")
    print(f"Event Type: {event_type}")
    print(f"Data:       {json.dumps(data, indent=2)}")
    print(f"{'='*60}\n")

def main():
    print("=" * 60)
    print("Task Copilot Live WebSocket Event Monitor")
    print("=" * 60)
    print()
    print("Subscribing to: task:*, stream:*, checkpoint:*, agent:*")
    print("Waiting for events... (Ctrl+C to stop)")
    print()

    client = TaskCopilotClient(api_base=API_BASE, debug=True)

    def shutdown(sig, frame):
        print("\nShutting down...")
        client.disconnect()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Connect and subscribe
    client.connect()
    time.sleep(1)

    if not client.connected:
        print("❌ Failed to connect to WebSocket")
        return

    client.subscribe(["task:*", "stream:*", "checkpoint:*", "agent:*"], on_event)

    print("✅ Connected and subscribed. Listening for events...")
    print()

    # Keep running
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
