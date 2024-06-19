// Importing required modules
import fs from 'fs';
import path from 'path';
import { AsciiTable3 } from 'ascii-table3';
import { loading } from 'cli-loading-animation';
import clispinners from 'cli-spinners';
import chalk from 'chalk';
import config from './config.json';

// Defining a custom spinner
const bluespinner = {
    frames: clispinners.dots.frames.map(frame => chalk.cyan(frame)),
    interval: clispinners.dots.interval
};

// Function to run tests
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
        console.log(`${chalk.greenBright("✓")} ${then-now}${chalk.greenBright("ms")}`);
        testdurations.push(then-now);
    }
    return testdurations;
}

// Get all TypeScript files in the 'run' directory
const files = fs.readdirSync(path.join(__dirname, 'run')).filter(file => file.endsWith('.ts'));

// Store test durations for each runtime
let durations = {
    "ts-node": new Array<number>(),
    "deno": new Array<number>(),
    "bun": new Array<number>()
}

// Run tests for each file and runtime
for (const file of files) {
    console.log(`\n${chalk.yellow("FILE")}: ${chalk.magentaBright(file)}`);
    for(const runtime of Object.keys(config.runtimes)) {
        if (config.runtimes[runtime as keyof typeof config.runtimes]) {
            console.log(`${chalk.green("RUNTIME")}: ${chalk.magenta(runtime)}`);
            let cmd;
            if (["deno", "bun"].includes(runtime)) cmd = [runtime, "run"];
            else cmd = ['node', '--loader', 'ts-node/esm'];
            const result = await test(cmd, file);
            durations[runtime as keyof typeof config.runtimes].push(...result);
        }
    }
    console.log('----------------')
}

console.log('\n\n');

// Generate and display test result tables
const headers = new Array<string>(files.length).fill("").map((_, i) => chalk.cyan(files[i]));

const tables = {
    "ts-node": new AsciiTable3(chalk.magenta("ts-node")).setHeading(...headers),
    "deno": new AsciiTable3(chalk.magenta("deno")).setHeading(...headers),
    "bun": new AsciiTable3(chalk.magenta("bun")).setHeading(...headers)
}

for (const runtime of Object.keys(config.runtimes))
    if(config.runtimes[runtime as keyof typeof config.runtimes] === true) {

        const table = tables[runtime as keyof typeof config.runtimes];
        const data = durations[runtime as keyof typeof config.runtimes];
        for (let i = 0; i <= config.tests; i++) table.addRow();
        for (let f = 0; f < files.length; f++) 
            for (let i = 0; i < config.tests; i++) 
                table.rows[i].push(data[i + f * config.tests].toLocaleString() + chalk.greenBright("ms"));

        // Calculate average test duration and add it to the last table row
        const averages = new Array<number>(files.length).fill(0);
        for (let f = 0; f < files.length; f++) 
            for (let i = 0; i < config.tests; i++) 
                averages[f] += data[i + f * config.tests];
        for (let f = 0; f < files.length; f++)
            table.rows[config.tests].push(chalk.grey("avg ") + Math.round(averages[f] / config.tests).toLocaleString() + chalk.greenBright("ms"));
    
        // Display the table

        console.log(tables[runtime as keyof typeof config.runtimes].toString());

    }