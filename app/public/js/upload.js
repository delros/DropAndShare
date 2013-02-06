var namespace = (function () {

  var holder = document.getElementById('holder')
    , state = document.getElementById('status')
    , socket = io.connect('http://localhost:8001')
    , loader = document.createElement('i')
    , locationPath = location.pathname.substr(1).split('/')
    , filesList = {}
    , chunkSize = 10000
    , printFileItem = function (data, placeholder) {
        var fileItem = document.createElement('div');

        fileItem.dataset.filename = data.file;
        fileItem.innerHTML = 
          data.file
          +' (size: '
          +data.size
          +', type: '
          +data.type
          +')';

        return placeholder.appendChild(fileItem);
      }
    ;

  socket.emit('join', {
    room: locationPath[1]
  });

  socket.on('hostFilesUpdated', function (data) {
    var el = printFileItem(data, holder);
    filesList[data.file].el = el;
  });
  

  var tempChunk = {
    start: 0,
    end: chunkSize
  };

  var getChunk = function (params) {
    var isReady = false
      , chunk = ''
      ;

    if (tempChunk.end >= params.content.length) {
      tempChunk.end -= (tempChunk.end - params.content.length);
      isReady = true;
    }

    chunk = params.content.slice(tempChunk.start, tempChunk.end);

    tempChunk.start = tempChunk.end;
    tempChunk.end += chunkSize;

    if (isReady) {
      tempChunk = {
        start: 0,
        end: chunkSize,
        isReady: false
      }
    }

    return {
      content: chunk,
      isReady: isReady
    }
  }

  socket.on('hostTransferReady', function (data) {
    var chunk = getChunk({
      content: filesList[data.name].content
    });

    socket.emit('hostTransferingFile', {
      name: data.name,
      content: chunk.content,
      isReady: chunk.isReady
    });
  });

   
  holder.ondragover = function () { 
    this.className = 'hover'; 
    return false; 
  };

  holder.ondragend = function () { 
    this.className = ''; 
    return false; 
  };

  holder.ondrop = function (event) {
    var self = this;

    self.className = '';
    event.preventDefault();

    for (var i = 0; i < event.dataTransfer.files.length; i++) {
      (function () {
        var file = event.dataTransfer.files[i]
          , reader = new FileReader()
          ;

        reader.onload = function (event) {
          filesList[file.name] = {
            name: file.name,
            size: file.size,
            type: file.type,
            content: event.target.result
          };
          socket.emit('hostSendReady', {
            type: file.type,
            size: file.size,
            file: file.name
          });
        };

        reader.readAsDataURL(file);
      })();
    }

    return false;
  };

  return {
    files: filesList
  }

})(); 