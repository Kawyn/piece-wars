const routes = [
    { path: '/', component: menu },
    { path: '/online', component: online },
    { path: '/pieces', component: pieces }

];

const router = VueRouter.createRouter({ history: VueRouter.createWebHistory(), routes });

const app = Vue.createApp({

    methods: {
    },


    data() {
        return {
            state: '',

            config: false,

            sets: [],
            pieces: []
        }
    },

    beforeCreate() {

        this.$socket.on('join-queue', () => { this.state = 'waiting'; });
        this.$socket.on('quit-queue', () => { this.state = ''; });

        this.$socket.on('move', code => {

            const start = code[0] + code[1];
            const destination = code[2] + code[3];

            this.pieces[destination] = this.pieces[start];
            delete this.pieces[start];
        });

        this.$socket.on('disconnect', () => {
            this.$router.push('/disconnect');
        });

        this.$socket.on('start-game', (config, sets, pieces) => {
            this.config = config;

            this.sets = sets;
            this.pieces = pieces;

            this.state = 'playing';

            this.$router.push('/online');
        });
    }
})
app.config.globalProperties.$socket = io();

app.config.globalProperties.$getCookie = name => {
    return JSON.parse(document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || '');
};

app.config.globalProperties.$setCookie = (name, value) => {
    document.cookie = `${name}=${JSON.stringify(value)}; max-age=31536000; path=/`;
}



app.config.globalProperties.$set = {};
app.config.globalProperties.$setup = {};

app.use(router);

app.mount('#app');
