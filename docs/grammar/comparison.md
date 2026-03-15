# Comparison with Hand-Written Parser

| Aspect | Jison | Hand-Written (Dragon Book) |
|--------|-------|---------------------------|
| **Source Lines** | 182 lines (grammar.jison + grammar.l) | Estimated 500-1000+ lines (recursive descent functions for each grammar rule) |
| **Maintenance** | Change grammar rules once (syntax agnostic) | Update logic across multiple parsing functions |
| **Debugging** | Grammar is declarative; trace parse state | Code is procedural; step through function calls |
| **Performance** | LALR table-driven (faster parsing, heavier parse tables) | Recursive descent (simpler code, predictable performance) |
| **Error Messages** | Generic shift/reduce conflict messages | Can implement custom error recovery per rule |
| **Implementation Effort** | Fast: write grammar, run Jison | Slow: write parser functions, test each rule |
| **Learning Curve** | Need BNF grammar + Yacc/Bison concepts | Follow traditional compiler textbook examples |

## Notes

- **Complexity figures**: Jison count verified from `dragon2js/src/` files; hand-written estimate based on recursive descent structure (1-6 functions per rule type)
- **Maintenance**: Jison wins for single-source-of-truth; hand-written requires parallel updates across functions
- **Performance**: LALR typically faster for large grammars; recursive descent more transparent for small ones
- **Error handling**: Jison 0.4.x has basic recovery; custom recovery requires grammar modifications
- **Dragon Book reference**: Traditional approach described in Chapters 4-5; Jison is modern alternative

---

## Navigation: [← Previous](key-design-decisions.md) | [↑ Top](README.md) | [Next →](references.md)
