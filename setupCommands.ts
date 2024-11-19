import MySocket from "./mySocket.js";
import {getConnectedSockets} from "./telnet.js";
import {EventEmitter} from "events";
import Player from "./player.js";

const editableComponents = [
    'name', 'desc', 'say'
]

const commands = {
    //
    // semi-colon commands
    // ;ws
    // ;set name james
    //
    "ws": function () {
        this.send("\x1b[31;1;4mThere is " + getConnectedSockets().length + " users online: \x1b[0m");
        getConnectedSockets().map(s => s.name).forEach(n => this.send(n + " is online."));
        this.send(' ');
    },
    "set": function (msg) {
        let mArr = msg.split(' ');
        if (editableComponents.includes(mArr[0])) {
            if (mArr[0] == "desc") {
                editDescMode.bind(this)();
            } else {
                this[mArr[0]] = mArr.slice(1, mArr.length).join(' ');
                this.send("Set " + mArr[0].toUpperCase() + " to " + mArr[1]);
            }
        } else this.send("You can't set that property!");
    },
    "help": function (msg :string) {
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
    "look" : function (msg) {
        let sArr = msg.split(' ');
        let player :Player;
        if (sArr[0] == "me") {
            player = this.player;
        }else {
            for (const player of Player.getConnectedPlayers()){
                if (player.name == sArr[0]) {
                    this.send(player.desc);
                    return;
                }
            }

            this.send("That is not a user.");
        }
    },
    "clear":function () {
        this.clearScreen();
    },
    "quit": async function () {
        this.send("Goodbye!");
        await this.close();
    }
}

const listCommands = Object.keys(commands).sort((a, b) => a.localeCompare(b));

const help: {} = {
    "quit":"Leaves the server.",
    "clear":"Clears screen.",
    "set":`Sets a property.\r\nProperties you can modify include:\r\n\x1b[34m${editableComponents.join('\x1b[0m, \x1b[34m')}\x1b[0m.`,
    "ws":"Lists all active users."
}


async function editDescMode() {
    let desc :string[] = [];
    this.send("====Edit Mode====");
    this.send("Type .line <num> to go to line.");
    this.send("Type .del <num> to delete line");
    this.send("Type .list to show whole description with line numbers");
    this.send("Type .exit to finish and save description");

    let currentIndex = 0;


    this.checkMessage = (msg) => {
        msg = msg.trim();

        if (msg.charAt(0) == '.'){
            let command = msg.split(" ");
            let arg = Number(command[1]);
            switch (command[0]){
                case ".line":
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
                case ".exit":
                    this.checkMessage = MySocket.prototype.checkMessage.bind(this);
                    this.player.desc = desc;
                    break;
            }
            return update();
        }

        if (currentIndex < desc.length) {
            let slice = desc.slice(currentIndex, desc.length);
            let front = desc.slice(0, currentIndex);
            front.push(msg);
            desc = front.concat(slice);
        } else {
            desc.push(msg);
            currentIndex += 1;
        }
        update();
    };

    const update = () => {
        this.send("\x1b[32m<inserting at line " + (currentIndex + 1) + " >\x1b[0m");
    }
}



const commandEmit = new EventEmitter();

for (const key of Object.keys(commands)){
    commandEmit.on(key, (scope : MySocket, msg) => {
        commands[key].bind(scope) (msg);
    })
}

export default commandEmit;