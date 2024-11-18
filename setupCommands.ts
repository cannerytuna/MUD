import MySocket from "./mySocket.js";
import {getConnectedSockets} from "./telnet.js";
import {EventEmitter} from "events";

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
            this[mArr[0]] = mArr.slice(1, mArr.length).join(' ');
            this.send("Set " + mArr[0].toUpperCase() + " to " + mArr[1]);
        } else this.send("You can't set that property!");
    },
    "help": function (msg :string) {
        let dA = 5; //distance apart
        let split = 3;
        if (msg) {
            try {
                split = Number(msg);
            } catch (e) {
                split = 3;
            }
        }

        let str = "";
        this.send("\x1b[32m");
        for (let i = 0; i < listCommands.length; i++) {
            let col = i % split;
            str += " ".repeat(dA);
            str += listCommands[i];
            if (col === split - 1){
                this.send(str);
                str = ""
            }
        }
        if (str != "")
            this.send(str);

        this.send("\x1b[0m");
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

const commandEmit = new EventEmitter();

for (const key of Object.keys(commands)){
    commandEmit.on(key, (scope : MySocket, msg) => {
        commands[key].bind(scope) (msg);
    })
}

export default commandEmit;