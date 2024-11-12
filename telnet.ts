import * as net from "node:net";
class MySocket{
  private readonly socket: net.Socket;
  public name: string;

  constructor(socket:net.Socket, needConnected = true){
    this.socket = socket;
    this.name = this.socket.remoteAddress;
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
    let newSocket:MySocket = new MySocket(this.socket, false);
    let socketsWithoutThis:MySocket[] = connectedSockets.filter(s => s != this);

    newSocket.emit = (msg) => {
      socketsWithoutThis.forEach(s => s.send(msg));
    }
    return newSocket;
  }
}



let inactiveSockets : MySocket[] = [];
let connectedSockets : MySocket[] = [];

const telnetServer : net.Server = net.createServer((s:net.Socket) => {
  const socket:MySocket = new MySocket(s);
  socket.send('Welcome!');
})

process.on('exit', () => {
  telnetServer.close();
});

telnetServer.listen(23);