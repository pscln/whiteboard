const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 8080;

app.use(express.static(__dirname + '/public'));

function onConnection(socket){
	updateUserCount(socket, io.engine.clientsCount);

	socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
	socket.on("disconnect", (reason) => {
    	disconnect(reason, socket);
  	});
	
	socket.on('login-username', (data) => handleLogin(data.userName, socket));
}

function disconnect(reason, socket){
	if(socket.user == null){
		return;
	}
	
	io.sockets.emit('user-disconnect', {user: socket.user.name, id: socket.user.id});
	updateUserCount(socket, io.engine.clientsCount);
}

function updateUserCount(socket, amount){
	io.sockets.emit('user-count-change', amount);
}

function handleLogin(userName, socket){
	var confirm = true;
	socket.user = {name: userName, id: randomId()};
	socket.broadcast.emit('user-login', {user: userName, id: socket.user.id});
	
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
		socket.emit('user-login-confirm', {});
	}
}

function randomId(){
  return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
}

io.on('connection', onConnection);

http.listen(port, () => console.log('listening on port ' + port));