const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.resolve(rootDir, 'package');
const seaConfigPath = path.resolve(rootDir, 'sea.json');
const prepBlob = path.resolve(packageDir, 'sea-prep.blob');
const mainJs = path.resolve(packageDir, 'main.js');
const distDir = path.resolve(rootDir, 'dist');
const executableName = process.platform === 'win32' ? 'neutron.exe' : 'neutron';
const executablePath = path.resolve(packageDir, executableName);

function run(command) {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: rootDir });
}

try {
    if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir);
    }

    console.log('--- Step 1: Building project ---');
    run('npm run build');

    console.log('--- Step 2: Bundling into a single file (CJS) ---');
    // We bundle from dist/index.js (already compiled by tsc) to preserve decorator metadata
    const outFile = path.join(packageDir, 'main.cjs');
    run(`npx esbuild "${path.join(distDir, 'index.js')}" --bundle --platform=node --format=cjs --outfile="${outFile}" --external:sqlite3 --external:pg --external:mysql2 --external:ejs --keep-names`);

    // Create a tiny CommonJS bootstrap that uses Module.createRequire to load the CJS bundle from disk
    const entryCjsPath = path.join(packageDir, 'entry.cjs');
    fs.writeFileSync(entryCjsPath, `
// SEA bootstrap: avoid using the embedded require() for userland modules
const path = require('path');
const Module = require('module');
const mjsPath = path.join(path.dirname(process.execPath), 'main.cjs');
const createRequire = Module.createRequire(process.execPath);
createRequire(mjsPath);
`);

    console.log('--- Step 3: Generating SEA blob ---');
    run(`node --experimental-sea-config "${seaConfigPath}"`);

    console.log('--- Step 4: Preparing executable ---');
    const nodeExe = process.execPath;
    console.log(`Copying ${nodeExe} to ${executablePath}`);
    fs.copyFileSync(nodeExe, executablePath);

    console.log('--- Step 5: Injecting blob into executable ---');
    const postjectFlags = process.platform === 'darwin'
        ? '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name __NODE_SEA'
        : '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

    run(`npx postject "${executablePath}" NODE_SEA_BLOB "${prepBlob}" ${postjectFlags} --overwrite`);

    console.log('\n--- SUCCESS ---');
    console.log(`Executable created at: ${executablePath}`);

} catch (error) {
    console.error('\n--- FAILED ---');
    console.error(error.message);
    process.exit(1);
}
