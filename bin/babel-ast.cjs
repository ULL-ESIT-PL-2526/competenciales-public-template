#!/usr/bin/env node
const { program } = require('commander');
const parser = require('@babel/parser');
const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');

program
  .name('babel-ast')
  .description('Inspect Babel AST for JavaScript code')
  .version(packageJson.version)
  .argument('[file]', 'JavaScript file to parse')
  .option('-p, --program <code>', 'JavaScript code to parse')
  .option('-o, --output <file>', 'Output file path (default: tmp/babast.json)')
  .option('-v, --verbose', 'Show AST in console')
  .option('-n, --noloc', 'Remove location information (loc, start, end)')
  .parse(process.argv);

const options = program.opts();
const args = program.args;

// Function to remove location information from AST
function removeLocationInfo(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(removeLocationInfo);
  }
  
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const key in obj) {
      if (!['loc', 'start', 'end', 'innerComments', 'leadingComments', 'trailingComments'].includes(key)) {
        cleaned[key] = removeLocationInfo(obj[key]);
      }
    }
    return cleaned;
  }
  
  return obj;
}

let code;

if (options.program) {
  code = options.program;
} else if (args[0]) {
  code = fs.readFileSync(args[0], 'utf-8');
} else {
  console.error('Error: Please provide code with -p option or a file path');
  console.error('Usage: babel-ast [file] or babel-ast -p "code"');
  process.exit(1);
}

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: []
});

// Remove location info if requested
let processedAst = ast;
if (options.noloc) {
  processedAst = removeLocationInfo(ast);
}

const astJson = JSON.stringify(processedAst, null, 2);

// Determine output path
let outputPath;
if (options.output) {
  outputPath = options.output;
} else {
  const tmpDir = path.join(__dirname, '../tmp');
  
  // Create tmp directory if it doesn't exist
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  outputPath = path.join(tmpDir, 'babast.json');
}

// Write to file
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, astJson, 'utf-8');
console.error(`AST written to ${path.relative(process.cwd(), outputPath)}`);

if (options.verbose) {
  console.log(astJson);
}