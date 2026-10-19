// Message protocol between the dashboard (content script) and the bridge (page main world).
export const CHANNEL = 'wavault-v1';

export const isFromChannel = (event, kind) =>
  event.source === window && event.data && event.data.__wavault === kind && event.data.channel === CHANNEL;
