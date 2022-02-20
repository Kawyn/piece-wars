const fs = require('fs');
const uglify = require('uglify-js');

const COMPONENTS = ['square', 'about', 'menu', 'online', 'pieces', 'disconnect'];

// TODO: try catch 

const minify = () => {

    try {
        let c = '';

        c += fs.readFileSync('./front/src/client.js', 'utf-8') + '\n';

        for (const comp of COMPONENTS)
            c += fs.readFileSync('./front/src/components/' + comp + '.js', 'utf-8') + '\n';

        c += fs.readFileSync('./front/src/app.js', 'utf-8') + '\n';

        fs.writeFileSync('./front/static/app.min.js', uglify.minify(c, {
            mangle: {
                toplevel: true
            },
            toplevel: true
        }).code);

        if (process.argv[2] !== '--watch')
            console.log(`[${new Date().toLocaleTimeString()}] New app.min.js length is ${c.length}.`);
        else {
            console.clear();
            console.log(`[${new Date().toLocaleTimeString()}] New app.min.js length is ${c.length}.`);
            console.log(`[${new Date().toLocaleTimeString()}] Watching for file changes...`);
        }
    }
    catch (error) { }
}

minify();

if (process.argv[2] !== '--watch')
    process.exit();

console.clear();
console.log(`[${new Date().toLocaleTimeString()}] Starting compilation in watch mode...`);

fs.watch('./front/src/', minify);
fs.watch('./front/src/components', minify);

console.log(`[${new Date().toLocaleTimeString()}] Watching for file changes.`);
