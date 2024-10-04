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

//button
var recvideo = document.querySelector('video#recplayer');
var btnrecord = document.querySelector('button#record');
var btnrecplay = document.querySelector('button#recplay');
var btndownload = document.querySelector('button#download');

var mediaRecorder;
var buffer;

if(!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
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
    navigator.mediaDevices.getDisplayMedia(constraints)
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
    //在JavaScript中Window是全局对象
    window.stream = stream;
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

function handleDataAvailable(e){
    if(e && e.data && e.data.size > 0){
        buffer.push(e.data);
    }
}

function StartRecord(){
        buffer = [];
        var options = {
            mimeType: 'video/webm;codecs=vp8'
        }
        if(!MediaRecorder.isTypeSupported(options.mimeType)){
            console.error(`${options.mimeType} is not supported!`)
            return;
        }
        try{
            mediaRecorder = new MediaRecorder(window.stream, options);
        }catch(e){
            console.error('Failed to create MediaRecoder:', e);
            return;
        }
        mediaRecorder.ondataavailable = handleDataAvailable;
        //时间片为10
        mediaRecorder.start(10);
        
}

function StopRecord(){
    mediaRecorder.stop();
}
btnrecord.onclick = ()=>{
    if(btnrecord.textContent === 'Start Record'){
        StartRecord();
        btnrecord.textContent = 'Stop Record';
        btnrecplay.disabled = true;
        btndownload.disabled = true;
    }else {
        StopRecord();
        btnrecord.textContent = 'Start Record';
        btnrecplay.disabled = false;
        btndownload.disabled = false;
    }
}

btnrecplay.onclick = ()=>{
    //获取数据的位置
    var blob = new Blob(buffer, {type: 'video/webm'});
    recvideo.src = window.URL.createObjectURL(blob);
    recvideo.srcObject = null;
    recvideo.controls = true;
    recvideo.play();
}

btndownload.onclick = ()=>{
    var blob = new Blob(buffer, {type: 'video/webm'});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');

    a.href = url;
    a.style.display = 'none';
    a.download = 'aaa.webm';
    a.click();
}