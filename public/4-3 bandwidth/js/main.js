'use strict'

var localVideo = document.querySelector('video#localvideo');
var remoteVideo = document.querySelector('video#remotevideo');

var localAudio = document.querySelector('audio#localaudio');
var remoteAudio = document.querySelector('audio#remoteaudio');

var btnConn =  document.querySelector('button#connserver');
var btnLeave = document.querySelector('button#leave');

var offer = document.querySelector('textarea#offer');
var answer = document.querySelector('  #answer');

var shareDeskBox  = document.querySelector('input#shareDesk');

var localfiltersSelect = document.querySelector('select#localfilter');
var bandwidthSelect = document.querySelector('select#bandwidth');

localfiltersSelect.onchange = function(){
    localVideo.className = localfiltersSelect.value;
}

bandwidthSelect.onchange = function(){
	bandwidthSelect.disabled = true;
    var bw = bandwidthSelect.options[bandwidthSelect.selectedIndex].value;
	
	//只控制 视频的带宽
	var vsender = null;
	var senders = pc.getSenders();  //获取sender
	senders.forEach(sender => {
		if(sender && sender.track.kind == 'video'){
			vsender = sender;
		}
	});

	var paramters = vsender.getParameters();
	//没有或者bw为unlimited直接返回
	if(!paramters.encodings) {
		return;
	}

	if(bw == 'unlimited'){
		bandwidthSelect.disabled = false;
		return;
	}

	paramters.encodings[0].maxBitrate = bw * 1000;
	
	vsender.setParameters(paramters)
			.then(()=>{
				console.log('Success to set paramters');
			})
			.catch(error=>{
				console.log('Failed to set paramters', error);
			});
			
	bandwidthSelect.disabled = false;
}

var pcConfig = {
	'iceServers': [{
	  'urls': 'turn:stun.yinshi197.cn:3478',
	  'credential': "1234",
	  'username': "yinshi"
	}]
};

var localStream = null;
var remoteStream = null;

var pc = null;

var roomid;
var socket = null;

var offerdesc = null;
var state = 'init';

//=======================================================================
//如果返回的是false说明当前操作系统是手机端，如果返回的是true则说明当前的操作系统是电脑端
function IsPC() {
	var userAgentInfo = navigator.userAgent;
	var Agents = ["Android", "iPhone","SymbianOS", "Windows Phone","iPad", "iPod"];
	var flag = true;

	for (var v = 0; v < Agents.length; v++) {
		if (userAgentInfo.indexOf(Agents[v]) > 0) {
			flag = false;
			break;
		}
	}

	return flag;
}

//如果返回true 则说明是Android  false是ios
function is_android() {
	var u = navigator.userAgent, app = navigator.appVersion;
	var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1; //g
	var isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
	if (isAndroid) {
		//这个是安卓操作系统
		return true;
	}

	if (isIOS) {
        //这个是ios操作系统
    	return false;
	}
}

//获取url参数
function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}
//=======================================================================

function sendMessage(roomid, data){

	console.log('send message to other end', roomid, data);
	if(!socket){
		console.log('socket is null');
	}
	socket.emit('message', roomid, data);
}

function conn(){

	socket = io.connect();

	socket.on('joined', (roomid, id) => {
		console.log('receive joined message!', roomid, id);
		state = 'joined'

		//create conn and bind media track
		createPeerConnection();
		bindTracks();

		btnConn.disabled = true;
		btnLeave.disabled = false;
		console.log('receive joined message, state=', state);
	});

	socket.on('otherjoin', (roomid) => {
		console.log('receive joined message:', roomid, state);

		if(state === 'joined_unbind'){
			createPeerConnection();
			bindTracks();
		}

		state = 'joined_conn';
		call();

		console.log('receive other_join message, state=', state);
	});

	socket.on('full', (roomid, id) => {
		console.log('receive full message', roomid, id);
		hangup();
		closeLocalMedia();
		state = 'leaved';
		console.log('receive full message, state=', state);
		alert('the room is full!');
	});

	socket.on('leaved', (roomid, id) => {
		console.log('receive leaved message', roomid, id);
		state='leaved'
		socket.disconnect();
		console.log('receive leaved message, state=', state);

		btnConn.disabled = false;
		btnLeave.disabled = true;
	});

	socket.on('bye', (room, id) => {
		console.log('receive bye message', roomid, id);
		state = 'joined_unbind';
		hangup();
		offer.value = '';
		answer.value = '';
		console.log('receive bye message, state=', state);
	});

	socket.on('disconnect', (socket) => {
		console.log('receive disconnect message!', roomid);
		if(!(state === 'leaved')){
			hangup();
			closeLocalMedia();

		}
		state = 'leaved';
	
	});

	socket.on('message', (roomid, data) => {
		console.log('receive message!', roomid, data);

		if(data === null || data === undefined){
			console.error('the message is invalid!');
			return;	
		}
		
		//判断offer、answer、candidate 和 answer
		if(data.hasOwnProperty('type') && data.type === 'offer') {
			
			offer.value = data.sdp;

			pc.setRemoteDescription(new RTCSessionDescription(data));

			//create answer
			pc.createAnswer()
				.then(getAnswer)
				.catch(handleAnswerError);

		}else if(data.hasOwnProperty('type') && data.type == 'answer'){
			bandwidthSelect.disabled = false;
			answer.value = data.sdp;
			pc.setRemoteDescription(new RTCSessionDescription(data));
		
		}else if (data.hasOwnProperty('type') && data.type === 'candidate'){
			var candidate = new RTCIceCandidate({
				sdpMLineIndex: data.label,
				candidate: data.candidate
			});
			pc.addIceCandidate(candidate);	
		
		}else{
			console.log('the message is invalid!', data);
		
		}
	
	});


	roomid = getQueryVariable('room');
	socket.emit('join', roomid);

	return true;
}

