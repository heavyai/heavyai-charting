module.exports = {
  "extends": ["prettier"],
  "rules": { // And why they're best practice (alphabetized).
    "accessor-pairs": [2, {"getWithoutSet": true}], // omission is usually by mistake.
    "array-callback-return": 1, // omission is usually by mistake.
    "arrow-body-style": [2, "as-needed"], // improves consistency and readability.
    "callback-return": [1, ["callback", "cb", "next"]], // usually returns control to cb, so best to return out of function as well.
    "complexity": 1, // code with high cyclomatic complexity is difficult to reason about.
    "consistent-return": 1, // reduces ambiguity about what gets returned.
    "consistent-this": [1, "context"], // enforces a standard var for capturing context (which should be done sparingly).
    "constructor-super": 2, // catches runtime syntax errors.
    "curly": 2, // reduces ambiguity around blocks and line breaks.
    "default-case": 1, // not having default (and break) lead to unexpected results.
    "dot-notation": 2, // easier to read.
    "eqeqeq": 1, // avoids unexpected type coercion.
    "func-names": 0, // having named functions makes following stack traces much easier.
    "func-style": [0, "declaration"], // differentiates funcs from consts; hoisting allows more readable code ordering.
    "global-require": 0, // avoid unexpected sync file load.
    "guard-for-in": 1, // protects against looping over props up prototype chain.
    "handle-callback-err": [1, "^.*(e|E)rr"], // often omitted in error.
    "id-blacklist": 0, // will add variable names to this list if abused.
    "id-length": 0, // variable naming is difficult enough without limits.
    "id-match": 0, // covered by camelCase.
    "linebreak-style": [2, "unix"], // improves consistency; prevents windows users from introducing \r.
    "max-depth": [1, 4], // deeply nested code can be difficult to read.
    "max-nested-callbacks": [1, 3], // a sign that the nested code should be refactored out.
    "max-params": 0, // better to have many params than obscure them with a config object.
    "newline-after-var": 0, // improves consistency; concise code gives reader more context.
    "newline-before-return": 0, // vertical space is too precious to be wasted.
    "no-alert": 2, // alerts are annoying.
    "no-array-constructor": 1, // can do surprising things; better to use [].
    "no-bitwise": 0, // these are usually typos; can be difficult to reason about.
    "no-caller": 2, // deprecated.
    "no-case-declarations": 0, // can lead to unexpected behavior.
    "no-catch-shadow": 2, // causes a bug in IE8.
    "no-class-assign": 2, // usually a typo.
    "no-cond-assign": 0, // usually typos.
    "no-console": 1, // for debugging only; shouldn't be committed.
    "no-const-assign": 2, // catches runtime syntax errors.
    "no-constant-condition": 2, // unnecessary; usually a typo.
    "no-continue": 1, // makes reasoning about loops more difficult.
    "no-control-regex": 2, // usually a typo.
    "no-debugger": 2, // for debugging only; shouldn't be committed.
    "no-delete-var": 2, // only properties should be deleted.
    "no-div-regex": 0, // regex are difficult enough; also operator-assignment disallows /= operator.
    "no-dupe-args": 1, // shadowing increases ambiguity.
    "no-dupe-class-members": 2, // can behave unexpectedly, probably a typo.
    "no-duplicate-case": 2, // almost certainly a mistake.
    "no-duplicate-imports": 2, // should be consolidated for brevity.
    "no-else-return": 0, // explicit conditional paths are better than implicit.
    "no-empty": 2, // probably a mistake.
    "no-empty-character-class": 2, // probably a typo.
    "no-empty-function": 1, // probably a mistake.
    "no-empty-pattern": 2, // looks like object but is in fact noop.
    "no-eval": 2, // eval is often unsafe and performs poorly.
    "no-ex-assign": 2, // overwriting params is usually bad; can obscure errors.
    "no-extend-native": 2, // can cause unexpected behavior for other devs.
    "no-extra-bind": 2, // removes useless code.
    "no-extra-boolean-cast": 2, // unnecessary.
    "no-extra-label": 2, // don't use labels
    "no-fallthrough": 2, // catches mistakes that lead to unexpected behavior.
    "no-func-assign": 2, // probably a typo.
    "no-implicit-coercion": 2, // avoids fancy coercion tricks that inhibit readability.
    "no-implicit-globals": 0, // modules make this rule unnecessary.
    "no-implied-eval": 2, // eval is often unsafe and performs poorly.
    "no-inline-comments": 0, // helps prevent post-refactor orphaned comments.
    "no-invalid-regexp": 2, // the more checks on regex correctness the better.
    "no-inner-declarations": 2, // avoids unexpected behavior.
    "no-irregular-whitespace": 1, // improves consistency.
    "no-iterator": 2, // this feature is obsolete and not widely supported.
    "no-label-var": 2, // a bad feature related to loop control flow, like GOTO.
    "no-labels": 2, // a bad feature related to loop control flow, like GOTO.
    "no-lone-blocks": 2, // unless in es6, these are just useless clutter.
    "no-lonely-if": 1, // extra-verbose and unusual.
    "no-loop-func": 2, // functions in loops are difficult to reason about.
    "no-mixed-requires": 1, // group requires and seperate from other init for clearer code.
    "no-multi-str": 2, // use newline chars or template strings instead.
    "no-native-reassign": 2, // can cause unexpected behavior for other devs.
    "no-negated-in-lhs": 2, // reduces ambiguity and typos.
    "no-nested-ternary": 1, // improves reasonability.
    "no-new": 2, // using new for side effects is bad because side effects are bad and OO is bad.
    "no-new-func": 2, // eval is often unsafe and performs poorly.
    "no-new-object": 2, // use more concise {} instead.
    "no-new-require": 2, // unusual; just use require.
    "no-new-symbol": 2, // should be called as a function without new.
    "no-new-wrappers": 2, // does not do what it looks like it does.
    "no-obj-calls": 2, // part of the spec.
    "no-octal": 2, // can be confusing.
    "no-octal-escape": 2, // deprecated.
    "no-param-reassign": 0, // useful for guarding a function.
    "no-path-concat": 2, // breaks for non-unix system.
    "no-plusplus": 0,
    "no-process-env": 0, // global deps are bad; better to use config files.
    "no-process-exit": 2, // too drastic; almost always better to throw and handle.
    "no-proto": 2, // deprecated.
    "no-redeclare": [1, {"builtinGlobals": true}], // probably a mistake; should use const/let instead anyway.
    "no-regex-spaces": 2, // probably a typo.
    "no-restricted-globals": 0, // not (yet) necessary.
    "no-restricted-imports": 0, // not (yet) necessary.
    "no-restricted-modules": 0, // not (yet) necessary.
    "no-restricted-syntax": [1, "TryStatement"], // try-catch makes tracing errors difficult (see http://j.mp/thriftthrow).
    "no-return-assign": [2, "always"], // can cover up typos.
    "no-script-url": 2, // eval is often unsafe and performs poorly.
    "no-self-assign": 2, // no effect; probably a typo.
    "no-self-compare": 1, // usually a typo; better to use isNaN.
    "no-sequences": 2, // usually a typo; obscures side effects.
    "no-shadow-restricted-names": 2, // should not mess with restricted.
    "no-sparse-arrays": 2, // usually typos.
    "no-sync": 2, // blocks single thread; use async.
    "no-ternary": 0, // ternaries more concise and more strict than if/else.
    "no-this-before-super": 2, // catches a reference error.
    "no-throw-literal": 1, // be consistent about only throwing Error objects.
    "no-undef": 1, // catches ReferenceErrors.
    "no-undef-init": 2, // unnecessary.
    "no-unmodified-loop-condition": 2, // possible infinite loop; probably a mistake.
    "no-unneeded-ternary": 2, // improves consistency and readability.
    "no-unreachable": 2, // helps keep things clean during refactoring.
    "no-unsafe-finally": 2, // leads to unexpected behavior.
    "no-unused-expressions": 1, // usually a typo; has o effect.
    "no-unused-labels": 2, // don't use labels.
    "no-unused-vars": 1, // probably a mistake.
    "no-use-before-define": [1, {"functions": false}], // avoids temporal dead zone; functions below can improve readability.
    "no-useless-call": 1, // slower than normal invocation.
    "no-useless-computed-key": 2, // unnecessary; can cause confusion.
    "no-useless-constructor": 2, // unnecessary.
    "no-useless-escape": 1, // makes code easier to read.
    "no-var": 1, // const is best, and let is useful for counters, but they eclipse var's uses. #ES6only
    "no-void": 2, // unusual and unnecessary.
    "no-warning-comments": 1, // warning comments should be addressed before merge (or moved out of code).
    "no-with": 2, // can add unexpected variables to scope.
    "object-shorthand": 2, // increases consistency. #ES6only
    "prefer-arrow-callback": 2, // increases readability and consistency.
    "prefer-const": 1, // better to be explicit about what is expected to change.
    "prefer-rest-params": 0, // easier to read than slicing args. #ES6only
    "prefer-template": 0,
    "require-yield": 2, // omission is probably a mistake.
    "spaced-comment": 2, // improves consistency.
    "use-isnan": 2, // comparing to NaN can be difficult to reason about.
    "valid-jsdoc": 0, // not using jsdoc.
    "valid-typeof": 2, // there are ways to type-check, but will least prevent typos.
    "yoda": 2 // improves readability and consistency.
  },
  "env": {
    "es6": true,
    "browser": true,
    "node": true,
    "jasmine": true
  },
  "parser": "babel-eslint",
  "parserOptions": {
    "ecmaVersion": 6,
    "ecmaFeatures": {
      "arrowFunctions": true,
      "binaryLiterals": true,
      "blockBindings": true,
      "classes": true,
      "defaultParams": true,
      "destructuring": true,
      "forOf": true,
      "generators": true,
      "objectLiteralComputedProperties": true,
      "objectLiteralDuplicateProperties": true,
      "objectLiteralShorthandMethods": true,
      "objectLiteralShorthandProperties": true,
      "octalLiterals": true,
      "regexUFlag": true,
      "regexYFlag": true,
      "restParams": true,
      "spread": true,
      "superInFunctions": true,
      "templateStrings": true,
      "unicodeCodePointEscapes": true,
      "globalReturn": true,
      "experimentalObjectRestSpread": true
    },
    "sourceType": "module"
  },
  "extends": "eslint:recommended"
}
