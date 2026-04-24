const { isDeepStrictEqual } = require('dragon2js/lib/support-lib');
{
let $a = Array.from({ length: 10 }, () => 0);
let $b = Array.from({ length: 10 }, () => 0);
console.log(isDeepStrictEqual($a, $b));
}
//# sourceMappingURL=array-equality.js.map