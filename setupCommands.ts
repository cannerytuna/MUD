import MySocket from "./mySocket.js";
import {getConnectedSockets} from "./telnet.js";

export default (socket: MySocket) => {
return function (command : string, msg : string){
const commands = {
    //
    // semi-colon commands
    // ;ws
    // ;set name james
    //
    "list": function () {this.ws()},
    "online": function () {this.ws()},
    "ws": function () {
        socket.send("There is " + getConnectedSockets().length + " users online: ");
        getConnectedSockets().map(s => s.name).forEach(n => socket.send(n + " is online."));
    },
    "set": function () {
        let mArr = msg.split(' ');
        socket[mArr[0]] = mArr.slice(1, mArr.length).join(' ');
        socket.send("Set "+mArr[0].toUpperCase() + " to " + mArr[1]);
    },
    "quit": async function () {
        socket.send("Goodbye!");
        await socket.close();
    }
}
if (!commands[command])
    return false;
commands[command]();
return true;
}
};