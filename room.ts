import Player from "./player.js";


interface roomSet {
    [code : string] : Room
}


class Room {
    private connectedTo : roomSet;
    public desc : string;
    private _players : Player[];

    constructor(arg : roomSet = {}) {
        this.desc = "";
        this.connectedTo = arg;
        this._players = [];
    }

    broadcast (msg : string) : Room{
        this._players.forEach(p => p.broadcast(msg));
        return this;
    }


    join (player : Player) : Room {
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

    goto(code : string, username : string) : Room {
        this.leave(username);
        return this.connectedTo[code];
    }

    
    get connected () {
        return Object.values(this.connectedTo);
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

let centralSpawn = new Room();
let secondaryRoom = new Room();
centralSpawn.connectTo(secondaryRoom, "down");
secondaryRoom.connectTo(centralSpawn, "up");

let presetRooms = [centralSpawn, secondaryRoom];


export default Room;
