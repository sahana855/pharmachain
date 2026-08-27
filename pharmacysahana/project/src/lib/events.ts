// PharmaChain real-time event bus (client-side)
// Connects to the backend SSE endpoint (/api/events) and exposes a
// simple subscribe/notify API. Each component calls useLiveEvents()
// to receive server-pushed events and trigger data refreshes.
import { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from './api';
import { API_BASE_URL } from './config';

type EventHandler = (data: unknown) => void;

export type LiveEventType =
  | 'shipment_created'
  | 'shipment_updated'
  | 'box_created'
  | 'box_updated'
  | 'box_scanned'
  | 'connected'
  | 'user_approved'
  | 'user_rejected'
  | 'user_approved_all';

const EVENT_TYPES: LiveEventType[] = [
  'shipment_created',
  'shipment_updated',
  'box_created',
  'box_updated',
  'box_scanned',
  'connected',
  'user_approved',
  'user_rejected',
  'user_approved_all',
];

const RECONNECT_DELAY = 5000;

// Module-level singleton: one EventSource shared across all components
let eventSource: EventSource | null = null;
const listeners: Map<LiveEventType, Set<EventHandler>> = new Map();

function ensureConnected(): EventSource {
  if (eventSource && (eventSource.readyState === EventSource.OPEN || eventSource.readyState === EventSource.CONNECTING)) {
    return eventSource;
  }

  if (eventSource) {
    eventSource.close();
  }

  const token = getToken();
  const url = `${API_BASE_URL}/api/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const es = new EventSource(url);

  EVENT_TYPES.forEach((type) => {
    es.addEventListener(type, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const set = listeners.get(type);
        if (set) {
          set.forEach((cb) => cb(data));
        }
      } catch {
        // parse error — ignore malformed SSE data
      }
    });
  });

  es.onerror = () => {
    if (es.readyState === EventSource.CLOSED) {
      eventSource = null;
      // Reconnect after delay if there are still listeners
      setTimeout(() => {
        if (listeners.size > 0 && eventSource === null) {
          ensureConnected();
        }
      }, RECONNECT_DELAY);
    }
  };

  eventSource = es;
  return es;
}

function disconnect() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

export function subscribeToEvent(eventType: LiveEventType, handler: EventHandler): () => void {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
  }
  listeners.get(eventType)!.add(handler);
  ensureConnected();

  return () => {
    const set = listeners.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        listeners.delete(eventType);
      }
    }
    // Disconnect when no listeners remain
    if (listeners.size === 0) {
      disconnect();
    }
  };
}

interface UseLiveEventsResult {
  connected: boolean;
  reconnect: () => void;
}

export function useLiveEvents(
  handler: (eventType: LiveEventType, data: unknown) => void
): UseLiveEventsResult {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(false);

    const wrappedHandler = (eventType: LiveEventType, data: unknown) => {
      handlerRef.current(eventType, data);
    };

    const unsubscribers: Array<() => void> = [];

    EVENT_TYPES.forEach((type) => {
      unsubscribers.push(
        subscribeToEvent(type, (data) => wrappedHandler(type, data))
      );
    });

    // Track connection status via 'connected' event and readiness
    const checkTimer = setInterval(() => {
      if (eventSource && eventSource.readyState === EventSource.OPEN) {
        setConnected(true);
      } else {
        setConnected(false);
      }
    }, 1000);

    // Initial connect
    ensureConnected();

    return () => {
      clearInterval(checkTimer);
      unsubscribers.forEach((u) => u());
    };
  }, [handler]);

  const reconnect = useCallback(() => {
    disconnect();
    ensureConnected();
  }, []);

  return { connected, reconnect };
}

interface UseLiveSyncResult {
  connected: boolean;
  lastEvent: number;
}

export function useLiveSync(callback: () => void): UseLiveSyncResult {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const [lastEvent, setLastEvent] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const handler = (eventType: LiveEventType) => {
      if (eventType === 'connected') {
        setConnected(true);
      } else {
        callbackRef.current();
        setLastEvent(Date.now());
      }
    };

    const unsubs: Array<() => void> = [];
    EVENT_TYPES.forEach((type) => {
      if (type === 'connected') {
        unsubs.push(subscribeToEvent(type, () => setConnected(true)));
      } else {
        unsubs.push(subscribeToEvent(type, () => handler(type)));
      }
    });

    const checkTimer = setInterval(() => {
      if (eventSource && eventSource.readyState === EventSource.OPEN) {
        setConnected(true);
      } else {
        setConnected(false);
      }
    }, 1000);

    ensureConnected();

    return () => {
      clearInterval(checkTimer);
      unsubs.forEach((u) => u());
    };
  }, []);

  return { connected, lastEvent };
}
