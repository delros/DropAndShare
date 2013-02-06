var config = require('config')
  , fs = require('fs')
  , express = require('express')
  , http = require('http')
  , connect = require('connect')
  , io = require('socket.io')
  , app = express()
  , server = http.createServer(app)
  , sio = io.listen(server)
  ;


app.use(express.static(__dirname + '/app/public'));

app.set('port', config.server.port);
app.set('views', __dirname + '/app/views');
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.redirect('/upload/' + Math.random().toString(36).substr(2));
});
app.get('/upload/:hash', function (req, res) {
  res.render('upload', {
    shareLink: 
      'http://' +
      config.server.domain +
      ':' +
      config.server.port +
      '/download/' +
      req.params.hash
  });
});
app.get('/download/:hash', function (req, res) {
  res.render('download');
});

server.listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});


sio.set('log level', 1); 
sio.sockets.on('connection', function (socket) {

  socket.on('join', function (data) {
    console.log('Joined the room with ID=\''+data.room+'\'');
    socket.join(data.room);
    socket.room = data.room;

    if (sio.sockets.clients(data.room).length == 1) {
      socket.files = [];
    } else {
      socket.hoster = sio.sockets.clients(data.room)[0];
      // sio.sockets.clients(data.room)[0].peer = socket;

      if (socket.hoster.files.length) {
        socket.emit('hostFilesAvailible', socket.hoster.files); 
      }
    }
  });

  socket.on('hostSendReady', function (data) {
    // console.log('Host is ready to send the file', data);
    socket.files.push(data);
    sio.sockets.in(socket.room).emit('hostFilesUpdated', data);
  });

  socket.on('hostTransferingFile', function (data) {
    sio.sockets.in(socket.room).emit('peerReceivingFile', data);
  });
 
  socket.on('peerReceiveStart', function (data) {
    // console.log('Peer asked for file '+data.name);
    socket.hoster.emit('hostTransferReady', data);  
  });

  socket.on('peerReceiveReady', function (data) {
    // console.log('Continue transfering '+data.name);
    socket.hoster.emit('hostTransferReady', data);  
  });

  socket.on('disconnect', function(){
    console.log('A socket disconnected.');
  });

});