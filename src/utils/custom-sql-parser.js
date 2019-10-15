// This implements a simple parser for custom SQL expressions. It's mostly
// based on the postgres documentation with notes about the bits that were
// skipped. I'm not sure how much of the postgres spec core implements; it's
// possible some of the skipped bits aren't even implemented in core anyway.
// I've made an attempt to implement all of the SQL standard stuff.
import { CstParser, Lexer, createToken } from "chevrotain"

const Whitespace = createToken({
  name: "Whitespace",
  pattern: /\s+/,
  group: Lexer.SKIPPED
})

// XXX:
// Window functions (OVER, PARTITION BY, USING, NULLS, FIRST, LAST, etc)
// Type casts (CAST ... AS ...)
// COLLATE
// Sub-queries (SELECT, et al)
// ARRAY
// ROW
const Keyword = createToken({ name: "Keyword", pattern: Lexer.NA })
const All = createToken({ name: "All", pattern: /all/i, categories: [Keyword] })
const Distinct = createToken({
  name: "Distinct",
  pattern: /distinct/i,
  categories: [Keyword]
})
const OrderBy = createToken({
  name: "OrderBy",
  pattern: /order by/i,
  categories: [Keyword]
})
const Asc = createToken({
  name: "Ascending",
  pattern: /asc/i,
  categories: [Keyword]
})
const Desc = createToken({
  name: "Descending",
  pattern: /desc/i,
  categories: [Keyword]
})
const Cast = createToken({
  name: "Cast",
  pattern: /cast/i,
  categories: [Keyword]
})
const As = createToken({
  name: "As",
  pattern: /as/i,
  categories: [Keyword]
})

// XXX:
// support for non-latin characters?
// U&"..." identifiers?
// U&"..." UESCAPE '?' identifiers?
const Identifier = createToken({ name: "Identifier", pattern: Lexer.NA })
const UnquotedIdentifier = createToken({
  name: "UnquotedIdentifier",
  pattern: /[a-zA-Z_]\w*/,
  categories: [Identifier]
})
const QuotedIdentifier = createToken({
  name: "QuotedIdentifier",
  pattern: /"(?:[^"]|"")+"/,
  categories: [Identifier]
})

// XXX:
// E'...' string constants?
// U&'...' string constants?
// U&'...' UESCAPE '?' string constants?
// $$...$$ string constants?
// bit constants?
const Constant = createToken({ name: "Constant", pattern: Lexer.NA })
const StringConstant = createToken({
  name: "StringConstant",
  pattern: /'(?:[^']|'')*'(?:\s*\n\s*'(?:[^']|'')*')*/,
  categories: [Constant],
  line_breaks: true
})
const NumericConstant = createToken({
  name: "NumericConstant",
  pattern: /(?:[1-9]\d*(?:\.\d)?|0?\.\d)\d*(?:[eE][+-]?\d+)?/,
  categories: [Constant]
})
const BooleanConstant = createToken({
  name: "BooleanConstant",
  pattern: /(?:true|false)/i,
  categories: [Constant]
})

// XXX:
// IS
// ISNULL
// NOTNULL
// IN
// BETWEEN
// OVERLAPS
// LIKE/ILIKE/SIMILAR
// < >
// =
// NOT
// AND
// OR
const Operator = createToken({ name: "Operator", pattern: Lexer.NA })

const AllColumns = createToken({ name: "AllColumns", pattern: Lexer.NA })
const PrefixOperator = createToken({
  name: "PrefixOperator",
  pattern: Lexer.NA,
  categories: [Operator]
})
const BinaryOperator = createToken({
  name: "BinaryOperator",
  pattern: Lexer.NA,
  categories: [Operator]
})

const ExponentiationOperator = createToken({
  name: "ExponentOperator",
  pattern: /\^/,
  categories: [BinaryOperator]
})

