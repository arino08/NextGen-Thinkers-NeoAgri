export async function exchangeSDP(sdpOffer, clientSecret, model) {
  const res = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientSecret}`,
      'Content-Type': 'application/sdp',
    },
    body: sdpOffer,
  });
  if (!res.ok) throw new Error('SDP exchange failed: ' + res.status);
  return res.text();  // returns SDP answer
}
