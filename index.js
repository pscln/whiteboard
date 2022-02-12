const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 8080;

app.use(express.static(__dirname + '/public'));

const { createCanvas, loadImage } = require('canvas')
const canvas = createCanvas(1280, 720)
const ctx = canvas.getContext('2d')

const width = 1280;
const height = 720;

clientCount = 0;

function onConnection(socket){
	socket.on('drawing', (data) => {
		handleDrawing(data);
		socket.broadcast.emit('drawing', data);
	});
	
	socket.on("disconnect", (reason) => {
    	disconnect(reason, socket);
  	});

	socket.on('resize', () => {
		resize(socket);
	});

	socket.on('login-username', (data) => handleLogin(data.userName, socket));
}

function disconnect(reason, socket){
	if(socket.user == null){
		return;
	}
	
	io.sockets.emit('user-disconnect', {user: socket.user.name, id: socket.user.id});
	clientCount = Math.max(clientCount - 1, 0);
	updateUserCount(socket, clientCount);
}

function updateUserCount(socket){
	io.sockets.emit('user-count-change', clientCount);
}

function handleLogin(userName, socket){
	var confirm = true;
	socket.user = {name: userName, id: randomId()};
	
	// check if user name is empty string
	if(userName == ""){
		socket.emit('user-login-invalid', {});
		confirm = false;
	}

	// check if name already exists
	io.sockets.sockets.forEach(client => {
		if(socket != client && client.user != null && userName == client.user.name){
			socket.emit('user-login-exists', {});
			confirm = false;
		}
	});
	
	io.sockets.sockets.forEach(client => {
		if(client.user != null && client.user.id != socket.user.id){
			socket.emit('user-login', {user: client.user.name, id: client.user.id});
		}
	});
	
	if(confirm){
		clientCount ++;
		updateUserCount(socket);
		socket.broadcast.emit('user-login', {user: userName, id: socket.user.id});
		socket.emit('user-login-confirm', {});
		resize(socket);
	}
}

function randomId(){
  return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
}

function resize(socket){
	var data = ctx.getImageData(0, 0, width, height).data.buffer;
	socket.emit('resize', {image: data});
}

function handleDrawing(data){
	ctx.beginPath();
    ctx.moveTo(data.x0 * width, data.y0 * height);
    ctx.lineTo(data.x1 * width, data.y1 * height);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}

function fadeOut(){
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, 0, width, height);
    setTimeout(fadeOut, 1000);
}


io.on('connection', onConnection);

http.listen(port, () => console.log('listening on port ' + port));

fadeOut();