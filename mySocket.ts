import * as net from "node:net";
import commandEmit from "./setupCommands.js";
import {removeSocket, getConnectedSockets, connectedSockets} from "./telnet.js";
import Player from "./player.js";


//Wrapper class to manage net.Socket instances
export default class MySocket{
    private readonly socket: net.Socket;
    private readonly _id: string;
    public player: Player;
    name;

    constructor(socket:net.Socket){
        this.socket = socket;
        this.name = this.socket.remoteAddress; //placeholder

        this._id = MySocket.assignId();
        while (this._id in Object.keys(connectedSockets))
            this._id = MySocket.assignId();

        socket.on('close', async () => {
            await this.close();
        })
    }

    public initiateChat () {
        //
        // Accepts input from user
        //
        let bufArr:Buffer[] = [];
        this.socket.on('data', (buf : Buffer) => {
            if (buf.toString().includes("\r\n")){
                bufArr.push(buf);
                let str = bufArr.join('');
                this.checkMessage(str.slice(0, str.length - 1));
                bufArr = [];
            } else if (buf.toString() == '\b'){
                this.socket.write(" \x1b[D");
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
    get id(): string {
        return this._id;
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
                if(!commandEmit.emit(command, this, commandWords.slice(1, commandWords.length).join(' ')))
                    this.send("Command does not exist. Please try again.");
                return;
            //pose prefix
            case ':':
                let string = msg.slice(1, msg.length);
                if (string.slice(0,3) !== "'s " && string.slice(0,2) !== 's ' && string.slice(0,3) !== "s' " && string.charAt(0) !== ' ')
                    string = ' ' + string;
                this.emit(this.name + string);
                return;
            //default say
            default:
                result = this.name + ' says, "' + msg + '"';
                sendBack = 'You said, "' + msg + '"';
        }

        this.broadcast(result);
        this.replaceLine(sendBack);
    }

    broadcast(msg){
        getConnectedSockets().forEach(sock => {
            if (sock._id !== this._id) sock.send(msg)
        })
    }

    replaceLine(msg) {
        this.socket.write("\x1b[2K");
        this.socket.write("\x1b[A");
        this.socket.write(msg);
        this.socket.write("\r\n");
    }

    clearScreen() {
        this.socket.write("\x1b[2J");
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
            removeSocket(this);
        });
    }

    static sendAll(msg) {
        getConnectedSockets().forEach(s => s.send(msg));
    }
}

