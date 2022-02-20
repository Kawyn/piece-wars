const setupSquare = {

    template: ``
}

const pieces = {

    components: { setupSquare },



    template: `
        <div id="squares">
            <setupSquare 
                v-for="n in 64" :key="n" 
                
                :n="n - 1" 
            />
        </div>`
}