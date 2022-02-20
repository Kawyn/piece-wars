const menu = {

    props: ['state'],

    data() {
        return {
            username: this.$getCookie('username') || `Random Guy #${(Math.floor(Math.random() * 900000) + 100000).toString(16)}`
        }
    },

    methods: {
        join() {
            this.$socket.emit('join-queue',
                { username: this.username },
                {
                    'queen': {
                        axes: [
                            //   { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 1, y: -1 },
                            { x: 0, y: -1 }, { x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 },
                        ],
                        spawns: ['a1', 'd4'],
                        fields: [{ x: 2, y: 3 }],
                    },
                    'king': {
                        royal: true,

                        axes: [],
                        fields: [
                            { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 1, y: -1 },
                            { x: 0, y: -1 }, { x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 },
                        ],

                        spawns: ['a4'],
                    }
                });
        },
        quit() { this.$socket.emit('quit-queue'); }, pieces() { this.$router.push('pieces') }
    },

    watch:
    {
        username(to, from) {
            this.$setCookie('username', to);
        }
    },

    template: `
        <div id="menu">
            <div class="center" v-if="state === 'waiting'">
                in queue
                <button @click="quit">Leave</button>
            </div>
            <div v-else>
                <input type="text" v-model="username" />
                <button @click="join">Play</button>
                <button @click="pieces">Set Up</button>
            </div>
        </div>
    `,
}