const net = require('node:net');
const {EventEmitter} = require('node:events');

class MySocket{
  constructor(socket, needConnected = true){
    this.socket = socket;
    if (!needConnected){
      return
    }

    connectedSockets.push(this);

    let bufArr = [];
    this.socket.on('data', (buf) => {
      if (buf.toString() == "\r\n"){
        this.checkMessage(bufArr.join(''));
        bufArr = [];
      } else {
        bufArr.push(buf);
      }
    })

  }

  checkMessage(msg) {
    let char = msg.charAt(0);
    let sendBack = '';
    let result = '';

    switch(char) {
      case ';':
        break;
      case ':':
        break;
      default:
        result = this.socket.remoteAddress + " Says, " + msg;
        sendBack = "You said, " + msg;
    }

    this.messageUpdate(result);
    this.send(sendBack);
  }



  messageUpdate(msg){
    this.broadcast.emit(msg);
  }

  send(msg){
  this.socket.write(msg);
  this.socket.write("\r\n");
  }

  emit(msg) {
    connectedSockets.forEach(s => s.send(msg));
  }


  get broadcast() {
    let newSocket = new MySocket(this.socket, false);
    let socketsWithoutThis = connectedSockets.filter(s => s != this);

    newSocket.emit = (msg) => {
      socketsWithoutThis.forEach(s => s.send(msg));
    }
    return newSocket;
  }
}



let inactiveSockets = [];
let connectedSockets = [];

const telnetServer = net.createServer((socket) => {
  socket = new MySocket(socket);
  socket.send('Welcome!');
})

process.on('exit', () => {
  telnetServer.close();
});

telnetServer.listen(23);