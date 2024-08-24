import { initializeApp } from "firebase/app";
import { getFirestore,collection,addDoc,setDoc,doc,onSnapshot,getDoc, updateDoc} from "firebase/firestore";

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app)

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);
let localStream = null;  

const webCamButton = document.querySelector("#startCall");
const webcamVideo = document.querySelector("#localVideo"); // Make sure to select the correct video element
const remoteVideo = document.querySelector("#remoteVideo");
const answerBtn = document.querySelector("#answerCall");
const callInput = document.querySelector('#callId');
const remoteStream = new MediaStream()

console.log(webCamButton)
console.log(webcamVideo)
webCamButton.onclick = async () => { 
  console.log("Start Call clicked");
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  console.log("whatf")
  localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
  });

  webcamVideo.srcObject = localStream;


  const calldoc = doc(collection(firestore,'calls'))
  const offerCandidates = collection(firestore,'offerCandidates')
  const answerCandidates = collection(firestore,'answerCandidates')
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);
  const callId = calldoc.id;
  callInput.value = callId;
  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await setDoc(calldoc,{offer})

  onSnapshot(calldoc, (snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });
  pc.onicecandidate = event => {
    if (event.candidate) {
      addDoc(offerCandidates, event.candidate.toJSON());
    }
  };
  

  // Listen for remote ICE candidates using onSnapshot on the answerCandidates collection reference
  onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });





}


pc.ontrack = event => {
  event.streams[0].getTracks().forEach((track) => {
   remoteStream.addTrack(track)
  })
}

remoteVideo.srcObject = remoteStream
answerBtn.onclick =  async () => {
  const callId = callInput.value;
  const calldoc = doc(firestore,"calls",callId);
  const offerCandidates = collection(calldoc,'offerCandidates')
  const answerCandidates = collection(firestore,'answerCandidates')

  pc.onicecandidate = event => {
    event.candidate && addDoc(answerCandidates,event.candidate.toJSON());
  }

  const callData = (await getDoc(calldoc)).data();
  const offerDesc = callData.offer
  pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
  const answerDesc = await pc.createAnswer();
  await pc.setLocalDescription(answerDesc);
  const answer = {
    type : answerDesc.type,
    sdp : answerDesc.sdp
  }
  await updateDoc(calldoc,{ answer })
  onSnapshot(offerCandidates,(snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      const data = data.doc.data();
      pc.addIceCandidate(new RTCIceCandidate(data))
    })
  })

  pc.ontrack = event => {
    event.streams[0].getTracks().forEach((track) => {
     remoteStream.addTrack(track)
    })
 }
 
 remoteVideo.srcObject = remoteStream

  console.log("answer Call clicked");
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  console.log("whatf")
  localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
  });

  webcamVideo.srcObject = localStream;
}

