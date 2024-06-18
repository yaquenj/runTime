import fs from 'fs';
import path from 'path';
import config from './config.json';

async function test(runtime: string[], file: string) {
    let durations = new Array<number>();
    for (let i = 0; i < config.tests; i++) {
        const now = Date.now();
        const proc = Bun.spawn(
            {
                "cmd": [...runtime, `./run/${file}.ts`],
                "stderr": "ignore"
            }
        );
        await proc.exited  
        const then = Date.now()
        durations.push(then-now);
    }
    return durations;
}

const files = fs.readdirSync(path.join(__dirname, 'run'));

let durations = {
    "ts-node": new Array<number>(),
    "deno": new Array<number>(),
    "bun": new Array<number>()
}

for (const file of files) {
    console.log(file);
    for(const runtime of Object.keys(config.runtimes)) {
        console.log(runtime)
        if (config.runtimes[runtime as keyof typeof config.runtimes]) {
            let cmd;
            if (["deno", "bun"].includes(runtime)) cmd = [runtime, "run"];
            else cmd = ['node', '--loader', 'ts-node/esm'];
            const result = await test(cmd, file);
            console.log(result);
            durations[runtime as keyof typeof config.runtimes].push(...result);
        }
    }
    console.log('-------------')
}