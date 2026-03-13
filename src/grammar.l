/* lexer written in Jison for the Dragon Book language */
/* translation of the by hand lexer in files lexer.js and tokens.js */

%{
// Keywords mapping
const keywords = new Map([
    ['if', 'IF'],
    ['else', 'ELSE'], 
    ['while', 'WHILE'],
    ['do', 'DO'],
    ['break', 'BREAK'],
    ['true', 'TRUE'],
    ['false', 'FALSE'],
    ['int', 'INT'],
    ['float', 'FLOAT'],
    ['char', 'CHAR'],
    ['bool', 'BOOL'],
    /* fill here */
]);
%}



%%

/* fill here */

/* End of file */
<<EOF>>                     { return 'EOF'; }

/* Catch-all for any other character */
.                           { 
                              const loc = (yylloc?.first_line) ? ` at line ${yylloc.first_line}, column ${yylloc.first_column}` : '';
                              throw new Error('Illegal character: ' + yytext + loc); 
                            }


