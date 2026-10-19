// RPC client used by the dashboard (content script, isolated world) to talk to the bridge.
import { CHANNEL, isFromChannel } from './protocol.js';

let seq = 0;
const pending = new Map();

window.addEventListener('message', (event) => {
  if (isFromChannel(event, 'progress')) {
    pending.get(event.data.id)?.onProgress?.(event.data.data);
    return;
  }
  if (!isFromChannel(event, 'res')) return;
  const p = pending.get(event.data.id);
  if (!p) return;
  pending.delete(event.data.id);
  if (event.data.ok) p.resolve(event.data.result);
  else p.reject(new Error(event.data.error));
});

/**
 * Calls a bridge method. Returns { promise, cancel } so long jobs (history, media) can be stopped.
 */
export function call(method, params = {}, { onProgress, timeoutMs = 0 } = {}) {
  seq += 1;
  const id = `${Date.now().toString(36)}-${seq}`;
  let timer;
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    if (timeoutMs) {
      timer = setTimeout(() => {
        if (pending.delete(id)) reject(new Error(`Timed out waiting for WhatsApp (${method})`));
      }, timeoutMs);
    }
    window.postMessage({ __wavault: 'req', channel: CHANNEL, id, method, params }, window.location.origin);
  }).finally(() => clearTimeout(timer));
  const cancel = () => window.postMessage({ __wavault: 'req', channel: CHANNEL, id: id + ':c', method: 'cancel', params: { jobId: id } }, window.location.origin);
  return { promise, cancel, id };
}

export const invoke = (method, params, opts) => call(method, params, opts).promise;
