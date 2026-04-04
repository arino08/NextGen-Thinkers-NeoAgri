import { RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';

export function createPeerConnection() {
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
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

  // Wait for ICE gathering to complete so the SDP contains all candidates
  if (pc.iceGatheringState !== 'complete') {
    await new Promise((resolve) => {
      const checkState = () => {
        console.log('[PC] ICE gathering state:', pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
      // Also listen for null candidate which signals end of gathering
      const onCandidate = (event) => {
        if (event.candidate === null) {
          pc.removeEventListener('icecandidate', onCandidate);
          resolve();
        }
      };
      pc.addEventListener('icecandidate', onCandidate);
    });
  }
  console.log('[PC] ICE gathering complete, SDP ready');
  return pc.localDescription.sdp;
}

export async function setRemoteAnswer(pc, sdpAnswer) {
  const remoteDesc = new RTCSessionDescription({
    type: 'answer',
    sdp: sdpAnswer,
  });
  await pc.setRemoteDescription(remoteDesc);
}
