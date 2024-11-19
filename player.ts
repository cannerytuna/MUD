import {getConnectedSockets} from "./telnet.js";

interface playerList {
    username: Player
}

export default class Player {
    private _name :string;
    private _desc :string[];
    private username :string;
    private password :string;

    static getConnectedPlayers(){
        return getConnectedSockets().map(s => s.player);
    }

    private static playerList:playerList = {};


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

    }
}