
%%


%%

// Builder function for variable declarations
function buildDecl(typeNode, name, loc) {
  /* fill here */
}

// Builder function for basic types
function buildBasicType(basicTypeName) {
  /* fill here */
}

// Builder function for print statements (converts to console.log)
function buildPrintStmt(expression, loc) {
  /* fill here */
}

function toLoc(jisonLoc) {
  if (!jisonLoc) return undefined;
  return {
    start: { line: jisonLoc.first_line, column: jisonLoc.first_column },
    end: { line: jisonLoc.last_line, column: jisonLoc.last_column }
  };
}

function withLoc(node, jisonLoc) {
  if (!node || !jisonLoc) return node;
  node.loc = toLoc(jisonLoc);
  return node;
}

function buildProgram(body, loc) {
  /* fill here */
}

function buildBlock(body, loc) {
  /* fill here */
}

function buildType(typeNode, loc) {
  /* fill here */
}

function buildArrayType(elementType, size, loc) {
  /* fill here */
}

function buildIdentifier(name, loc) {
  /* fill here */
}

// Helper function for system-generated identifiers (not prefixed)
function buildSystemIdentifier(name, loc) {
  /* fill here */
}

function buildMemberExpression(object, property, loc) {
  /* fill here */
}

function buildBinary(operator, left, right, loc) {
  /* fill here */
}

function buildUnary(operator, argument, loc) {
  /* fill here */
}

function buildNumericLiteral(value, loc) {
  /* fill here */
}

function buildBooleanLiteral(value, loc) {
  /* fill here */
}

function buildStringLiteral(rawString, loc) {
  /* fill here */
}

function buildAssignmentStatement(left, right, stmtLoc, exprLoc) {
  /* fill here */
}

function buildIfStatement(test, consequent, alternate, loc) {
  /* fill here */
}

function buildWhileStatement(test, body, loc) {
  /* fill here */
}

function buildDoWhileStatement(body, test, loc) {
  /* fill here */
}

function buildBreakStatement(loc) {
  /* fill here */
}

// Helper function to extract basic type and array dimensions from a type node
function extractTypeInfo(typeNode) {
  const dimensions = [];
  let currentType = typeNode;
  
  // Traverse the type hierarchy to collect dimensions
  while (currentType && currentType.kind === 'array') {
    dimensions.push(currentType.size);
    currentType = currentType.elementType;
  }
  
  return { basicType: currentType, dimensions };
}

// Helper function to generate default value expression based on type
function getDefaultValue(basicTypeNode) {
  /* fill here */
}

// Helper function to generate array initialization (ES5-compatible)
function generateArrayInit(dimensions, basicTypeNode) {
  const defaultValue = getDefaultValue(basicTypeNode);
  
  if (dimensions.length === 0) {
    return defaultValue; // Return default value for scalar variables
  }

  /* fill here */  

  
}