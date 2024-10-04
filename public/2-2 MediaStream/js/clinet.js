'use strict'


//获取元素变量
var audioSource = document.querySelector("select#audioSource");
var videoSource = document.querySelector("select#videoSource");
var audioOutput = document.querySelector("select#audioOutput");

var videoplay = document.querySelector('video#player');
var filtersSelect = document.querySelector('select#filter');

//picture
var snapshot = document.querySelector('button#snapshot');
var picture = document.querySelector('canvas#picture');
picture.width = 320;
picture.height = 240;

var audioplay = document.querySelector('audio#audioplayer');

var divconstraints = document.querySelector('div#constraints');

if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('no supported!');
}else {
    //限制条件
    var constraints = {
        video : {
            width : 640,
            height: 480,
            frameRate: 30
        },
        audio : false
    }
    navigator.mediaDevices.getUserMedia(constraints)
            .then(gotMediaStream)
            .then(gotDevices)
            .catch(handleError)
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
function gotMediaStream(stream){
    videoplay.srcObject = stream;
    var videoTrach = stream.getVideoTracks()[0];
    var videoConstraints = videoTrach.getSettings();
    divconstraints.textContent = JSON.stringify(videoConstraints, null, 2);
    return navigator.mediaDevices.enumerateDevices();
}

function handleError(error){
    console.log(error.name + " : " + error.message);
}

filtersSelect.onchange = function(){
    videoplay.className = filtersSelect.value;
}

snapshot.onclick = function(){
    picture.className = filtersSelect.value;
    picture.getContext('2d').drawImage(videoplay,
                                     0, 0,
                                     picture.width,
                                     picture.height);
}