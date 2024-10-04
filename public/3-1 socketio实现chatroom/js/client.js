'use strict'

//获取页面元素
var userName = document.querySelector('input#username');
var inputRoom = document.querySelector('input#room');
var btnConnect = document.querySelector('button#connect');
var btnLeave = document.querySelector('button#leave');
var outputArea = document.querySelector('textarea#output');
var inputArea = document.querySelector('textarea#input');
var btnSend = document.querySelector('button#send');

var socket;
var room;

btnConnect.onclick = ()=>{
    //connect
    socket = io.connect();

    //recieve message,侦听
    socket.on('joined', (room, id) =>{
        btnConnect.disabled = true;
        btnLeave.disabled = false;
        btnSend.disabled = false;
        inputArea.disabled = false;
    });

    socket.on('leaved', (room, id) =>{
        btnConnect.disabled = false;
        btnLeave.disabled = true;
        btnSend.disabled = true;
        inputArea.disabled = true;

        socket.disconnect();
    });
    
    socket.on('message', (room, id, data) =>{
        outputArea.value = outputArea.value + data + '\r';
    });

    //send message
    room = inputRoom.value;
    socket.emit('join', room);
}

btnSend.onclick = ()=>{
    var data = inputArea.value;
    data = userName.value + ':' + data;
    socket.emit('message', room, data);
    inputArea.value = '';
}

btnLeave.onclick = ()=>{
	room = inputRoom.value;
	socket.emit('leave', room);
}

inputArea.onkeypress = (event)=> {
    //event = event || window.event;
    if (event.keyCode == 13) { //回车发送消息
	var data = inputArea.value;
	data = userName.value + ':' + data;
	socket.emit('message', room, data);
	inputArea.value = '';
	event.preventDefault();//阻止默认行为
    }
}
