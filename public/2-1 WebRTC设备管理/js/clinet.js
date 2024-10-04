'use strict'

//获取元素变量
var audioSource = document.querySelector("select#audioSource");
var videoSource = document.querySelector("select#videoSource");
var audioOutput = document.querySelector("select#audioOutput");
var video = document.querySelector('video#video');
var audio = document.querySelector('audio#audio');

if (window.isSecureContext) {
    console.log('Page is a secure context so service workers are now available');
  }
  

if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('no supported!');
}else {
    //获取权限，否则无法查看列表信息
    navigator.mediaDevices.getUserMedia({audio: true, video: true})
                            .then(gotMediaStream)
                            .then(gotDevices)
                            .catch(handleError);
}

function gotMediaStream(stream){
    video.srcObject = stream;
    audio.srcObject = stream;
    return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos){
    deviceInfos.forEach(function(deviceInfo){
        console.log(deviceInfo.kind + ": label = "
                    + deviceInfo.label + ": id = "
                    + deviceInfo.deviceId +": groupId = "
                    + deviceInfo.groupId);
        //创建元素属性
        var option = document.createElement('option');
        option.text = deviceInfo.label;
        option.value = deviceInfo.deviceId;
        if(deviceInfo.kind === 'audioinput'){
            audioSource.appendChild(option);    //添加元素属性
        }else if(deviceInfo.kind === 'audiooutput'){
            audioOutput.appendChild(option);
        }else if(deviceInfo.kind === 'videoinput'){
            videoSource.appendChild(option);
        }
    });
}
     
function handleError(error){
    console.log(error.name + " : " + error.message);
}