const MultiplicativeOperator = createToken({
  name: "MultiplicativeOperator",
  pattern: Lexer.NA,
  categories: [BinaryOperator]
})
const MultiplicationOperator = createToken({
  name: "MultiplicationOperator",
  pattern: /\*/,
  categories: [MultiplicativeOperator, AllColumns]
})
const DivisionOperator = createToken({
  name: "DivisionOperator",
  pattern: /\//,
  categories: [MultiplicativeOperator]
})
const ModuloOperator = createToken({
  name: "ModuloOperator",
  pattern: /%/,
  categories: [MultiplicativeOperator]
})

const AdditiveOperator = createToken({
  name: "AdditiveOperator",
  pattern: Lexer.NA,
  categories: [BinaryOperator, PrefixOperator]
})
const AdditionOperator = createToken({
  name: "AdditionOperator",
  pattern: /\+/,
  categories: [AdditiveOperator]
})
const SubtractionOperator = createToken({
  name: "SubtractionOperator",
  pattern: /-/,
  categories: [AdditiveOperator]
})

// XXX:
// Array elements with brackets ([])
// Array slices with :
// Type cast with ::
const Punctuation = createToken({ name: "Punctuation", pattern: Lexer.NA })
const OpenParen = createToken({
  name: "OpenParenthesis",
  pattern: /\(/,
  categories: [Punctuation]
})
const CloseParen = createToken({
  name: "CloseParenthesis",
  pattern: /\)/,
  categories: [Punctuation]
})
const Comma = createToken({
  name: "Comma",
  pattern: /,/,
  categories: [Punctuation]
})
const Dot = createToken({
  name: "Dot",
  pattern: /\./,
  categories: [Punctuation]
})

const allTokens = [
  Whitespace,

  // keywords must come before Identifiers
  All,
  Distinct,
  OrderBy,
  Asc,
  Desc,
  Cast,
  As,

  // Identifiers must come before anything else because a QuotedIdentifier can
  // technically contain anything
  Identifier,
  UnquotedIdentifier,
  QuotedIdentifier,

  Constant,
  StringConstant,
  NumericConstant,
  BooleanConstant,

  Operator,
  PrefixOperator,
  BinaryOperator,
  ExponentiationOperator,
  MultiplicativeOperator,
  MultiplicationOperator,
  DivisionOperator,
  ModuloOperator,
  AdditiveOperator,
  AdditionOperator,
  SubtractionOperator,

  OpenParen,
  CloseParen,
  Comma,
  Dot
]

const sqlLexer = new Lexer(allTokens)

