import fs from 'fs';
import path from 'path';
import { loading } from 'cli-loading-animation';
import clispinners from 'cli-spinners';
import chalk from 'chalk';
import config from './config.json';

const bluespinner = {
    frames: clispinners.dots.frames.map(frame => chalk.cyan(frame)),
    interval: clispinners.dots.interval
};

async function test(runtime: string[], file: string) {
    let testdurations = new Array<number>();
    for (let i = 0; i < config.tests; i++) {
        const { start, stop } = loading(` ${chalk.yellowBright('Running')} ${chalk.magentaBright(file)} on ${chalk.magenta(runtime[0].replace("node", "ts-node"))}${chalk.grey('...')}`, { clearOnEnd: true, spinner: bluespinner });
        start();
        const now = Date.now();
        const proc = Bun.spawn(
            {
                "cmd": [...runtime, `./run/${file}`],
                "stderr": "ignore"
            }
        );
        await proc.exited;
        const then = Date.now();
        stop();
        console.log(`${chalk.greenBright("✓")} ${then-now}${chalk.redBright("ms")}`);
        testdurations.push(then-now);
    }
    return testdurations;
}

const files = fs.readdirSync(path.join(__dirname, 'run'));

let durations = {
    "ts-node": new Array<number>(),
    "deno": new Array<number>(),
    "bun": new Array<number>()
}

for (const file of files) {
    console.log(`\n${chalk.yellow("FILE")}: ${chalk.magentaBright(file)}`);
    for(const runtime of Object.keys(config.runtimes)) {
        console.log(`${chalk.green("RUNTIME")}: ${chalk.magenta(runtime)}`);
        if (config.runtimes[runtime as keyof typeof config.runtimes]) {
            let cmd;
            if (["deno", "bun"].includes(runtime)) cmd = [runtime, "run"];
            else cmd = ['node', '--loader', 'ts-node/esm'];
            const result = await test(cmd, file);
            durations[runtime as keyof typeof config.runtimes].push(...result);
        }
    }
    console.log('----------------')
}