import commandEmit from "./setupCommands.js";
import {removeSocket, getConnectedSockets, connectedSockets} from "./telnet.js";
import Player from "./player.js";
import ssh2 from "ssh2";
import aEscape from 'ansi-escapes';


//Wrapper class to manage net.Socket instances
export default class MySocket{
    private readonly socket: ssh2.Channel;
    private readonly _id: string;
    public player: Player;
    public info : ssh2.ClientInfo;

    constructor(socket:ssh2.Channel, info:ssh2.ClientInfo){
        this.socket = socket;
        this.info = info;

        this._id = MySocket.assignId();
        while (this._id in Object.keys(connectedSockets))
            this._id = MySocket.assignId();

        socket.on('close', async () => {
            await this.close();
        })


    }

    public  initiateChat (f? : Function) {
        this.socket.removeAllListeners("data");
        //
        // Accepts input from user
        //
        let bufArr:Buffer[] = [];
        this.socket.on('data', (buf : Buffer) => {
            let char = buf.toString();
            if (char.includes("\x1b["))
                return;
            if (char.includes(String.fromCharCode(13))){
                this.socket.write("\r\n");
                bufArr.push(buf);
                let str = bufArr.join('');
                str = str.slice(0, str.length - 1);
                if (f){
                    f(str);
                } else
                    this.checkMessage(str);
                bufArr = [];
            } else if (char == String.fromCharCode(127)){
                this.socket.write(aEscape.cursorBackward() + " " + aEscape.cursorBackward());
                bufArr.pop();
            }
            else {
                this.socket.write(char);
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
                result = this.player.name + string;
                sendBack = result;
                break;
            //default say
            default:
                result = this.player.name + ` ${this.player.say}, "` + msg + '"';
                sendBack = 'You said, "' + msg + '"';
        }

        this.broadcast(result);
        this.send(sendBack);
    }

    broadcast(msg){
        getConnectedSockets().forEach(sock => {
            if (sock._id !== this._id) sock.send(msg)
        })
    }

    clearScreen() {
        this.socket.write("\x1b[2J");
    }

    send(msg){
        if (msg)
            this.socket.write(msg);
        this.socket.write("\r\n");
    }

    emit(msg) {
        getConnectedSockets().forEach((s : MySocket )=> s.send(msg));
    }

    async close() {
        if (!this.socket.readableEnded)
            this.socket.end();
        if (this.player){
            this.broadcast(this.player.name + " has left.");
            removeSocket(this);
        }
        console.log("Lost connection to " + this.info.ip);
    }
}

