'use strict'

var btnCreateoffer = document.querySelector('button#createoffer');

//Peerconnection
var pc1 = new RTCPeerConnection();
var pc2 = new RTCPeerConnection();

function getAnswer(desc) {
    console.log('answer:', desc.sdp);

    pc2.setLocalDescription(desc);
    pc1.setRemoteDescription(desc);
}

function getOffer(desc) {
    console.log('offer:', desc);

    pc1.setLocalDescription(desc);
    pc2.setRemoteDescription(desc);

    //pc2收到pc1的desc，产生应答
    pc2.createAnswer().then(getAnswer).catch(handleError);
}

function getMediaStream(stream){
        stream.getTracks().forEach((track) => {
                pc1.addTrack(track);
        });
        
        var options = {
            offerToRecieveAudio: 0,
            offerToRecieveVideo: 1,
            iceRestart: true
        }

        pc1.createOffer(options).then(getOffer).catch(handleError);
}

function handleError(error){
    console.error('Failed to get Media Stream!', error)
}

function getStream() {
    var constraints = {
        audio: 0,
        video: 1
    }

    navigator.mediaDevices.getUserMedia(constraints)
                            .then(getMediaStream)
                            .catch(handleError);
}

function test() {
    if(!pc1) {
        console.error('pc1 is null');
        return;
    }

    getStream();

    return;
}

btnCreateoffer.onclick = test;