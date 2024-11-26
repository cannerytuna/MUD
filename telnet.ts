import * as fs from "fs";
import MySocket from "./mySocket.js";
import Player from "./player.js";
import prompt from "./prompt.js";
import ssh2 from "ssh2";
import * as fm from "node:fs/promises"


const willowASSCI : string = fs.readFileSync("willow.txt", {encoding: "utf8"});
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
  hostKeys: [fs.readFileSync("private")],
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
          socket.send();
          socket.send('Connected to chat.');
      }, 2000);
      });
    })
}).on("close", () => {
    console.log('Client ' + info.ip + ":" + info.port + ' disconnected');
  })
})
server.listen(22);

async function grabIntros() : Promise<{}> {
	let files : string[] = fs.readdirSync("./texts/"); 
	let one = files.filter(f => f.includes("one"));
	let couple = files.filter(f => f.includes("couple"));
	let nobody = files.filter(f => f.includes("nobody"));
	return {nobody, one, couple};
}

const texts = grabIntros();
function randomize(f : Array<any>) : any  { return (function () {
	const r = Math.random() * this.length;
	return this[Math.floor(r)];
}).bind(f)};



async function welcome() : Promise<string> {
	let type : string;
	switch(getConnectedSockets().length) {
	case 1:
		type = "nobody";
		break;
	case 2:
		type = "one";
		break;
	default:
		type = "couple";
	}
	let v = texts[type];
	return (await fm.readFile(randomize(v))).toString();
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
