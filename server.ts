import * as fs from "fs";
import MySocket from "./mySocket.js";
import Player from "./player.js";
import Room from "./room.js";
import prompt from "./prompt.js";
import ssh2 from "ssh2";
import * as fm from "node:fs/promises"


const willowASSCI : string = fs.readFileSync("willow.txt", {encoding: "utf8"});
console.log(willowASSCI);
interface socketMap {
  [id : string] : MySocket;
}

Player.readPlayerData();
Room.setupRooms();


// Convert this to connectedPlayers sometime soon and move away from "sockets"
export const connectedSockets: socketMap = {};
export function getConnectedSockets () : MySocket[]{
  return Object.values(connectedSockets);
}
let playersWhoJoinedToday = [];

// runs at 6 am every day
function newDay() {
  const now = new Date();
  let milisecondsUntil : number = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0,0,0).getMilliseconds() - now.getMilliseconds();
  if (milisecondsUntil < 0)
    milisecondsUntil += 86400000;
  setTimeout(() => {
    playersWhoJoinedToday = [];

    newDay();
  }, milisecondsUntil)
  
}
newDay();


const server = new ssh2.Server({
  hostKeys: [fs.readFileSync("private")]
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
      if (!Player.playerList[ctx.username].hasPassword()) {
        console.log("no password yo");
      ctx.requestChange("Enter new password: ", (newPassword) => {
          Player.playerList[ctx.username].setPassword(newPassword);
          username = ctx.username;
          ctx.accept();
      });
      } else if (Player.playerList[ctx.username].checkPassword(ctx.password)){
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
      session.once("shell", async (accept) => {
        let connection : ssh2.Channel = accept();
       socketIntialization(connection, info, username); 
      });
    })
}).on("close", () => {
    console.log('Client ' + info.ip + ":" + info.port + ' disconnected');
  })
})
server.listen(22);

async function socketIntialization (connection : ssh2.Channel, info : ssh2.ClientInfo, username : string) {
  let socket = new MySocket(connection, info);
  socket.connectPlayer(username);
  connectedSockets[socket.id] = socket;
  socket.clearScreen();
  socket.send(await welcome(socket.player));
  socket.broadcast(socket.player.name + " has connected");
  setTimeout(() => {
    socket.broadcast(socket.player.name + " has connected");
    socket.initiateChat();
    socket.broadcast(socket.player.name + " has joined the chat");
    connectedSockets[socket.id] = socket;
    socket.send();
    socket.send('Connected to chat.');
  }, 2000);
}


function grabIntros() : {} {
	let files : string[] = fs.readdirSync("./texts/"); 
	let one = files.filter(f => f.includes("one"));
	let couple = files.filter(f => f.includes("couple"));
	let nobody = files.filter(f => f.includes("nobody"));
	return {nobody, one, couple};
}
const texts = grabIntros();
Object.keys(texts).forEach(t => texts[t] = texts[t].map((p : string) => "./texts/" + p));

function randomize(f : Array<any>) : any  {
	const r = Math.random() * f.length;
	return f[Math.floor(r)];
};



async function welcome(p : Player) : Promise<string> {
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

  if (p.username in playersWhoJoinedToday) {
    return (
      `You've tuned back in. ${type == "couple" ? "All of your friends are here." : (type == "one" ? "Someone is here." : "You are by yourself.")}`
    )
  }

	let v = texts[type];
  let str = (await fm.readFile(randomize(v), {encoding: "utf8"}));
  let words = str.split(" ");
  let buffer = [];
  let result = "";
  for (let i = 1; i < words.length; i++) {
      buffer.push(words[i - 1]);
      if (buffer.join(' ').length + words[i].length >=  50) {
        result += buffer.join(" ") + "\n\r";
      }
  }
  if (buffer.length != 0) {
    result += buffer.join(" ") + " " + words[words.length - 1] + "\n\r";
  } else {
    result += words[words.length - 1];
  }

  playersWhoJoinedToday.push(p.username);
	return willowASSCI + "\n\r\n\r"  + result; 
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
  if(isDone)
    return;
  Player.loadPlayerData();
  setTimeout(saveCycle, 7200000);
}
setTimeout(saveCycle, 7200000);

async function consoleCommand() {
  let cmd = await prompt("cmd:");
  let cmdArr = cmd.split(' ');
  let username = "";
  switch (cmdArr[0]){
    case "delete":
        username = await prompt("username: ");
        delete Player.playerList[username];
      console.log(Player.playerList);
        break;
    case "create":
      username = await prompt("username: ");
      let player = new Player(username);
      Player.playerList[username] = player;
      console.log(Player.playerList);
      break;
    case "quit":
      process.exit();
  }

  if(isDone)
    return;
  consoleCommand();
}
consoleCommand();
