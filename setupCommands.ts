import MySocket from "./mySocket.js";
import {getConnectedSockets, randomize} from "./server.js";
import {EventEmitter} from "events";
import Player from "./player.js";
import Room from "./room.js";

type Command = (this: MySocket, msg : string) => void;
interface FunctionList<T> {
    [code : string] : T;
}



const editCommands : FunctionList<(this : MySocket, text : string, allText : string[]) => void> = {
    desc : function () {
        editDescMode.bind(this)();
    },
    name : function (_, arr) {
        this.player.rename(arr.join(' '));
    },
    say : function (text) {
        this.player.say = text
    }
}




let moveTexts = ["Say something.", "Go say hi,", "Dudes of wise, step forward.", "Come along now, step forward,", "Left up to your imagination,", "Is it too many, or too little amount of people?", "Can we handle a few more people?", "Should we watch what we say?", "Get out there, champion.", "Make some sound!", "You shouldn't dawdle over if anyone believes anything.", "Force some moments.", "Make art.", "Whats your favorite stuffed animal?", "Lets start a Littlest Pet Shop rp campaign.","Find a trampoline.", "Make some time if you can.", "Just be whatever, we encourage you to be whoever you want to be.", "Jokes are okay. sometimes.", "We love you.", "The willow is quiet.", "Who haven't you've really had a conversation with.", "", "Loosen up a little, chill with us,", "You aren't obligated to learn birthdays, and attend plans, but it really shows you care, and I would love that.", "Tell someone if they've done something wrong, don't let us embarrass ourselves.", "The world is so crazy right now, why would you need social relationships in your life?", "What are we leaving behind?", "We are capable of love. We can give love.", "Fruits. Eat some fruits.", "Can we really improve reality without feeling awful doing it?", "Nostalgia is okay for reflection, use it to make yourself better.", "Lets be grave robbers.. out of curiosity.", "Tell your friends you love them casually, as you may not just like someone.", "We are all kind of annoying, its okay be patient."];

const commands: FunctionList<Command> = {
    //
    // semi-colon commands
    // ;ws
    // ;set name james
    //
    go: function (msg) {
        msg  = msg.trim().toLowerCase();
        this.player.currentRoom = this.player.currentRoom || Room.spawn;
        let possibleRooms : {[code : string] : Room} = this.player.moveWhere()
        let targetRoom : Room;
        if (possibleRooms[msg])
            targetRoom = possibleRooms[msg]

        if (targetRoom) {
            this.send();
            this.send(targetRoom.desc);
            this.send();
            this.send(targetRoom.manyPlayers != 0 ?
                `There ${targetRoom.manyPlayers > 1 ? "are some people" : "is someone"} here. 
                ${randomize(moveTexts)} ` : "");
            this.player.goto(targetRoom, msg);

        } else {
            this.send("There's nothing there.");
        }


    },
    ws: function () {
        let len = getConnectedSockets().length
        this.send();
        this.send("\x1b[31;1;4mThere is " + len + " user" + (len > 1 ? "s" : "" ) + " online:\x1b[0m");
        getConnectedSockets().map(s => s.player.name).forEach(n => this.send(n + " is online."));
        this.send(' ');
    },
    set: function (msg) {
        let mArr = msg.split(' ');
        if (Object.keys(editCommands).includes(mArr[0])) {
            editCommands[mArr[0]].bind(this)(mArr[1], mArr.slice(1, mArr.length));
        } else this.send("You can't set that property!");
    },
    help: function (msg :string) {
        let dA = 5; //distance apart
        let split = 3;

        if (msg) {
            msg = msg.toLowerCase();
            if (Number(msg)) {
                try {
                    split = Number(msg);
                } catch (e) {
                    split = 3;
                }
            } else {
                if (help[msg]) {
                    this.send();
                    this.send(msg + ": ");
                    this.send(help[msg]);
                    this.send();
                    return;
                }
            }
        }

        this.send("Available commands")

        let str = "";
        this.send("\x1b[31m");
        for (let i = 0; i < listCommands.length; i++) {
            let col = i % split;
            str += " ".repeat(dA);
            let isHelp = Object.keys(help).includes(listCommands[i]);
            if (isHelp)
                str += "\x1b[32m";
            str += listCommands[i];
            if (isHelp)
                str += "\x1b[31m"
            if (col === split - 1){
                this.send(str);
                str = ""
            }
        }
        if (str != "")
            this.send(str);

        this.send("\x1b[0m");
    },
    look: function (msg) {
        if (msg == "") {
            let players = this.player.currentRoom.allNames.filter(n => n != this.player.name);
            let len = players.length;
            this.send();
            this.send(this.player.currentRoom.desc);
            this.send();
            this.send(`\x1b[31;1;4m${len <= 0 ? "There is no one around you." : (len == 1 ? "There is someone here," : "There is some people here,")}\x1b[0m`);
            players.forEach(n => this.send(n + " is here."));
            this.send();
            return;
        }

        let player : Player;
        let sArr = msg.split(' ');
        if (sArr[0] == "me") {
            player = this.player;
        }else {
            for (const p of Player.getConnectedPlayers()){
                if (p.name == sArr[0]) {
                    player = p;
                    break;
                }
            }
        }
        if (player) {
            this.send("<You looked at " + player.name + ">");
            for (const line of player.desc) {
                this.send(line);
            }
            return;
        }
        this.send("That is not a user.");
    },
    clear: function () {
        this.clearScreen();
    },
    quit: async function () {
        this.send("Goodbye!");
        await this.close();
    }
}

