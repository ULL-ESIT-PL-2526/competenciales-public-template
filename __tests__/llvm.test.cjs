const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
/* Tests are very slow.
Dividing them in several folders: llvm-fixtures, llvm-fixtures-array, llvm-fixtures-control, etc.
and setting the fixturesDir to the corresponding folder allows to run only a subset of tests when needed.
Let us get the fixturesDir from an environment variable, with a default to the main llvm-fixtures folder. */

const fixturesDir = process.env.FIXTURES_DIR || path.join(__dirname, 'llvm-fixtures-simple');
console.debug(`Running LLVM tests with fixtures from folder: "${path.basename(fixturesDir)}"`);


describe('LLVM Code Generation Fixtures', () => {
    const projectRoot = path.resolve(__dirname, '..');
    
    const tmpDir = path.join(projectRoot, 'tmp');
    const binDir = path.join(projectRoot, 'bin');
    const drg2jsPath = path.join(binDir, 'drg2js.cjs');

    // Keep fixture list deterministic for stable test output.
    const fixtureNames = fs
        .readdirSync(fixturesDir)
        .filter((name) => name.endsWith('.drg'))
        .map((name) => path.basename(name, '.drg'))
        .sort();

    beforeAll(() => {
        fs.mkdirSync(tmpDir, { recursive: true });
        // Fail early with a clear message if lli is missing.
        execSync('command -v lli', { cwd: projectRoot, stdio: 'pipe' });
    });

    // Compile one fixture to LLVM IR and run it with lli.
    function executeFixture(fixtureName) {
        const drgFile = path.join(fixturesDir, `${fixtureName}.drg`);
        const llFile = path.join(tmpDir, `${fixtureName}.ll`);
        const expectedFile = path.join(fixturesDir, `${fixtureName}.expected`);

        //console.debug(`Compiling fixture ${fixtureName} to LLVM IR...`);
        execSync(`${drg2jsPath} -g llvm ${drgFile} -o ${llFile}`, {
            cwd: projectRoot,
            stdio: 'pipe'
        });

        //console.debug(`Running compiled LLVM IR for fixture ${fixtureName} with lli...`);
        const output = execSync(`lli ${llFile}`, {
            cwd: projectRoot,
            encoding: 'utf8'
        });

        const expected = fs.readFileSync(expectedFile, 'utf8');
        return { output, expected };
    }

    test.each(fixtureNames)('fixture %s matches expected lli output', (fixtureName) => {
        const expectedFile = path.join(fixturesDir, `${fixtureName}.expected`);
        expect(fs.existsSync(expectedFile)).toBe(true);

        const { output, expected } = executeFixture(fixtureName);

        // Ignore trailing newline differences while preserving exact content.
        expect(output.trimEnd()).toBe(expected.trimEnd());
    });
});
