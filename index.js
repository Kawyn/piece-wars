var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var express = require('express');
var app = express();
var http = require('http').Server(app);
var port = process.env.PORT || 3000;
var io = require('socket.io')(http);
var LETTERS = ['_', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
var COLOR = {
    WHITE: true,
    BLACK: false
};
var queue = { socket: null, info: null, set: null, time: null };
var joinQueue = function (socket, info, set) {
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
        new Game([queue.socket, socket], [queue.info, info], [queue.set, set]);
        quitQueue(queue.socket);
    }
};
var quitQueue = function (socket) {
    if (queue.socket === socket) {
        for (var k in queue)
            queue[k] = null;
    }
    socket.emit('quit-queue');
};
var Move = (function () {
    function Move(code, piece) {
        this.code = code;
        this.piece = piece;
    }
    return Move;
}());
var Notation = (function () {
    function Notation() {
    }
    Notation.flip = function (code) {
        var _a = code.split(''), x = _a[0], y = _a[1];
        x = LETTERS.indexOf(x[0]);
        x += (8 - x * 2) + 1;
        y = parseInt(y);
        y += (8 - y * 2) + 1;
        return LETTERS[x] + y;
    };
    return Notation;
}());
var Game = (function () {
    function Game(sockets, infos, sets) {
        this.sockets = [];
        this.history = [];
        this.pieces = {};
        this.turn = 0;
        this.sockets = sockets;
        this.infos = infos;
        this.sets = sets;
        this.colors = [COLOR.BLACK, COLOR.BLACK];
        this.colors[Math.floor(Math.random() * 2)] = COLOR.WHITE;
        for (var i = 0; i < 2; i++) {
            var set = sets[i];
            var color = this.colors[i];
            for (var k in set) {
                for (var _i = 0, _a = set[k].spawns; _i < _a.length; _i++) {
                    var code = _a[_i];
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
    Game.prototype.move = function (socket, code) {
        var _this = this;
        var _a;
        var i = this.sockets.indexOf(socket);
        if (this.turn !== i)
            return;
        var start = code[0] + code[1];
        var destination = code[2] + code[3];
        var piece = this.pieces[start];
        if (!piece || ((_a = this.pieces[destination]) === null || _a === void 0 ? void 0 : _a.set) === piece.set)
            return;
        var contains;
        var move = function () {
            _this.history.push(new Move(code, _this.pieces[destination]));
            _this.broadcast('move', code);
            _this.pieces[destination] = _this.pieces[start];
            delete _this.pieces[start];
            _this.turn = (_this.turn + 1) % 2;
            var royality = 0;
            for (var code_1 in _this.pieces) {
                var piece_1 = _this.pieces[code_1];
                if (piece_1.set === i)
                    continue;
                if (_this.sets[piece_1.set][piece_1.name].royal)
                    royality++;
            }
            if (royality === 0)
                _this.lose(_this.sockets[Math.abs(i - 1)], 'capture');
        };
        var distance = {
            x: LETTERS.indexOf(destination[0]) - LETTERS.indexOf(start[0]),
            y: destination[1] - start[1]
        };
        contains = this.sets[piece.set][piece.name].fields.some(function (v) {
            return (v.x * (_this.colors[i] ? 1 : -1) === distance.x && v.y * (_this.colors[i] ? 1 : -1) === distance.y);
        });
        if (contains)
            return move();
        var direction = {
            x: distance.x === 0 ? 0 : distance.x / Math.abs(distance.x),
            y: distance.y === 0 ? 0 : distance.y / Math.abs(distance.y)
        };
        contains = this.sets[piece.set][piece.name].axes.some(function (v) {
            return (v.x * (_this.colors[i] ? 1 : -1) === direction.x && v.y * (_this.colors[i] ? 1 : -1) === direction.y);
        });
        if (contains) {
            for (var i_1 = 1; i_1 <= 8; i_1++) {
                var x = i_1 * direction.x + LETTERS.indexOf(start[0]);
                var y = i_1 * direction.y + parseInt(start[1]);
                if (0 < x && x <= 8) {
                    if (0 < y && y <= 8) {
                        var c = LETTERS[x] + y;
                        if (c === destination)
                            return move();
                        if (this.pieces[c])
                            return;
                    }
                }
            }
        }
    };
    Game.prototype.lose = function (socket, reason) {
        var _this = this;
        var i = this.sockets.indexOf(socket);
        if (i === -1)
            return;
        this.sockets[Math.abs(i - 1)].emit('win', reason);
        this.sockets[i].emit('lose', reason);
        Game.games = Game.games.filter(function (value) { return value !== _this; });
    };
    Game.prototype.broadcast = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        for (var _a = 0, _b = this.sockets; _a < _b.length; _a++) {
            var socket = _b[_a];
            socket.emit.apply(socket, __spreadArray([event], args));
        }
    };
    Game.bySocket = function (socket) {
        for (var _i = 0, _a = this.games; _i < _a.length; _i++) {
            var game = _a[_i];
            if (game.sockets.includes(socket))
                return game;
        }
    };
    Game.games = [];
    return Game;
}());
io.on('connection', function (socket) {
    devTools(socket);
    socket.on('join-queue', function (info, set) { joinQueue(socket, info, set); });
    socket.on('quit-queue', function () { quitQueue(socket); });
    socket.on('disconnect', function () { var _a; (_a = Game.bySocket(socket)) === null || _a === void 0 ? void 0 : _a.lose(socket, 'disconnect'); quitQueue(socket); });
    socket.on('forfeit', function () { var _a; (_a = Game.bySocket(socket)) === null || _a === void 0 ? void 0 : _a.lose(socket, 'forfeit'); });
    socket.on('move', function (code) {
        var _a;
        (_a = Game.bySocket(socket)) === null || _a === void 0 ? void 0 : _a.move(socket, code);
    });
});
app.get(/^[^.]+$/, function (_, res) { res.sendFile(__dirname + '/front/index.html'); });
http.listen(port, function () {
    console.log('listening on *:' + port);
});
app.use("/static", express.static('./front/static/'));
var devTools = function (socket) {
    console.log('[' + new Date().toLocaleTimeString() + '] New Connection');
    socket.on('clients-count', function () {
        socket.emit('dev-tools', io.engine.clientsCount);
    });
};
