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
    "list": function () {this.ws()},
    "online": function () {this.ws()},
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
    "clear":function () {
        this.clearScreen();
    },
    "quit": async function () {
        this.send("Goodbye!");
        await this.close();
    }
}

const listCommands = Object.keys(commands);
const commandEmit = new EventEmitter();

for (const key of Object.keys(commands)){
    commandEmit.on(key, (scope : MySocket, msg) => {
        let command = commands[key].bind(scope);
        console.log(command);
        command(msg);
    })
}

export default commandEmit;