function connSignalServer(){
	
	//开启本地视频
	start();

	return true;
}

function getMediaStream(stream){

	if(localStream){
		stream.getAudioTracks().forEach((track)=>{
			localStream.addTrack(track);	
			stream.removeTrack(track);
		});
	}else{
		localStream = stream;	
	}

	localVideo.srcObject = localStream;
	localVideo.srcObject = localStream;

	//这个函数的位置特别重要，
	//一定要放到getMediaStream之后再调用
	//否则就会出现绑定失败的情况
	conn();
}

function getDeskStream(stream){
	localStream = stream;
}

function handleError(err){
	console.error('Failed to get Media Stream!', err);
}

function shareDesk(){

	if(IsPC()){
		navigator.mediaDevices.getDisplayMedia({video: true})
			.then(getDeskStream)
			.catch(handleError);

		return true;
	}

	return false;

}

function start(){

	if(!navigator.mediaDevices ||
		!navigator.mediaDevices.getUserMedia){
		console.error('the getUserMedia is not supported!');
		return;
	}else {

		var constraints;

		if( shareDeskBox.checked && shareDesk()){

			constraints = {
				video: false,
				audio:  {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			}

		}else{
			constraints = {
				video: true,
				audio:  {
					echoCancellation: true,		//回音消除
					noiseSuppression: true,		//降噪
					autoGainControl: true		//自动增益控制
				}
			}
		}

		navigator.mediaDevices.getUserMedia(constraints)
					.then(getMediaStream)
					.catch(handleError);
	}

}

function getRemoteStream(e){
	remoteStream = e.streams[0];
	remoteVideo.srcObject = e.streams[0];
	remoteAudio.srcObject = e.streams[0];
}

function handleOfferError(err){
	console.error('Failed to create offer:', err);
}

function handleAnswerError(err){
	console.error('Failed to create answer:', err);
}

function getAnswer(desc){
	pc.setLocalDescription(desc);
	answer.value = desc.sdp;

	bandwidthSelect.disabled = false;

	//send answer sdp
	sendMessage(roomid, desc);
}

function getOffer(desc){
	pc.setLocalDescription(desc);
	offer.value = desc.sdp;
	offerdesc = desc;

	//send offer sdp
	sendMessage(roomid, offerdesc);	

}

function createPeerConnection(){

	console.log('create RTCPeerConnection!');
	if(!pc){
		pc = new RTCPeerConnection(pcConfig);

		pc.onicecandidate = (e)=>{

			if(e.candidate) {
				sendMessage(roomid, {
					type: 'candidate',
					label:event.candidate.sdpMLineIndex, 
					id:event.candidate.sdpMid, 
					candidate: event.candidate.candidate
				});
			}else{
				console.log('this is the end candidate');
			}
		}

		pc.ontrack = getRemoteStream;
	}else {
		console.warning('the pc have be created!');
	}

	return;	
}

//绑定永远与 peerconnection在一起，
//所以没必要再单独做成一个函数
function bindTracks(){

	console.log('bind tracks into RTCPeerConnection!');

	if( pc === null || pc === undefined) {
		console.error('pc is null or undefined!');
		return;
	}

	if(localStream === null || localStream === undefined) {
		console.error('localstream is null or undefined!');
		return;
	}

	//add all track into peer connection
	localStream.getTracks().forEach((track)=>{
		pc.addTrack(track, localStream);	
	});

}

function call(){
	
	if(state === 'joined_conn'){

		var offerOptions = {
			offerToRecieveAudio: 1,
			offerToRecieveVideo: 1
		}

		pc.createOffer(offerOptions)
			.then(getOffer)
			.catch(handleOfferError);
	}
}

function hangup(){

	if(pc) {

		offerdesc = null;
		
		pc.close();
		pc = null;
	}

}

function closeLocalMedia(){

	if(localStream && localStream.getTracks()){
		localStream.getTracks().forEach((track)=>{
			track.stop();
		});
	}
	localStream = null;
}

function leave() {

	if(socket){
		socket.emit('leave', roomid); //notify server
	}

	hangup();
	closeLocalMedia();

	offer.value = '';
	answer.value = '';
	btnConn.disabled = false;
	btnLeave.disabled = true;
}

btnConn.onclick = connSignalServer
btnLeave.onclick = leave;
