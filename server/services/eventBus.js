// PharmaChain real-time event bus
// Uses Node's EventEmitter as an in-process pub/sub layer.
// Route handlers emit events via emitEvent(); the SSE endpoint
// subscribes to 'sse' and broadcasts to connected browser clients.
import { EventEmitter } from 'events';

const eventBus = new EventEmitter();
eventBus.setMaxListeners(100);

export function emitEvent(type, payload = {}) {
  eventBus.emit('sse', { type, payload, ts: Date.now() });
}

export default eventBus;
