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
const Case = createToken({
  name: "Case",
  pattern: /case/i,
  categories: [Keyword]
})
const When = createToken({
  name: "When",
  pattern: /when/i,
  categories: [Keyword]
})
const Then = createToken({
  name: "Then",
  pattern: /then/i,
  categories: [Keyword]
})
const Else = createToken({
  name: "Else",
  pattern: /else/i,
  categories: [Keyword]
})
const End = createToken({
  name: "End",
  pattern: /end/i,
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
  pattern: /(?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?/,
  categories: [Constant]
})
const BooleanConstant = createToken({
  name: "BooleanConstant",
  pattern: /(?:true|false)/i,
  categories: [Constant]
})

// XXX:
// OVERLAPS
// SIMILAR
// BETWEEN SYMMETRIC
// DISTINCT FROM
// ISNULL
// NOTNULL
// IS UNKNOWN
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

const MembershipOperator = createToken({
  name: "MembershipOperator",
  pattern: Lexer.NA,
  categories: [BinaryOperator]
})
const BetweenOperator = createToken({
  name: "BetweenOperator",
  pattern: /between/i,
  categories: [MembershipOperator]
})
const InOperator = createToken({
  name: "InOperator",
  pattern: /in/i,
  categories: [MembershipOperator]
})
const LikeOperator = createToken({
  name: "LikeOperator",
  pattern: /i?like/i,
  categories: [MembershipOperator]
})

const ComparisonOperator = createToken({
  name: "ComparisonOperator",
  pattern: Lexer.NA,
  categories: [BinaryOperator]
})
const EqualityOperator = createToken({
  name: "EqualityOperator",
  pattern: "=",
  categories: [ComparisonOperator]
})
const InequalityOperator = createToken({
  name: "InequalityOperator",
  pattern: /(?:<>|!=)/,
  categories: [ComparisonOperator]
})
const LessThanOperator = createToken({
  name: "LessThanOperator",
  pattern: "<",
  categories: [ComparisonOperator]
})
const LessThanEqualOperator = createToken({
  name: "LessThanEqualOperator",
  pattern: "<=",
  categories: [ComparisonOperator]
})
const GreaterThanOperator = createToken({
  name: "GreaterThanOperator",
  pattern: ">",
  categories: [ComparisonOperator]
})
const GreaterThanEqualOperator = createToken({
  name: "GreaterThanEqualOperator",
  pattern: ">=",
  categories: [ComparisonOperator]
})

const IsOperator = createToken({
  name: "IsOperator",
  pattern: /is/i,
  categories: [BinaryOperator]
})
const IsPredicate = createToken({
  name: "IsPredicate",
  pattern: Lexer.NA
})

const Not = createToken({
  name: "Not",
  pattern: /not/i,
  categories: [PrefixOperator, Keyword]
})
const Null = createToken({
  name: "Null",
  pattern: /null/i,
  categories: [IsPredicate, Keyword]
})
const True = createToken({
  name: "True",
  pattern: /true/i,
  categories: [IsPredicate, Keyword]
})
const False = createToken({
  name: "False",
  pattern: /false/i,
  categories: [IsPredicate, Keyword]
})
const And = createToken({
  name: "And",
  pattern: /and/i,
  categories: [BinaryOperator, Keyword]
})
const Or = createToken({
  name: "Or",
  pattern: /or/i,
  categories: [BinaryOperator, Keyword]
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
  Case,
  When,
  Then,
  Else,
  End,

  MembershipOperator,
  BetweenOperator,
  InOperator,
  LikeOperator,

  IsOperator,
  IsPredicate,

  Not,
  Null,
  True,
  False,
  And,
  Or,

  // Identifiers must come after any keywords because UnquotedIdentifier would
  // match them, but before any symbols because a QuotedIdentifier can
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
  ComparisonOperator,
  EqualityOperator,
  InequalityOperator,
  LessThanOperator,
  LessThanEqualOperator,
  GreaterThanOperator,
  GreaterThanEqualOperator,

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
      this.SUBRULE(this.disjunctiveExpression)
    })

    this.RULE("disjunctiveExpression", () => {
      this.SUBRULE(this.conjunctiveExpression, { LABEL: "lhs" })
      this.MANY(() => {
        this.CONSUME(Or, { LABEL: "operator" })
        this.SUBRULE2(this.conjunctiveExpression, { LABEL: "rhs" })
      })
    })

    this.RULE("conjunctiveExpression", () => {
      this.SUBRULE(this.negationExpression, { LABEL: "lhs" })
      this.MANY(() => {
        this.CONSUME(And, { LABEL: "operator" })
        this.SUBRULE2(this.negationExpression, { LABEL: "rhs" })
      })
    })

    this.RULE("negationExpression", () => {
      this.OPTION(() => this.CONSUME(Not))
      this.SUBRULE(this.isExpression)
    })

    this.RULE("isExpression", () => {
      this.SUBRULE(this.comparisonExpression, { LABEL: "expression" })
      this.OPTION(() => {
        this.CONSUME(IsOperator)
        this.OPTION2(() => this.CONSUME(Not))
        this.CONSUME(IsPredicate)
      })
    })

    this.RULE("comparisonExpression", () => {
      this.SUBRULE(this.membershipExpression, { LABEL: "lhs" })
      this.OPTION(() => {
        this.CONSUME(ComparisonOperator, { LABEL: "operator" })
        this.SUBRULE2(this.membershipExpression, { LABEL: "rhs" })
      })
    })

    this.RULE("membershipExpression", () => {
      this.SUBRULE(this.additiveExpression, { LABEL: "lhs" })
      this.OPTION(() => {
        this.OPTION2(() => this.CONSUME(Not))
        this.OR([
          {
            ALT: () => {
              this.CONSUME(BetweenOperator, { LABEL: "betweenOperator" })
              this.SUBRULE2(this.additiveExpression, { LABEL: "lowerBound" })
              this.CONSUME(And)
              this.SUBRULE3(this.additiveExpression, { LABEL: "upperBound" })
            }
          },
          {
            ALT: () => {
              this.CONSUME(InOperator, { LABEL: "inOperator" })
              this.CONSUME(OpenParen)
              this.AT_LEAST_ONE_SEP({
                SEP: Comma,
                DEF: () => this.SUBRULE(this.expression, { LABEL: "set" })
              })
              this.CONSUME(CloseParen)
            }
          },
          {
            ALT: () => {
              this.CONSUME(LikeOperator, { LABEL: "likeOperator" })
              this.SUBRULE4(this.additiveExpression, { LABEL: "rhs" })
            }
          }
        ])
      })
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
        { ALT: () => this.SUBRULE(this.caseExpression) },
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

    this.RULE("caseExpression", () => {
      this.CONSUME(Case)
      this.OPTION(() => this.SUBRULE(this.expression))
      this.AT_LEAST_ONE(() => {
        this.CONSUME(When)
        this.SUBRULE2(this.expression, { LABEL: "condition" })
        this.CONSUME(Then)
        this.SUBRULE3(this.expression, { LABEL: "result" })
      })
      this.OPTION2(() => {
        this.CONSUME(Else)
        this.SUBRULE4(this.expression, { LABEL: "else" })
      })
      this.CONSUME(End)
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
    return this.visit(ctx.disjunctiveExpression)
  }

  disjunctiveExpression(ctx) {
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

  conjunctiveExpression(ctx) {
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

  negationExpression(ctx) {
    let result = this.visit(ctx.isExpression)
    if (ctx.Not) {
      result = {
        ...result,
        negated: !result.negated,
        start: ctx.Not[0].startOffset
      }
    }
    return result
  }

  isExpression(ctx) {
    let result = this.visit(ctx.expression)
    if (ctx.IsOperator) {
      result = {
        type: "IsExpression",
        expression: result,
        negated: Boolean(ctx.Not),
        is: ctx.IsPredicate[0].image,
        start: result.start,
        end: ctx.IsPredicate[0].endOffset
      }
    }
    return result
  }

  comparisonExpression(ctx) {
    let result = this.visit(ctx.lhs)
    if (ctx.rhs) {
      const rhs = this.visit(ctx.rhs)
      result = {
        type: "BinaryExpression",
        operator: ctx.operator[0].image,
        lhs: result,
        rhs,
        start: result.start,
        end: rhs.end
      }
    }
    return result
  }

  membershipExpression(ctx) {
    let result = this.visit(ctx.lhs)
    const negated = Boolean(ctx.Not)
    if (ctx.betweenOperator) {
      const lowerBound = this.visit(ctx.lowerBound)
      const upperBound = this.visit(ctx.upperBound)
      result = {
        type: "BetweenExpression",
        lhs: result,
        lowerBound,
        upperBound,
        negated,
        start: result.start,
        end: upperBound.end
      }
    } else if (ctx.inOperator) {
      result = {
        type: "InExpression",
        lhs: result,
        in: ctx.set.map(expression => this.visit(expression)),
        negated,
        start: result.start,
        end: ctx.CloseParen[0].endOffset
      }
    } else if (ctx.likeOperator) {
      const rhs = this.visit(ctx.rhs)
      result = {
        type: "BinaryExpression",
        lhs: result,
        rhs,
        negated,
        start: result.start,
        end: rhs.end
      }
    }
    return result
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
    } else if (ctx.caseExpression) {
      return this.visit(ctx.caseExpression)
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

  caseExpression(ctx) {
    return {
      type: "CaseExpression",
      expression: (ctx.expression && this.visit(ctx.expression)) || null,
      branches: ctx.condition.map((condition, idx) => ({
        condition: this.visit(condition),
        result: this.visit(ctx.result[idx])
      })),
      else: (ctx.else && this.visit(ctx.else)) || null,
      start: ctx.Case[0].startOffset,
      end: ctx.End[0].endOffset
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

    // eslint-disable-next-line no-nested-ternary
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
// eslint-disable-next-line complexity
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

    case "CaseExpression":
      const expressionPaint = node.expression
        ? paintAst(factTable, node.expression)
        : NEUTRAL
      const branchesPaint = node.branches.reduce(
        (acc, { condition, result }) => {
          const conditionPaint = paintAst(factTable, condition)
          const resultPaint = paintAst(factTable, result)
          if (conditionPaint === UNSAFE || resultPaint === UNSAFE) {
            return UNSAFE
          } else if (
            acc === NEUTRAL &&
            (conditionPaint === SAFE || resultPaint === SAFE)
          ) {
            return SAFE
          }
          return acc
        },
        NEUTRAL
      )
      const elsePaint = node.else ? paintAst(factTable, node.else) : NEUTRAL
      if (
        expressionPaint === UNSAFE ||
        branchesPaint === UNSAFE ||
        elsePaint === UNSAFE
      ) {
        paint = UNSAFE
      } else if (
        expressionPaint === SAFE ||
        branchesPaint === SAFE ||
        elsePaint === SAFE
      ) {
        paint = SAFE
      }
      break

    case "BetweenExpression":
      const lhs = paintAst(factTable, node.lhs)
      const lowerBound = paintAst(factTable, node.lowerBound)
      const upperBound = paintAst(factTable, node.upperBound)
      if (lhs === UNSAFE || lowerBound === UNSAFE || upperBound === UNSAFE) {
        paint = UNSAFE
      } else if (lhs === SAFE || lowerBound === SAFE || upperBound === SAFE) {
        paint = SAFE
      }
      break

    case "InExpression":
      paint = node.in.reduce((acc, expression) => {
        const childPaint = paintAst(factTable, expression)
        if (childPaint === UNSAFE) {
          return UNSAFE
        } else if (childPaint === SAFE && acc === NEUTRAL) {
          return SAFE
        }
        return acc
      }, paintAst(factTable, node.expression))
      break

    case "IsExpression":
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

    case "CaseExpression":
      if (node.expression) {
        extractFacts(node.expression, projections, aliases, replacements, sql)
      }
      node.branches.forEach(({ condition, result }) => {
        extractFacts(condition, projections, aliases, replacements, sql)
        extractFacts(result, projections, aliases, replacements, sql)
      })
      if (node.else) {
        extractFacts(node.else, projections, aliases, replacements, sql)
      }
      break

    case "BetweenExpression":
      extractFacts(node.lhs, projections, aliases, replacements, sql)
      extractFacts(node.lowerBound, projections, aliases, replacements, sql)
      extractFacts(node.upperBound, projections, aliases, replacements, sql)
      break

    case "InExpression":
      extractFacts(node.expression, projections, aliases, replacements, sql)
      node.in.forEach(expression =>
        extractFacts(expression, projections, aliases, replacements, sql)
      )
      break

    case "IsExpression":
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
