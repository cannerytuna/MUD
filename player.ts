import {getConnectedSockets} from "./telnet.js";
import * as fs from "fs";
import Room from ",/room.js";

interface playerList {
    [username : string] : Player
}

class Player {
    private _name :string;
    private _desc :string[];
    private _password :string;
    private currentRoom : Room;
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

    move() {
        this.currentRoom.onEveryRoom((code, room) => {
        })

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
                fs.writeFileSync("./players.txt",
                    JSON.stringify(Player.playerList));
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

fs.readFile("./players.txt", "utf8", (err, data) => {
    if (err)
        throw err;
    if (data === ""){
        Player.playerList = {};
        return;
    }
    Player.playerList = JSON.parse(data);
    Object.values(Player.playerList).forEach(player => Object.setPrototypeOf(player, Player.prototype));
});

export default Player;
