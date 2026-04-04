export function createDataChannel(pc) {
  const dc = pc.createDataChannel('oai-events');
  return dc;
}

export function sendEvent(dc, eventObj) {
  if (dc && dc.readyState === 'open') {
    dc.send(JSON.stringify(eventObj));
  } else {
    console.warn('Data channel is not open. Cannot send event:', eventObj.type);
  }
}

export function onServerEvent(dc, handler) {
  if (!dc) return;
  dc.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handler(data);
    } catch (err) {
      console.error('Failed to parse data channel message:', err);
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
