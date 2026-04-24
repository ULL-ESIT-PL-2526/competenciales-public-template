const path = require('path');
const { spawnSync } = require('child_process');

describe('Syntax error reporting', () => {
  test('reports file, line and column for fixtures/syntax-err01.drg', () => {
    const cliPath = path.resolve(__dirname, '..', 'bin', 'drg2js.cjs');
    const fixturePath = path.resolve(__dirname, 'fixtures', 'syntax-err01.drg');

    const run = spawnSync(process.execPath, [cliPath, fixturePath], {
      encoding: 'utf8',
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Error at');
    expect(run.stderr).toContain('fixtures/syntax-err01.drg:3:20');
    expect(run.stderr).toContain("Expecting ')', 'OR', got ';'");
  });
});
