import * as net from "node:net";
import setupCommands from "./setupCommands.js";
import {removeSocket, getConnectedSockets, connectedSockets} from "./telnet.js";


//Wrapper class to manage net.Socket instances
export default class MySocket{
    private readonly socket: net.Socket;
    private readonly commands: (command : string, msg : string) => boolean;

    public name: string;
    public id: string;

    constructor(socket:net.Socket, needConnected = true){
        this.socket = socket;
        this.name = this.socket.remoteAddress; //placeholder
        if (!needConnected){
            return
        }

        this.commands = setupCommands(this);
        this.id = MySocket.assignId();
        while (this.id in Object.keys(connectedSockets))
            this.id = MySocket.assignId();

        console.log(this.id);

        this.socket.on('close',() => removeSocket(this));

        //
        // Accepts input from user
        //
        let bufArr:Buffer[] = [];
        this.socket.on('data', (buf : Buffer) => {
            if (buf.toString() == "\r\n"){
                this.checkMessage(bufArr.join(''));
                bufArr = [];
            } else if (buf.toString() == '\b'){
                bufArr.pop();
            }
            else {
                bufArr.push(buf);
            }
        })

    }

    public static assignId() {
        return Math.floor(Math.random() * 65536).toString(16);
    }

    checkMessage(msg :string) {
        msg = msg.trim();

        if (msg === '')
            return;

        const char = msg.charAt(0);
        let sendBack = '';
        let result = '';

        //Checks input if it is a command

        switch(char) {
            //command prefix
            case ';':
                const commandWords = msg.slice(1, msg.length).split(' ');
                const command = commandWords[0].toLowerCase();
                if(!this.commands(command, commandWords.slice(1, commandWords.length).join(' ')))
                    this.send("Command does not exist. Please try again.");
                return;
            //pose prefix
            case ':':
                let string = msg.slice(1, msg.length);
                if (string.slice(0,3) !== "'s " && string.slice(0,2) !== 's ' && string.slice(0,3) !== "s' " && string.charAt(0) !== ' ')
                    string = ' ' + string;
                result = this.name + string;
                sendBack = result;
                break;
            //default say
            default:
                result = this.name + ' says, "' + msg + '"';
                sendBack = 'You said, "' + msg + '"';
        }

        this.messageUpdate(result);
        this.send(sendBack);
    }



    messageUpdate(msg){
        this.broadcast.emit(msg);
    }

    send(msg){
        this.socket.write(msg);
        this.socket.write("\r\n");
    }

    emit(msg) {
        getConnectedSockets().forEach((s : MySocket )=> s.send(msg));
    }

    async close() {
        this.socket.end(() => {
            return true;
        });
    }

    get broadcast() {
        let newSocket:MySocket = new MySocket(this.socket, false);
        let socketsWithoutThis:MySocket[] = getConnectedSockets().filter((s : MySocket) => s != this);

        newSocket.emit = (msg) => {
            socketsWithoutThis.forEach(s => s.send(msg));
        }
        return newSocket;
    }
}

