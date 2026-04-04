export function createDataChannel(pc) {
  const dc = pc.createDataChannel('oai-events');
  dc.onerror = (err) => console.error('[DC] error:', err);
  dc.onclose = () => console.log('[DC] closed');
  return dc;
}

export function sendEvent(dc, eventObj) {
  if (dc && dc.readyState === 'open') {
    console.log('[DC] >>> sending:', eventObj.type);
    dc.send(JSON.stringify(eventObj));
  } else {
    console.warn('[DC] not open (state=' + (dc?.readyState) + '). Cannot send:', eventObj.type);
  }
}

export function onServerEvent(dc, handler) {
  if (!dc) return;
  dc.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[DC] <<< received:', data.type);
      handler(data);
    } catch (err) {
      console.error('[DC] Failed to parse message:', err);
    }
  };
}

export function sendToolResult(dc, call_id, resultString) {
  sendEvent(dc, {
    type: 'conversation.item.create',
    item: {
      type: 'function_call_output',
      call_id: call_id,
      output: resultString
    }
  });
  sendEvent(dc, { type: 'response.create' });
}
