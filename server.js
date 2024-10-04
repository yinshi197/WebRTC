'use strict'    //使用最严格的javas源码语法

//引入模块
var http = require('http');
var https = require('https');
var fs = require('fs');

var socketIO = require('socket.io');

var USERCONT = 3;

//日志
var log4js = require('log4js');

log4js.configure({
        appenders: {
            file: {
                type: 'file',
                filename: 'app.log',
                layout: {
                    type: 'pattern',
                    pattern: '%r %p - %m',
                }
            }
        },
        categories: {
           default: {
              appenders: ['file'],
              level: 'debug'
           }
        }
    });
    
var logger = log4js.getLogger();

//用于处理web服务的模块
var express = require('express');
//可以将整个目录发布，通过浏览器浏览
var serveIndex = require('serve-index');

//创建express实例(对象)
var app = express();
//添加发布目录，浏览
app.use(serveIndex('./public'));
//发布静态目录，显示
app.use(express.static('./public'));

//http server,参数可以传入匿名函数或者express实例(对象)
var http_server = http.createServer(app);
//http_server.listen(80, '127.0.0.1');

var options = {
        key : fs.readFileSync('yinshi197.cn.key'),
        cert: fs.readFileSync('yinshi197.cn.pem')
}

//https server 参数需要比http多一个fs option(证书和密钥)
var https_server = https.createServer(options, app);
//绑定socket.io,建立联系 bind
//var io = socketIO.listen(https_server);     //使用低版本npm install socket.io@2.0.4
var io = socketIO(https_server);              //出现不兼容问题，可以选择减低socket.io版本
//处理connection事件
io.sockets.on('connection', (socket)=>{

        socket.on('message', (room, data)=>{
		socket.to(room).emit('message', room, data);
	});

        socket.on('join', (room)=>{
                socket.join(room);
                var myRoom = io.sockets.adapter.rooms.get(room); //应用层确保room是唯一标识
                var users = myRoom ? myRoom.size : 0;; // 检查myRoom是否存在
                logger.log('join-the number of user in room is: ' + users); 
                
                if(users < USERCONT){
                        socket.emit('joined', room, socket.id); //给当前加入用户回消息
                        
                        if(users > 1){
                                socket.to(room).emit('otherjoin', room);
                        }
                }else{
                        socket.leave(room);
                        socket.emit('full', room, socket.id);
                }

                //socket.to(room).emit('joined', room, socket.id) //给当前房间除当前加入用户的所有用户回消息
                //io.in(room).emit('joined', room, socket.id)   //给当前房间的所有用户回消息
                //socket.broadcast.emit('joined', room, socket.id) //除自己外,给当前站点所有人回消息
        })

        socket.on('leave', (room)=>{
                var myRoom = io.sockets.adapter.rooms.get(room); //应用层确保room是唯一标识
                var users = myRoom ? myRoom.size : 0; // 检查myRoom是否存在
                //users - 1
                logger.log('leave-the number of user in room is: ' + (users - 1));
                //socket.leave(room);
                socket.emit('leaved', room, socket.id); //给当前用户回消息
                socket.to(room).emit('bye', room, socket.id) //给当前房间除当前用户的所有用户回消息
                //io.in(room).emit('leaved', room, socket.id)   //给当前房间的所有用户回消息
                //socket.broadcast.emit('leaved', room, socket.id) //除自己外,给当前站点所有人回消息
        })
})

https_server.listen(443, '0.0.0.0');