const listCommands = Object.keys(commands).sort((a, b) => a.localeCompare(b));
const help: {} = {
    quit:"Leaves the server.",
    clear:"Clears screen.",
    set:`Sets a property.\r\nProperties you can modify include:\r\n\x1b[34m${Object.keys(editCommands).join('\x1b[0m, \x1b[34m')}\x1b[0m.`,
    ws:"Lists all active users."
}


async function editDescMode(this : MySocket) {
    let desc :string[] = [];
    this.send("====Edit Mode====");

    let currentIndex = 0;

    this.initiateChat((msg : string) => {
        if (msg.charAt(0) == '.'){
            let command = msg.split(" ");
            let arg = Number(command[1]) - 1;
            switch (command[0]){
                case ".line":
                    if (arg <= (desc.length))
                        currentIndex = arg;
                    break;
                case ".del":
                    if (desc.length == 0)
                        return update();
                    let slice = desc.slice(arg + 1, desc.length);
                    let front = desc.slice(0, arg);
                    desc = front.concat(slice);
                    currentIndex -= 1;
                    break;
                case ".list":
                    desc.forEach((line, index) => {
                        this.send((index + 1) + ": " + line);
                    })
                    break;
                case ".help":
                    help();
                    break;
                case ".exit":
                    this.checkMessage = MySocket.prototype.checkMessage.bind(this);
                    this.player.desc = desc;
                    this.send("==Exiting Edit Mode==");
                    this.send();
                    return;
            }
            update();
            return;
        }

        if (currentIndex < desc.length) {
            let slice = desc.slice(currentIndex, desc.length);
            let front = desc.slice(0, currentIndex);
            front.push(msg);
            desc = front.concat(slice);
        } else {
            desc.push(msg);
        }
        currentIndex += 1;
        update();
    });

    const update = () => {
        this.send("\x1b[32m<inserting at line " + (currentIndex + 1) + " >\x1b[0m");
    }

    const help = () => {
        this.send("Type .line <num> to go to line.");
        this.send("Type .del <num> to delete line");
        this.send("Type .list to show whole description with line numbers");
        this.send("Type .exit to finish and save description");
        this.send("Type .help to show this text again.");
        this.send();
        update();
    }

    help();
}



const commandEmit = new EventEmitter();

for (const key of Object.keys(commands)){
    commandEmit.on(key, (scope : MySocket, msg) => {
        commands[key].bind(scope) (msg);
    })
}

export default commandEmit;
