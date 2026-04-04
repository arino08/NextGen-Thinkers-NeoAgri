import { RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';

export function createPeerConnection() {
  const configuration = { iceServers: [] };
  const pc = new RTCPeerConnection(configuration);
  return pc;
}

export function addAudioTrack(pc, stream) {
  if (stream && stream.getAudioTracks) {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      pc.addTrack(audioTrack, stream);
    }
  }
}

export async function createOffer(pc) {
  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);
  return pc.localDescription.sdp;
}

export async function setRemoteAnswer(pc, sdpAnswer) {
  const remoteDesc = new RTCSessionDescription({
    type: 'answer',
    sdp: sdpAnswer,
  });
  await pc.setRemoteDescription(remoteDesc);
}
