import {getConnectedSockets} from "./telnet.js";
import * as fs from "fs";
import Room from "./room.js";
import MySocket from "./mySocket.js";

interface playerList {
    [username : string] : Player
}

class Player {
    private _name :string;
    private _desc :string[];
    private _password :string;
    private currentRoom : Room;
    private socket : MySocket;
    public say :string;
    public roomDesc : string;
    static playerList:playerList;

    constructor(username : string) {
        this.name = username;
        this.desc = [""];
        this._password = null;
        this.say = "says";
        this.roomDesc = "";
        this.currentRoom = Room.spawn;
    }

    connect(socket : MySocket) {
        this.socket = socket;
    }

    // wrapper functions to interact with current socket.
    send(msg : string) : Player {
        if (!this.socket)
            this.currentRoom.leave(this.username);
        else {
            this.socket.send(msg);
        }
        return this;
    }
    broadcast(msg : string) : Player {
        if (!this.socket)
            this.currentRoom.leave(this.username);
        else {
            this.socket.broadcast(msg);
        }
        return this;
    }
    emit(msg : string) : Player {
        if (!this.socket)
            this.currentRoom.leave(this.username);
        else {
            this.socket.emit(msg);
        }
        return this;
    }
    //end

    moveWhere() : string[] {
        let codes = [];
        this.currentRoom.onEveryRoom((code) => {
            codes.push(code);
        });
        return codes;
    }

    hasPassword() {
        return !!this._password;
    }

    checkPassword(attempt : string) {
        return this._password === attempt;
    }
    setPassword(newPassword : string) {
        this._password = newPassword;
    }

    static getConnectedPlayers(){
        return getConnectedSockets().map(s => s.player);
    }


    static get allPlayers() {
        return Object.values(this.playerList);
    }

    static loadPlayerData() {
                fs.writeFileSync("./players.txt",JSON.stringify(Player.playerList),{encoding: "utf8"});
    }
    
    static readPlayerData() {
    let data = fs.readFileSync("./players.txt", { encoding: "utf8" })
    Player.playerList = JSON.parse(data);
    Object.values(Player.playerList).forEach(player => Object.setPrototypeOf(player, Player.prototype));
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }
    set desc(arr :string[]){
        this._desc = arr;
    }

    get desc():string[]{
        return this._desc;
    }


    static get allUsernames ():string[] {
        return Object.keys(Player.playerList)
    }
    get username():string|null{
        for (const temp of Player.allUsernames) {

        if (Player.playerList[temp])
        
            return temp;
        }
        return null;

    }

    static isPlayer(str: string):boolean {
        return !!Player.playerList[str];
    }
}


export default Player;
