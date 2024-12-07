import Player from "./player.js";


interface roomSet {
    [code : string] : Room
}


export default class Room {
    private connectedTo : roomSet;
    public desc : string;
    private _players : Player[];

    constructor(arg : roomSet = {}) {
        this.desc = "";
        this.connectedTo = arg;
        this._players = [];
    }

    join (player : Player) {
        this._players.push(player);
    }

    leave (username : string) : Room {
        this._players = this._players.filter(p => p.username != username);
        return this;
    }


    connectTo(room : Room, code : string): Room {
        this.connectedTo[code] = room;
        return this;
    }

    private onEveryRoom(f : Function) : Room {
        Object.keys(this.connectedTo).forEach(code => {
        f(code, this.connectedTo[code]);
        })
        return this;
    }
    
    get connected () {
        return Object.values(this.connectedTo);
    }

    static get spawn() {
        return centralSpawn;
    }
        

}

let centralSpawn = new Room();
let secondaryRoom = new Room();
centralSpawn.connectTo(secondaryRoom, "down");
secondaryRoom.connectTo(centralSpawn, "up");

let presetRooms = [centralSpawn, secondaryRoom];




for (const player of Player.allPlayers) {
    let playerRoom = new Room()
    playerRoom.connectTo(secondaryRoom, "back")

    playerRoom.desc = player.roomDesc;

    secondaryRoom.connectTo(playerRoom, player.name);
    presetRooms.push(playerRoom);
}

