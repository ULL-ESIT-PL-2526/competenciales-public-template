const path = require('path');
const { spawnSync } = require('child_process');

describe('Runtime error reporting', () => {
  test('reports illegal break', () => {
    const cliPath = path.resolve(__dirname, '..', 'bin', 'drg2js.cjs');
    const fixturePath = path.resolve(__dirname, 'fixtures', 'runtime-err01-loop.drg');

    const run = spawnSync(process.execPath, [cliPath, fixturePath, '-s'], {
      encoding: 'utf8',
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Error: Illegal break statement');
    expect(run.stderr).toContain('At generated code');
  });

  test('reports array access runtime error with generated-code location', () => {
    const cliPath = path.resolve(__dirname, '..', 'bin', 'drg2js.cjs');
    const fixturePath = path.resolve(__dirname, 'fixtures', 'runtime-err02-arrayaccess.drg');

    const run = spawnSync(process.execPath, [cliPath, fixturePath, '-s'], {
      encoding: 'utf8',
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("Error: Cannot read properties of undefined (reading '0')");
    expect(run.stderr).toContain('At generated code');
  });

  test('reports indexed assignment runtime error with generated-code location', () => {
    const cliPath = path.resolve(__dirname, '..', 'bin', 'drg2js.cjs');
    const fixturePath = path.resolve(__dirname, 'fixtures', 'runtime-err03-arrayassign.drg');

    const run = spawnSync(process.execPath, [cliPath, fixturePath, '-s'], {
      encoding: 'utf8',
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("Error: Cannot set properties of undefined (setting '0')");
    expect(run.stderr).toContain('At generated code');
  });
});
