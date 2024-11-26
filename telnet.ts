import {readFileSync} from "fs";
import MySocket from "./mySocket.js";
import Player from "./player.js";
import prompt from "./prompt.js";
import ssh2 from "ssh2";


const willowASSCI = JSON.parse(readFileSync("willow.json", {encoding: "utf8"}))["DurMovie"].frames[0].contents.join("\r\n")
console.log(willowASSCI);
interface socketMap {
  [id : string] : MySocket;
}


// Convert this to connectedPlayers sometime soon and move away from "sockets"
export const connectedSockets: socketMap = {};
export function getConnectedSockets () : MySocket[]{
  return Object.values(connectedSockets);
}



const server = new ssh2.Server({
  hostKeys: [readFileSync("private")],
  banner: willowASSCI
},function (client, info){
  console.log("New connection from " + info.ip + ":" + info.port);
  let username = "";
  client.on("error", () => {
    client.end();
  })

  client.on('authentication', (ctx: ssh2.PasswordAuthContext) => {
    if (ctx.method != "password"){
      ctx.reject();
      return;
    }

    if (Player.playerList[ctx.username]){
		  if (Player.playerList[ctx.username].checkPassword(ctx.password)){
            username = ctx.username;
            ctx.accept();
            return;
          }
	}
	ctx.reject();
  }).on("ready", () => {
    console.log('Client ' + info.ip + ":" + info.port + ' authenticated');
    client.on("session", (accept) => {
      const session = accept();
      session.once("pty", (accept) => accept());
      session.once("shell", (accept) => {
        let connection : ssh2.Channel = accept();
        let socket = new MySocket(connection, info);
        socket.player = Player.playerList[username];
        connectedSockets[socket.id] = socket;
        socket.clearScreen();
        socket.send(Buffer.from(willowASSCI));
        socket.broadcast(socket.player.name + " has connected");
        setTimeout(() => {
          socket.broadcast(socket.player.name + " has connected");
          socket.initiateChat();
          socket.broadcast(socket.player.name + " has joined the chat");
          connectedSockets[socket.id] = socket;
          socket.send('Welcome!');
      });
      });
    })
}).on("close", () => {
    console.log('Client ' + info.ip + ":" + info.port + ' disconnected');
  })
})
server.listen('22');


// const telnetServer : net.Server = net.createServer(async (s: net.Socket) => {
//   console.log("New connection from " + s.remoteAddress);
//   const socket: MySocket = new MySocket(s);
//
//
//   if (await login(socket)) {
//     socket.clearScreen();
//     socket.send(Buffer.from(willowASSCI));
//     socket.broadcast(socket.player.name + " has connected");
//     setTimeout(() => {
//       socket.broadcast(socket.player.name + " has connected");
//       socket.initiateChat()
//       socket.broadcast(socket.player.name + " has joined the chat");
//       connectedSockets[socket.id] = socket;
//       socket.send('Welcome!');
//     }, 2000);
//   } else {
//     console.log("Connection " + socket.id + " has failed authentication.");
//     await socket.close();
//   }
// })

/*
async function login(socket):Promise<boolean> {

  async function* gen() : AsyncGenerator<string | undefined> {
    let res;
    socket.initiateChat(msg => {
      if (msg == ";quit") {
        return undefined;
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

  async function ask() {
    return (await input.next().catch(e => {throw e})).value
  }

  let input = gen();
  while (true) {
    socket.send("username: ");
    let username = await ask();
    if (typeof username == "undefined") return false;
    if (Player.playerList[username]) {
      if (Player.playerList[username].hasPassword()){
        while (true) {
          socket.send("password: ");
          let password = await ask();
          if (typeof username == "undefined") return false;
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
        let password = await ask();
        socket.player.setPassword(password);
        return true;
      }
    }
    socket.send("user does not exist.")
  }
}
*/

export function removeSocket (socket : MySocket) {
  delete connectedSockets[socket.id];
}


process.on('exit', async () => {
  isDone = true;
  for (const socket of getConnectedSockets()) {
    await socket.close();
  }
  Player.loadPlayerData();
  server.close();
  console.log("Program exited.");
  });


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
