import * as net from "net";
import MySocket from "./mySocket.js";
import Player from "./player.js";
import prompt from "./prompt.js"

interface socketMap {
  [id : string] : MySocket;
}


// Convert this to connectedPlayers sometime soon and move away from "sockets"
export const connectedSockets: socketMap = {};
export function getConnectedSockets () : MySocket[]{
  return Object.values(connectedSockets);
}

const telnetServer : net.Server = net.createServer(async (s: net.Socket) => {
  const socket: MySocket = new MySocket(s);

  try {
    if (await login(socket))
      setTimeout(() => {
        socket.broadcast(socket.player.name + " has connected");
        socket.initiateChat()
        socket.broadcast(socket.player.name + " has joined the chat");
        connectedSockets[socket.id] = socket;
        socket.clearScreen();
        socket.send('Welcome!');
      }, 2000);
  } catch (e) {
    console.log("Connection " + socket.id + " has failed authentication.");
  }
})

async function login(socket):Promise<boolean> {

  async function* gen() : AsyncGenerator<string> {
    let res;
    socket.initiateChat(msg => {
      if (msg == ";quit") {
        throw Error;
      }
      else
        res(msg);
    });

    while(true) {
      yield await new Promise(resolve => {
        res = resolve;
      })
    }
  }

  let input = gen();
  while (true) {
    socket.send("username: ");
    let username = (await input.next()).value;
    if (Player.playerList[username]) {
      if (Player.playerList[username].hasPassword()){
        while (true) {
          socket.send("password: ");
          let password = (await input.next()).value;
          if (Player.playerList[username].checkPassword(password)){
            socket.player = Player.playerList[username];
            return true;
          }
          socket.send("password incorrect.");
        }
      } else {
        socket.player = Player.playerList[username];
        socket.send("new user detected!");
        socket.send("please choose a new password, please choose carefully, you will have to ask to have it changed in the future.");
        socket.send("new password: ");
        let password = (await input.next()).value;
        socket.player.setPassword(password);
        return true;
      }
    }
    socket.send("user does not exist.")
  }
}

export function removeSocket (socket : MySocket) {
  delete connectedSockets[socket.id];
}


process.on('exit', async () => {
  isDone = true;
  for (const socket of getConnectedSockets()) {
    await socket.close();
  }
  Player.loadPlayerData();
  telnetServer.close();
  console.log("Program exited.");
  });

telnetServer.listen(23);


let isDone = false;


async function saveCycle() {
  Player.loadPlayerData();
  setTimeout(saveCycle, 7200000);
}
setTimeout(saveCycle, 7200000);

async function consoleCommand() {
  let cmd = await prompt("cmd:");
  let cmdArr = cmd.split(' ');
  switch (cmdArr[0]){
    case "create":
      let username = await prompt("username: ");
      let player = new Player(username);
      Player.playerList[username] = player;
      console.log(Player.playerList);
      break;
    case "quit":
      process.exit();
      break;
  }

  if(isDone)
    return;
  consoleCommand();
}
consoleCommand();