class SQLParser extends CstParser {
  constructor() {
    super(allTokens)

    this.RULE("expression", () => {
      this.SUBRULE(this.additiveExpression)
    })

    this.RULE("additiveExpression", () => {
      this.SUBRULE(this.multiplicativeExpression, { LABEL: "lhs" })
      this.MANY(() => {
        this.CONSUME(AdditiveOperator, { LABEL: "operator" })
        this.SUBRULE2(this.multiplicativeExpression, { LABEL: "rhs" })
      })
    })

    this.RULE("multiplicativeExpression", () => {
      this.SUBRULE(this.exponentiationExpression, { LABEL: "lhs" })
      this.MANY(() => {
        this.CONSUME(MultiplicativeOperator, { LABEL: "operator" })
        this.SUBRULE2(this.exponentiationExpression, { LABEL: "rhs" })
      })
    })

    this.RULE("exponentiationExpression", () => {
      this.SUBRULE(this.atomicExpression, { LABEL: "lhs" })
      this.MANY(() => {
        this.CONSUME(ExponentiationOperator, { LABEL: "operator" })
        this.SUBRULE2(this.atomicExpression, { LABEL: "rhs" })
      })
    })

    this.RULE("atomicExpression", () => {
      this.OR([
        { ALT: () => this.SUBRULE(this.parenthesesExpression) },
        { ALT: () => this.SUBRULE(this.castExpression) },
        { ALT: () => this.SUBRULE(this.functionExpression) },
        { ALT: () => this.SUBRULE(this.prefixExpression) },
        { ALT: () => this.SUBRULE(this.columnExpression) },
        { ALT: () => this.CONSUME(Constant) }
      ])
    })

    this.RULE("parenthesesExpression", () => {
      this.CONSUME(OpenParen)
      this.SUBRULE(this.expression)
      this.CONSUME(CloseParen)
    })

    this.RULE("castExpression", () => {
      this.CONSUME(Cast)
      this.CONSUME(OpenParen)
      this.SUBRULE(this.expression)
      this.CONSUME(As)
      this.CONSUME(UnquotedIdentifier, { LABEL: "castTo" })
      this.CONSUME(CloseParen)
    })

    this.RULE("orderByExpression", () => {
      this.SUBRULE(this.expression)
      this.OPTION(() => {
        this.OR([
          { ALT: () => this.CONSUME(Asc, { LABEL: "asc" }) },
          { ALT: () => this.CONSUME(Desc, { LABEL: "desc" }) }
        ])
      })
    })

    this.RULE("orderBy", () => {
      this.CONSUME(OrderBy)
      this.AT_LEAST_ONE_SEP({
        SEP: Comma,
        DEF: () => {
          this.SUBRULE(this.orderByExpression)
        }
      })
    })

    this.RULE("functionExpression", () => {
      this.CONSUME(UnquotedIdentifier, { LABEL: "function" })
      this.CONSUME(OpenParen)
      this.OR1([
        { ALT: () => this.CONSUME(AllColumns) },
        {
          ALT: () => {
            this.OPTION1(() => {
              this.OR2([
                { ALT: () => this.CONSUME(All) },
                { ALT: () => this.CONSUME(Distinct) }
              ])
            })
            this.AT_LEAST_ONE_SEP({
              SEP: Comma,
              DEF: () => {
                this.SUBRULE(this.expression)
              }
            })
            this.OPTION2(() => {
              this.SUBRULE(this.orderBy)
            })
          }
        }
      ])
      this.CONSUME(CloseParen)
    })

    this.RULE("prefixExpression", () => {
      this.CONSUME(PrefixOperator, { LABEL: "operator" })
      this.SUBRULE(this.expression)
    })

    this.RULE("columnExpression", () => {
      this.OPTION(() => {
        this.CONSUME1(Identifier, { LABEL: "table" })
        this.CONSUME(Dot)
      })
      this.CONSUME2(Identifier, { LABEL: "column" })
    })

    this.performSelfAnalysis()
  }
}

const sqlParser = new SQLParser()

class SQLVisitor extends sqlParser.getBaseCstVisitorConstructor() {
  constructor() {
    super()
    this.validateVisitor()
  }

  expression(ctx) {
    return this.visit(ctx.additiveExpression)
  }

  additiveExpression(ctx) {
    let result = this.visit(ctx.lhs)
    if (ctx.rhs) {
      ctx.rhs.forEach((operand, idx) => {
        const rhs = this.visit(operand)
        result = {
          type: "BinaryExpression",
          operator: ctx.operator[idx].image,
          lhs: result,
          rhs,
          start: result.start,
          end: rhs.end
        }
      })
    }
    return result
  }

  multiplicativeExpression(ctx) {
    let result = this.visit(ctx.lhs)
    if (ctx.rhs) {
      ctx.rhs.forEach((operand, idx) => {
        const rhs = this.visit(operand)
        result = {
          type: "BinaryExpression",
          operator: ctx.operator[idx].image,
          lhs: result,
          rhs,
          start: result.start,
          end: rhs.end
        }
      })
    }
    return result
  }

  exponentiationExpression(ctx) {
    let result = this.visit(ctx.lhs)
    if (ctx.rhs) {
      ctx.rhs.forEach((operand, idx) => {
        const rhs = this.visit(operand)
        result = {
          type: "BinaryExpression",
          operator: ctx.operator[idx].image,
          lhs: result,
          rhs,
          start: result.start,
          end: rhs.end
        }
      })
    }
    return result
  }

