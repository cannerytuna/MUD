import {getConnectedSockets} from "./telnet.js";
import * as fs from "fs";

interface playerList {
    [username : string] : Player
}

class Player {
    private _name :string;
    private _desc :string[];
    private _password :string;
    public say :string;

    constructor(username : string) {
        this.name = username;
        this.desc = [""];
        this._password = null;
        this.say = "says";
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

    static playerList:playerList;

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
