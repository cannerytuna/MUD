import { readFileSync } from "node:fs";
import Player from "./player.js";


interface roomSet {
    [code : string] : Room
}


class Room {
    private readonly connectedTo : roomSet;
    public desc : string;
    private _players : Player[];

    constructor(arg : roomSet = {}) {
        this.desc = "";
        this.connectedTo = arg;
        this._players = [];
    }

    // pl? -- dont send to player
    broadcast (msg : string, pl? : Player) : Room {
        let p = this._players;
        if (pl)
            p = this._players.filter(p => p.username != pl.username);
        p.forEach(p => p.send(msg));
        return this;
    }


    join (player : Player) : Room {
        this.broadcast(`You see ${player.name} walk in.`);
        this._players.push(player);
        return this;
    }


    leave (username : string) : Room {
        this._players = this._players.filter(p => p.username != username);
        return this;
    }


    connectTo(room : Room, code : string): Room {
        this.connectedTo[code] = room;
        return this;
    }

    onEveryRoom(f: (code?: string, room? : Room) => void) : Room {
        Object.keys(this.connectedTo).forEach(code => {
        f(code, this.connectedTo[code]);
        })
        return this;
    }
    
    get connected () {
        return Object.values(this.connectedTo);
    }

    get allNames(): string[] {
        return this._players.map(p => p.name);
    }

    get manyPlayers () {
        return this.connected.length;
    }

    static setupRooms() {
        for (const player of Player.allPlayers) {
            let playerRoom = new Room()
            playerRoom.connectTo(secondaryRoom, "back")

            playerRoom.desc = player.roomDesc;

            secondaryRoom.connectTo(playerRoom, player.name);
            presetRooms.push(playerRoom);
        }
    }

    static get spawn() {
        return centralSpawn;
    }
        

}

const centralSpawn = new Room();
const secondaryRoom = new Room();
secondaryRoom.desc = readFileSync("texts/down.txt", {encoding: "utf-8"});
centralSpawn.connectTo(secondaryRoom, "down");
secondaryRoom.connectTo(centralSpawn, "up");

let presetRooms = [centralSpawn, secondaryRoom];


export default Room;