  atomicExpression(ctx) {
    if (ctx.parenthesesExpression) {
      return this.visit(ctx.parenthesesExpression)
    } else if (ctx.castExpression) {
      return this.visit(ctx.castExpression)
    } else if (ctx.functionExpression) {
      return this.visit(ctx.functionExpression)
    } else if (ctx.prefixExpression) {
      return this.visit(ctx.prefixExpression)
    } else if (ctx.columnExpression) {
      return this.visit(ctx.columnExpression)
    }

    return {
      type: "ConstantExpression",
      value: ctx.Constant[0].image,
      start: ctx.Constant[0].startOffset,
      end: ctx.Constant[0].endOffset
    }
  }

  parenthesesExpression(ctx) {
    return {
      type: "ParenthesesExpression",
      expression: this.visit(ctx.expression),
      start: ctx.OpenParenthesis[0].startOffset,
      end: ctx.CloseParenthesis[0].endOffset
    }
  }

  castExpression(ctx) {
    return {
      type: "CastExpression",
      expression: this.visit(ctx.expression),
      castTo: ctx.castTo[0].image,
      start: ctx.Cast[0].startOffset,
      end: ctx.CloseParenthesis[0].endOffset
    }
  }

  orderByExpression(ctx) {
    const expression = this.visit(ctx.expression[0])
    const end = ctx.asc
      ? ctx.asc[0].endOffset
      : ctx.desc
      ? ctx.desc[0].endOffset
      : expression.end
    return {
      type: "OrderByExpression",
      expression,
      desc: Boolean(ctx.desc),
      start: expression.start,
      end
    }
  }

  orderBy(ctx) {
    const expressions = ctx.orderByExpression.map(e => this.visit(e))
    return {
      type: "OrderBy",
      expressions,
      start: ctx.OrderBy[0].startOffset,
      end: expressions[expressions.length - 1].end
    }
  }

  functionExpression(ctx) {
    const result = {
      type: "FunctionExpression",
      function: ctx.function[0].image,
      start: ctx.function[0].startOffset,
      end: ctx.CloseParenthesis[0].endOffset
    }

    if (ctx.AllColumns) {
      result.star = true
    } else {
      if (ctx.All) {
        result.all = true
      } else if (ctx.Distinct) {
        result.distinct = true
      }
      result.params = ctx.expression.map(e => this.visit(e))
      if (ctx.orderBy) {
        result.orderBy = this.visit(ctx.orderBy)
      }
    }

    return result
  }

  prefixExpression(ctx) {
    const expression = this.visit(ctx.expression)
    return {
      type: "PrefixExpression",
      operator: ctx.operator[0].image,
      expression,
      start: ctx.operator[0].startOffset,
      end: expression.end
    }
  }

  columnExpression(ctx) {
    return {
      type: "ColumnExpression",
      table: (ctx.table && ctx.table[0].image) || null,
      column: ctx.column[0].image,
      start: ctx.table ? ctx.table[0].startOffset : ctx.column[0].startOffset,
      end: ctx.column[0].endOffset
    }
  }
}

const sqlVisitor = new SQLVisitor()

// Run the parser to build an AST
function buildAst(sql) {
  const lexResult = sqlLexer.tokenize(sql)
  sqlParser.input = lexResult.tokens

  const cst = sqlParser.expression()
  if (sqlParser.errors.length === 0) {
    return sqlVisitor.visit(cst)
  }
  return null
}

const SAFE = "safe"
const UNSAFE = "unsafe"
const NEUTRAL = "neutral"

