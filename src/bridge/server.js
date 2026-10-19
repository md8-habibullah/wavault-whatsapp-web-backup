// RPC server running in the page main world. Answers requests from the WAVault dashboard.
import { CHANNEL, isFromChannel } from '../shared/protocol.js';
import { capabilities, isLoggedIn, whatsappVersion, collections } from './modules.js';
import { downloadMedia, getSnapshot, getStatuses, loadChatHistory, loadGroupParticipants } from './extract.js';

const cancelled = new Set();

const handlers = {
  status: async () => ({
    loaded: !!collections()?.Contact,
    loggedIn: isLoggedIn(),
    version: whatsappVersion(),
    capabilities: capabilities(),
  }),
  snapshot: () => getSnapshot(),
  loadGroupParticipants: ({ groupIds }, ctx) => loadGroupParticipants(groupIds, ctx.progress, ctx.isCancelled),
  loadChatHistory: ({ chatId, options }, ctx) => loadChatHistory(chatId, options, ctx.progress, ctx.isCancelled),
  statuses: () => getStatuses(),
  downloadMedia: ({ msgId }) => downloadMedia(msgId),
  cancel: ({ jobId }) => {
    cancelled.add(jobId);
    return true;
  },
};

function post(message, transfer) {
  window.postMessage({ ...message, channel: CHANNEL }, window.location.origin, transfer);
}

export function startServer() {
  if (window.__wavaultBridge) return;
  window.__wavaultBridge = true;

  window.addEventListener('message', async (event) => {
    if (!isFromChannel(event, 'req')) return;
    const { id, method, params } = event.data;
    const handler = handlers[method];
    if (!handler) {
      post({ __wavault: 'res', id, ok: false, error: `Unknown method ${method}` });
      return;
    }
    const ctx = {
      progress: (data) => post({ __wavault: 'progress', id, data }),
      isCancelled: () => cancelled.has(id),
    };
    try {
      const result = await handler(params || {}, ctx);
      const transfer = result?.buffer instanceof ArrayBuffer ? [result.buffer] : [];
      post({ __wavault: 'res', id, ok: true, result }, transfer);
    } catch (e) {
      post({ __wavault: 'res', id, ok: false, error: String(e?.message || e) });
    } finally {
      cancelled.delete(id);
    }
  });

  post({ __wavault: 'ready' });
}
