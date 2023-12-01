import readline from 'readline/promises';

export async function wait() {
    let r = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    await r.question('waiting!!');
    r.close();
}
