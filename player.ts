import {getConnectedSockets, randomize} from "./server.js";
import * as fs from "fs";
import Room from "./room.js";
import MySocket from "./mySocket.js";

class Player {
    private _name :string;
    private _desc :string[];
    private _password :string;
    private _socket :MySocket;

    public hasJoined :boolean;
    public currentRoom :Room;
    public say :string;
    public roomDesc :string;
    public ASCIIdisabled :boolean;
    static playerList :{[key:string]: Player} = {};

    constructor(username :string) {
        this._name = username;
        this._desc = [""];
        this._socket = null;
        this.hasJoined = false;
        this.ASCIIdisabled = false;
        this._password = "";
        this.say = "says";
        this.roomDesc = "";
        this.currentRoom = Room.spawn;
        Room.newPlayerRoom(this);
    }

    rename(newName :string) {
        let room = Room.offSpawn.go(this.name);
        Room.offSpawn.disconnectRoom(this.name);
        Room.offSpawn.connectTo(room, newName);
        this._name = newName;
        Player.savePlayerData();
    }

    encapsulate () :{} {
        return {
            _name: this._name,
            _desc: this._desc,
            roomDesc: this.roomDesc,
            say: this.say,
            _password: this._password,
            hasJoined: this.hasJoined,
            ASCIIdisabled: this.ASCIIdisabled
        };
    }

    connect(socket :MySocket) {
        this._socket = socket;
    }

    sendInRoom(msg :string) {
        this.currentRoom.broadcast(msg);
    }

    // wrapper functions to interact with current socket.
    send(msg :string) :Player {
        if (!this._socket)
            this.currentRoom.leave(this.username);
        else {
            this._socket.send(msg);
        }
        return this;
    }
    emit(msg :string) :Player {
        if (!this._socket)
            this.currentRoom.leave(this.username);
        else {
            this._socket.emit(msg);
        }
        return this;
    }
    //end

    moveWhere() :{[code :string] :Room} {
        let rooms :{[code :string] :Room} = {}
        this.currentRoom.onEveryRoom((code, room) => {
            rooms[code] = room;
        });
        return rooms;
    }

    hasPassword() {
        if (this._password === "") {
            return false;
        }
        return !!this._password;
    }

    checkPassword(attempt :string) {
        console.log(this.username + " has been attempted to reach by: " + attempt);
        return this._password === attempt;
    }
    setPassword(newPassword :string) {
        this._password = newPassword;
    }

    static getConnectedPlayers(){
        return getConnectedSockets().map(s => s.player);
    }


    static get allPlayers() {
        return Object.values(Player.playerList);
    }

    static encapsulatePlayers() :{} {
        let players = {};
        for (let key of Object.keys(Player.playerList)) {
            players[key] = Player.playerList[key].encapsulate();
        }
        return players;
    }

    static savePlayerData() {
                fs.writeFileSync("./players.txt",JSON.stringify(Player.encapsulatePlayers()),{encoding: "utf8"});
    }
    
    static loadPlayerData() {
        let data = fs.readFileSync("./players.txt", { encoding: "utf8" });
        let obj = JSON.parse(data);
        for (let key of Object.keys(obj)) {
            let player = new Player(key);
            for (let key2 of Object.keys(obj[key])) {
                player[key2] = obj[key][key2];
            }
            Player.playerList[key] = player;
        }
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }
    set desc(arr :string[]){
        this._desc = arr;
        Player.savePlayerData();
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

    goto(room: Room, code: string) :this {
        const prev = this.currentRoom;
        room.join(this);
        prev.leave(this.username);
        prev.broadcast(this.name + " " + randomize(["has left to go somewhere else.", "went somewhere else.", "seems to have disappeared elsewhere.", "has gone elsewhere.", "disappeared without you noticing."]) + `  [;goto ${code}]`);
        this.currentRoom = room;
        this.currentRoom.broadcast(this.name + " " + randomize(["walks in,", "glides near you,", "greets you as they enter your bubble.", "waves as they approach,", "is here.", "invades your space."]), this);
        return this;
    }

    static isPlayer(str: string):boolean {
        return !!Player.playerList[str];
    }
}


export default Player;
