var namespace = (function () {

  var holder = document.getElementById('holder')
    , socket = io.connect('http://localhost:8001')
    , locationPath = location.pathname.substr(1).split('/')
    , filesList = {}
    , printFileLink = function (data, placeholder) {
        var fileWrapper = document.createElement('div')
          , fileItem = document.createElement('span')
          , fileLink = document.createElement('a');

        fileWrapper.className = 'muted';
        fileItem.innerHTML = data.file+' (size: '+data.size+', type: '+data.type+')';
        fileLink.href = '#';
        fileLink.dataset.filename = data.file;
        fileLink.download = data.file;
        fileLink.innerHTML = 'Load this file';

        fileWrapper.appendChild(fileItem);
        filesList[data.file].link = fileWrapper.appendChild(fileLink);
        placeholder.appendChild(fileWrapper);
      }
    , dataURLToBlob = function (dataURL) {
        // https://github.com/ebidel/filer.js/blob/master/src/filer.js#L128
        var BASE64_MARKER = ';base64,';
        if (dataURL.indexOf(BASE64_MARKER) == -1) {
          var parts = dataURL.split(',');
          var contentType = parts[0].split(':')[1];
          var raw = parts[1];

          return new Blob([raw], {type: contentType});
        }

        var parts = dataURL.split(BASE64_MARKER);
        var contentType = parts[0].split(':')[1];
        var raw = window.atob(parts[1]);
        var rawLength = raw.length;

        var uInt8Array = new Uint8Array(rawLength);

        for (var i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], {type: contentType});
      }
    ;

  holder.addEventListener('click', function (event) {
    var target = event.target
      , dataset = target.dataset
      , file = filesList[dataset.filename];

    if (file.isReady) {
      target.href = window.URL.createObjectURL(dataURLToBlob(file.content));
      target.target = '_blank';
      target.removeEventListener('click', arguments.callee);
    } else {
      event.preventDefault();
      event.stopPropagation();
      socket.emit('peerReceiveStart', {
        name: file.name
      });
    }
  });

  socket.emit('join', {
    room: locationPath[1]
  });

  socket.on('hostFilesAvailible', function (data) {
    for (var i = 0; i < data.length; i++) {
      filesList[data[i].file] = {
        name: data[i].file,
        size: data[i].size,
        type: data[i].type,
        content: '',
        isReady: false
      };
      printFileLink(data[i], holder);
    };
  });

  socket.on('hostFilesUpdated', function (data) {
    filesList[data.file] = {
      name: data.file,
      size: data.size,
      type: data.type,
      content: '',
      isReady: false
    };
    printFileLink(data, holder);
  });

  socket.on('peerReceivingFile', function (data) {
    filesList[data.name].isReady = data.isReady;
    filesList[data.name].content += data.content;

    if (!data.isReady) {
      socket.emit('peerReceiveReady', {
        name: data.name
      });
    } else {
      filesList[data.name].link.parentNode.className = 'text-success';
      filesList[data.name].link.innerHTML = 'Save on disk';
    }
  });

  return {
    files: filesList,
    dataURLToBlob: dataURLToBlob
  }

})();