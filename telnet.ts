import * as net from "net";
import {MySocket} from "./mySocket.js";

interface socketMap {
  [id : string] : MySocket;
}

export const connectedSockets: socketMap = {};
export function getConnectedSockets () : MySocket[]{
  return Object.values(connectedSockets);
}

const telnetServer : net.Server = net.createServer((s:net.Socket) => {
  const socket:MySocket = new MySocket(s);
  connectedSockets[socket.id] = socket;
  console.log(connectedSockets);
  socket.send('Welcome!');
})
export function removeSocket (socket) {
  delete connectedSockets[socket.id];
}

process.on('exit', async () => {
  // @ts-ignore
  for (const socket of getConnectedSockets()) {
    // @ts-ignore
    await socket.close();
  }
  telnetServer.close();
});

telnetServer.listen(23);