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
}

function disconnect(reason, socket){
	updateUserCount(socket, io.engine.clientsCount);
}

function updateUserCount(socket, amount){
	io.sockets.emit('user-count-change', amount);
}

io.on('connection', onConnection);


http.listen(port, () => console.log('listening on port ' + port));