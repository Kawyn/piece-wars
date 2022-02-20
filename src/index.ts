const express = require('express');
const app = express();

const http = require('http').Server(app);
const port = process.env.PORT || 3000;
const io = require('socket.io')(http);

const LETTERS = ['_', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const COLOR = {
    WHITE: true,
    BLACK: false,
}

const queue = { socket: null, info: null, set: null, time: null, };


const joinQueue = (socket, info, set) => {

    if (queue.socket === socket) {

        return;
    }
    else if (!queue.socket) {

        queue.socket = socket;

        queue.info = info;
        queue.set = set;

        queue.time = new Date().getTime();

        socket.emit('join-queue');
    }
    else if (queue.socket !== socket) {

        new Game(
            [queue.socket, socket],
            
            [queue.info, info],
            [queue.set, set]
        );

        quitQueue(queue.socket);
    }
};

const quitQueue = (socket) => {

    if (queue.socket === socket) {

        for (const k in queue)
            queue[k] = null;
    }

    socket.emit('quit-queue');
}

class Move {

    code: string;
    piece: {  set: number, name: string  };

    constructor (code, piece) {

        this.code = code;
        this.piece = piece;
    }
}

class Notation {

    static flip(code) {

        let [x, y] = code.split('');

        x = LETTERS.indexOf(x[0]);
        x += (8 - x * 2) + 1;

        y = parseInt(y);
        y += (8 - y * 2) + 1

        return LETTERS[x] + y;
    }
}


  

class Game {

    sockets = [];
    
    infos: { username: string }[];
    sets: {
        [name: string]: {
            name: string,
            royal: boolean,

            src: string,

            axes: { x: number, y: number }[];
            fields: { x: number, y: number }[];
        
            spawns: string[];
        }
    }[];

    history: Move[] = [];

    pieces: { [code: string]: { set: number, name: string } } = {};

    colors: [boolean, boolean];
    turn = 0;

    constructor(sockets, infos, sets) {

        this.sockets = sockets;

        this.infos = infos;
        this.sets = sets;

        this.colors = [COLOR.BLACK, COLOR.BLACK];
        this.colors[Math.floor(Math.random() * 2)] = COLOR.WHITE;

        for (let i = 0; i < 2; i++) {

            const set = sets[i];
            const color = this.colors[i];

            for (const k in set) {

                for (let code of set[k].spawns) {

                    if (color === COLOR.BLACK)
                        code = Notation.flip(code);

                    this.pieces[code.toLowerCase()] = {
                        set: i,
                        name: k
                    };
                }
            }
        }

        this.turn = this.colors.indexOf(COLOR.WHITE);

        this.sockets[0].emit('start-game', { i: 0, color: this.colors[0], players: this.infos }, this.sets, this.pieces);
        this.sockets[1].emit('start-game', { i: 1, color: this.colors[1], players: this.infos }, this.sets, this.pieces);
    
        Game.games.push(this);
    }


    move(socket, code) {

        const i = this.sockets.indexOf(socket);

        if (this.turn !== i)
            return;

        const start = code[0] + code[1];
        const destination = code[2] + code[3];

        const piece = this.pieces[start];

        if (!piece || this.pieces[destination]?.set === piece.set)
            return;
        
        let contains;

        const move = () => {
          
            this.history.push(new Move(code, this.pieces[destination]));
            this.broadcast('move', code);
            
            this.pieces[destination] = this.pieces[start];
            delete this.pieces[start];
        
            this.turn = (this.turn + 1) % 2;


            let royality = 0;

            for (const code in this.pieces) {

                const piece = this.pieces[code];

                if (piece.set === i)
                    continue;
                
                if (this.sets[piece.set][piece.name].royal)
                    royality++;
            }

            if (royality === 0) 
                this.lose(this.sockets[Math.abs(i - 1)], 'capture');
        };

        const distance = {
            x: LETTERS.indexOf(destination[0]) - LETTERS.indexOf(start[0]),
            y: destination[1] - start[1]
        };

        contains = this.sets[piece.set][piece.name].fields.some(v => {
            return (v.x * (this.colors[i] ? 1 : -1) === distance.x && v.y * (this.colors[i] ? 1 : -1) === distance.y)
        });

        if (contains) 
            return move();

        const direction = {
            x: distance.x === 0 ? 0 : distance.x / Math.abs(distance.x),
            y: distance.y === 0 ? 0 : distance.y / Math.abs(distance.y)
        };
      
        contains = this.sets[piece.set][piece.name].axes.some(v => {
            return (v.x * (this.colors[i] ? 1 : -1) === direction.x && v.y * (this.colors[i] ? 1 : -1) === direction.y)
        });

        if(contains) { 

            for (let i = 1; i <= 8; i++) {
                
                const x = i * direction.x + LETTERS.indexOf(start[0]);
                const y = i * direction.y + parseInt(start[1]);

                if (0 < x && x <= 8) {
                    if (0 < y && y <= 8) {

                        const c = LETTERS[x] + y;

                        if (c === destination)
                            return move();

                        if (this.pieces[c])
                            return;
                    }
                }
            }
        }
    }

    lose(socket, reason: 'capture' | 'disconnect' | 'forfeit') {
        
        const i = this.sockets.indexOf(socket);
        
        if (i === -1)
            return;
     
        this.sockets[Math.abs(i - 1)].emit('win', reason);
        this.sockets[i].emit('lose', reason);
        
        Game.games = Game.games.filter(value => { return value !== this });
    }

    broadcast(event, ...args) {

        for (const socket of this.sockets)
            socket.emit(event, ...args);
    }

    static games = [];
    static bySocket(socket) {

        for (const game of this.games) {

            if (game.sockets.includes(socket))
                return game;
        }
    }
}

io.on('connection', socket => {

    devTools(socket);

    socket.on('join-queue', (info, set) => { joinQueue(socket, info, set); });
    socket.on('quit-queue', () => { quitQueue(socket); });

    socket.on('disconnect', () => { Game.bySocket(socket)?.lose(socket, 'disconnect'); quitQueue(socket); });

    socket.on('forfeit', () => { Game.bySocket(socket)?.lose(socket, 'forfeit'); });

    socket.on('move', code => {

        Game.bySocket(socket)?.move(socket, code);
    });
});



app.get(/^[^.]+$/, (_, res) => { res.sendFile(__dirname + '/front/index.html'); });


http.listen(port, () => {
    console.log('listening on *:' + port);
});

app.use("/static", express.static('./front/static/'));


const devTools = socket => {

    console.log('[' + new Date().toLocaleTimeString() + '] New Connection');

    socket.on('clients-count', () => {
        socket.emit('dev-tools', io.engine.clientsCount);
    });
}