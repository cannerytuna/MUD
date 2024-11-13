import {MySocket} from "./mySocket.js";
import {getConnectedSockets} from "./telnet.js";

export default (socket: MySocket) => {
return function (command : string, msg : string){
msg = msg.toLowerCase();
const commands = {
    //
    // semi-colon commands
    // ;ws
    // ;set name james
    //
    "ws": function () {
        socket.send("Players online: ");
        getConnectedSockets().map(s => s.name).forEach(n => socket.send(n + " is online."))
    },
    "set": function () {
        let mArr = msg.split(' ');
        socket[mArr[0]] = mArr[1];
    },
    "quit": async function () {
        await socket.close();
    }
}
if (!commands[command])
    return false;
commands[command]();
return true;
}
};