// "Paint" nodes of the AST as being safe to move into the fact query, or
// unsafe. To be safe, the node and all children must be safe (ie, have no
// references to other tables).
function paintAst(factTable, node) {
  let paint = NEUTRAL
  switch (node.type) {
    case "BinaryExpression":
      const lhsPaint = paintAst(factTable, node.lhs)
      const rhsPaint = paintAst(factTable, node.rhs)
      if (lhsPaint === UNSAFE || rhsPaint === UNSAFE) {
        paint = UNSAFE
      } else if (lhsPaint === SAFE || rhsPaint === SAFE) {
        paint = SAFE
      }
      break

    case "ColumnExpression":
      paint =
        node.table === null ||
        node.table.toLowerCase() === factTable.toLowerCase() ||
        node.table.toLowerCase() === `"${factTable.toLowerCase()}"`
          ? SAFE
          : UNSAFE
      break

    case "OrderBy":
      paint = node.expressions.reduce((acc, expression) => {
        const childPaint = paintAst(factTable, expression)
        if (childPaint === UNSAFE) {
          return UNSAFE
        } else if (childPaint === SAFE && acc === NEUTRAL) {
          return SAFE
        }
        return acc
      }, NEUTRAL)
      break

    case "FunctionExpression":
      paint = node.params.reduce((acc, expression) => {
        const childPaint = paintAst(factTable, expression)
        if (childPaint === UNSAFE) {
          return UNSAFE
        } else if (childPaint === SAFE && acc === NEUTRAL) {
          return SAFE
        }
        return acc
      }, NEUTRAL)
      break

    case "CastExpression":
    case "OrderByExpression":
    case "PrefixExpression":
    case "ParenthesesExpression":
      // these nodes have an "expression" child
      paint = paintAst(factTable, node.expression)
      break

    default:
  }

  node.paint = paint
  return paint
}

// Any nodes painted "SAFE" are extracted from the original SQL to be used in
// the fact query. The "extraction" works by copying the substring from the
// original SQL into a projection and giving it an alias. This function also
// adds details about the replacement in the "replacements" variable which can
// be used to strip it out of the originl sql and replace it with a reference
// to the fact table projection.
function extractFacts(node, projections, aliases, replacements, sql) {
  if (node.paint === SAFE) {
    // end + 1 because "end" is an inclusive offset,
    // but substring excludes the end index
    const alias = `color${projections.length}`
    const start = node.start
    const end = node.end + 1
    projections.push(sql.substring(start, end))
    aliases.push(alias)
    replacements.push({
      alias,
      start,
      end
    })
    return
  }

  switch (node.type) {
    case "BinaryExpression":
      extractFacts(node.lhs, projections, aliases, replacements, sql)
      extractFacts(node.rhs, projections, aliases, replacements, sql)
      break

    case "OrderBy":
      node.expressions.forEach(expression =>
        extractFacts(expression, projections, aliases, replacements, sql)
      )
      break

    case "FunctionExpression":
      node.params.forEach(expression =>
        extractFacts(expression, projections, aliases, replacements, sql)
      )
      break

    case "CastExpression":
    case "OrderByExpression":
    case "PrefixExpression":
    case "ParenthesesExpression":
      extractFacts(node.expression, projections, aliases, replacements, sql)
      break

    default:
  }
}

// Applies the replacements from extractFacts to the original SQL
function applyReplacements(sql, withAlias, replacements) {
  // apply replacements starting at the end of the string so the indexes will
  // line up correctly.
  replacements
    .sort((a, b) => b.start - a.start)
    .forEach(replacement => {
      sql = `${sql.substring(0, replacement.start)}${withAlias}.${
        replacement.alias
      }${sql.substring(replacement.end)}`
    })
  return sql
}

export default function parseFactsFromCustomSQL(factTable, withAlias, sql) {
  const factProjections = []
  const factAliases = []
  let expression = sql

  const ast = buildAst(sql)
  if (ast) {
    paintAst(factTable, ast)

    const replacements = []
    extractFacts(ast, factProjections, factAliases, replacements, sql)
    expression = applyReplacements(sql, withAlias, replacements)
  }

  return {
    factProjections,
    factAliases,
    expression
  }
}
