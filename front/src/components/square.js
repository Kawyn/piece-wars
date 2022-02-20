const square = {

    props: ['n', 'config', 'sets', 'pieces', 'moves', 'history', 'start'],

    computed: {

        code() {

            let x = this.$props.n % 8 + 1;
            let y = Math.floor(this.$props.n / 8) + 1;

            if (this.$props.config.color) y += (8 - y * 2) + 1;
            else x += (8 - x * 2) + 1;

            return [, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][x] + y;
        },

        color() {

            return ([, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].indexOf(this.code[0]) + parseInt(this.code[1])) % 2;
        }

    },

    template: `
        <div 
            :class="'square-' + (color ? 'primary' : 'secondary') + (history.includes(code) ? '-v' : '')"
         
            @click="() => { this.$emit('square-click', code); }"
            @mouseenter="() => { this.$emit('square-enter', code); }"
        >
         
            {{ code }}
            <div v-if="moves.includes(code)" :class="'dot' + (pieces[code] ? '-piece' : '') + (start ? '-primary' : '-secondary')"></div>
            <img 
                v-if="pieces[code]"
                
                :src="sets[pieces[code].set].src"
                :alt="pieces[code].name"

                class="piece"
                
                :style="
                    'cursor:' + (pieces[code].set === config.i ? 'pointer' : 'defualt')
                "
            />
        </div>
    `,
}