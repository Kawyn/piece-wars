const online = {

    components: { square },

    props: ['state', 'config', 'pieces', 'sets'],

    data() {
        return {
            gameState: ['in-progress',],

            turn: false,

            history: [],

            start: null,
            moves: [],

        }
    },

    methods: {
        getPossibleMoves(code) {

            const LETTERS = [, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

            const piece = this.$props.pieces[code];

            if (!piece)
                return;

            const result = [];
            const start = { x: LETTERS.indexOf(code[0]), y: +code[1] };

            const color = piece.set === this.config.i ? this.config.color : !this.config.color;

            // axes
            for (const axis of this.sets[piece.set][piece.name].axes) {

                for (let i = 1; i <= 8; i++) {

                    const x = i * axis.x * (color ? 1 : -1) + start.x;
                    const y = i * axis.y * (color ? 1 : -1) + start.y;

                    if (0 < x && x <= 8) {
                        if (0 < y && y <= 8) {

                            const c = LETTERS[x] + y;

                            if (this.pieces[c]) {

                                if (this.pieces[c].set !== piece.set)
                                    result.push(c);

                                break;
                            }

                            result.push(c);
                        }
                    }
                }
            }

            // fields
            for (const f of this.sets[piece.set][piece.name].fields) {

                const x = f.x * (color ? 1 : -1) + start.x;
                const y = f.y * (color ? 1 : -1) + start.y;


                if (0 < x && x <= 8) {
                    if (0 < y && y <= 8) {

                        const c = LETTERS[x] + y;

                        if (this.pieces[c]?.set === piece.set)
                            break;

                        result.push(c);
                    }
                }
            }

            return result;
        },

        onSquareClick(code) {

            if (this.gameState[0] != 'in-progress')
                return;

            if (!this.turn)
                return;

            const piece = this.$props.pieces[code];

            if (this.start === null) {

                if (!piece) return;
                if (piece.set !== this.$props.config.i) return;

                this.start = code;
                this.moves = this.getPossibleMoves(code);

                return;
            }

            if (this.moves.includes(code))
                this.$socket.emit('move', this.start + code);

            this.start = null;
            this.moves = [];
        },

        onSquareEnter(code) {

            if (this.start === null) {

                if (this.pieces[code]) this.moves = this.getPossibleMoves(code);
                else this.moves = [];
            }
        },

        onMove(code) { this.turn = !this.turn; this.history = [code[0] + code[1], code[2] + code[3]]; },

        onWin(reason) { this.gameState = ['won', reason]; },
        onLose(reason) { this.gameState = ['lost', reason]; }
    },

    computed: {
        resultMessage() {

            if (this.gameState[0] === 'lost')
                return 'You lose =(';

            let message = '';

            if (this.gameState[1] === 'disconnect')
                message = 'Your opponent lost connection. ';

            else if (this.gameState[1] === 'forfeit')
                message = 'Your opponent forfeit. ';


            return message + 'You WIN!'
        }
    },

    beforeMount() {

        if (this.$props.state !== 'playing')
            return this.$router.push('/');

        this.$socket.on('move', this.onMove);

        this.$socket.on('win', this.onWin);
        this.$socket.on('lose', this.onLose);

        this.turn = this.$props.config.color;
        console.log(this.turn);
    },

    beforeUnmount() {

        this.$socket.off('move', this.onMove);

        this.$socket.off('win', this.onWin);
        this.$socket.off('lose', this.onLose);
    },

    template: `
        
        <div id="online">
            <div v-if="gameState[0] !== 'in-progress'" id="result">
                <p> 
                    {{ resultMessage }}
                </p>

                <input type="button" value="Return To Menu" @click="$router.push('/')" />
                <input type="button" value="Hidde">
            </div>

            <input type="button" value="forfeit" @click="() => $socket.emit('forfeit')" />
        
            <div id="squares">
                <square 
                    v-for="n in 64" :key="n" 
                    
                    @square-click="onSquareClick"
                    @square-enter="onSquareEnter"

                    :n="n - 1" 
                
                    :config="config" 

                    :sets="sets" 
                    :pieces="pieces" 

                    :moves="moves"

                    :history="history"

                    :start="start"
                />
            </div>
        </div>
    `
}