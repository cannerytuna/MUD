import * as fs from "fs";
import MySocket from "./mySocket.js";
import Player from "./player.js";
import Room from "./room.js";
import prompt from "./prompt.js";
import ssh2 from "ssh2";
import * as fm from "node:fs/promises"



// Setting port for testing purposes
let port = 22;
if (process.argv[2]) {
  port = Number(process.argv[2]);
}

// Little logo for start in memory
const willowASSCI :string = fs.readFileSync("willow.txt", {encoding: "utf8"});
console.log(willowASSCI);



//Initialize variables from previous sessions
Player.loadPlayerData();
Room.setupRooms();

//Map of all connected sessions
interface socketMap {
  [id :string] :MySocket;
}
export const connectedSockets: socketMap = {};
export function getConnectedSockets () :MySocket[]{
  return Object.values(connectedSockets);
}
let playersWhoJoinedToday :string[] = [];

// runs at 6 am every day
function newDay() {
  const now = new Date();
  let millisecondsUntil :number = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0,0,0).getMilliseconds() - now.getMilliseconds();
  if (millisecondsUntil < 0)
    millisecondsUntil += 86400000;
  setTimeout(() => {
    playersWhoJoinedToday = [];
    newDay();
  }, millisecondsUntil)

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

    if (Player.isPlayer(ctx.username)){
      username = ctx.username;
      let p = Player.playerList[ctx.username];
      if (!p.hasPassword()) {
        console.log(ctx.username + " does not have a password, prompting reset.");
        ctx.accept();
        return;
      } else if (p.checkPassword(ctx.password)){
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
        let connection :ssh2.Channel = accept();
        socketInitialization(connection, info, username);
      });
    })
}).on("close", () => {
    console.log('Client ' + info.ip + ":" + info.port + ' disconnected');
  })
})
server.listen(port);

async function socketInitialization (connection :ssh2.Channel, info :ssh2.ClientInfo, username :string) {
  console.log(username);
  let socket = new MySocket(connection, info);
  socket.connectPlayer(username);
  connectedSockets[socket.id] = socket;
  socket.clearScreen();

  if (!socket.player.hasPassword()) {
    let password :string  = await new Promise((resolve) => {
      let count = 0;
      let newPass :string = null;
      socket.send("New password: ");
      socket.initiateChat( (msg: string) => {
        if (count == 1 && msg == newPass) {
          resolve(newPass);
        }
        count++;
        switch (count) {
          case 1:
            newPass = msg;
            socket.send("Repeat password: ");
            break;
          default:
            socket.send("Something wrong occurred. New password: ");
            count = 0;
        }
      });
    });
    socket.player.setPassword(password);
    Player.savePlayerData();
  }

  socket.send(await welcome(socket.player));
  socket.broadcast("You feel a disturbance.");
  setTimeout(() => {
    socket.initiateChat();
    socket.broadcast(socket.player.name + " is in the treehouse.");
    connectedSockets[socket.id] = socket;
    socket.send();
    socket.send('You are here with the willow.');
    socket.send(Room.spawn.desc)
  }, 1); //fix
}


function grabIntros() :{} {
	let files :string[] = fs.readdirSync("./texts/");
	let one = files.filter(f => f.includes("one"));
	let couple = files.filter(f => f.includes("couple"));
	let nobody = files.filter(f => f.includes("nobody"));
	return {nobody, one, couple};
}
const texts = grabIntros();
Object.keys(texts).forEach(t => texts[t] = texts[t].map((p :string) => "./texts/" + p));

export function randomize(f :Array<any>) :any  {
	const r = Math.random() * f.length;
	return f[Math.floor(r)];
}


function returnComebackMsg() :string {

}


async function welcome(p :Player) :Promise<string> {
    let str :string = "";
    if (!p.ASCIIdisabled)
      str = willowASSCI +"\n\r\n\r"

    if (!p.hasJoined) {
      str+= await fm.readFile("./texts/welcome");

      str += "\n\r\n\r";

      switch(getConnectedSockets().length) {
        case 1:
          str += await fm.readFile("./texts/welcome1");
          break;
        case 2:
          str += await fm.readFile("./texts/welcome2");
          break;
        default:
          str += await fm.readFile("./texts/welcome3");
      }
      return str;
    }



    let type :string;
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
    if (playersWhoJoinedToday.some(x => x == p.username)) {
      return (
        `You've tuned back in. ${type == "couple" ? "All of your friends are here." :(type == "one" ? "Someone is here." :"You are by yourself.")}`
      )
    }
    console.log(playersWhoJoinedToday);

    let v = texts[type];
    str += (await fm.readFile(randomize(v), {encoding: "utf8"}));
    playersWhoJoinedToday.push(p.username);


    return str;
}



export function removeSocket (socket :MySocket) {
  delete connectedSockets[socket.id];
}


process.on('exit', async () => {
  isDone = true;
  for (const socket of getConnectedSockets()) {
    await socket.close();
  }
  Player.savePlayerData();
  server.close();
  console.log("Program exited.");
});


let isDone = false;


async function saveCycle() {
  if(isDone)
    return;
  Player.savePlayerData();
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
    case "save":
      Player.savePlayerData();
      break;
    case "quit":
      process.exit();
  }

  if(isDone)
    return;
  consoleCommand();
}
consoleCommand();
