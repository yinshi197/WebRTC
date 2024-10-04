'use strict'

var localVideo = document.querySelector('video#localvideo');
var remoteVideo = document.querySelector('video#remotevideo');
var btnStart = document.querySelector('button#start');
var btnCall = document.querySelector('button#call');
var btnHangup = document.querySelector('button#hangup')
var offer = document.querySelector('textarea#offer');
var answer = document.querySelector('textarea#answer');

var localStream;

//Peerconnection
var pc1;
var pc2;

function getMediaStream(stream){
    localVideo.srcObject = stream;
    localStream = stream;
    btnStart.disabled = true;
    btnCall.disabled = false;
}

function handleError(error){
    console.error('Failed to get Media Stream!', error)
}

function start(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        console.error('the getUserMedia is not supported');
        return;
    }else {
        var constraints = {
            video : true,
            audio : false
        }
        navigator.mediaDevices.getUserMedia(constraints)
                                .then(getMediaStream)
                                .catch(handleError);
    }
}

function getRemoteStream(e){
    //有多个流就只需要第一个流就行
    remoteVideo.srcObject = e.streams[0];
}

function getAnswer(desc){
    pc2.setLocalDescription(desc);
    answer.value = desc.sdp;

    //发送 desc 到信令服务器,信令服务器会转发到对端
    
    pc1.setRemoteDescription(desc);
    btnHangup.disabled = false;
    btnCall.disabled = true;
}

function handleAnswerError(error){
    console.error('Fialed  to Create Answer', error);
}

function getLocalOffer(desc){
    //处理完该动作，自动搜集candidat数据
    pc1.setLocalDescription(desc);
    offer.value = desc.sdp;

    //正常具有信令服务器
    //发送 desc 给 信令服务器，信令服务器接收到desc后转发给对端

    pc2.setRemoteDescription(desc);
    pc2.createAnswer()
            .then(getAnswer)
            .catch(handleAnswerError);
}

function handleOfferError(error){
    console.error('Failed to Create Offer', error);
}

function call(){
    //本机内可以不设置参数配置ICE
    pc1 = new RTCPeerConnection();
    pc2 = new RTCPeerConnection();
    //处理candidat事件，表示搜集到candidat。需要发送到信令服务器
    //当前不使用信令服务器，可以不发送。并且默认信令服务器已经接受到candidat数据了,往对端发送了数据
    pc1.onicecandidate = (e)=>{
        //对端pc2处理接收candidat数据事件
        pc2.addIceCandidate(e.candidate);
    }
    
    pc2.onicecandidate = (e)=>{
        pc1.addIceCandidate(e.candidate);
    }
    
    pc2.ontrack = getRemoteStream;
    
    //必须先添加流再做媒体协商，否则不会进行媒体协商
    localStream.getTracks().forEach((track)=>{
        //往流中加入轨
        pc1.addTrack(track, localStream);
    });

    //媒体协商
    //1.创建offer
    var offerOptions = {
        offerToRecieveAudio : 1,
        offerToRecieveVideo : 1
    }

    pc1.createOffer(offerOptions)
            .then(getLocalOffer)
            .catch(handleOfferError);
    
}

function hangup(){
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    btnStart.disabled = false;
    btnCall.disabled = true;
    btnHangup.disabled = true;
}

btnStart.onclick = start;
btnCall.onclick = call;
btnHangup.onclick = hangup;