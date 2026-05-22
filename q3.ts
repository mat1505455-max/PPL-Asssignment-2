import { Exp, isBoolExp, isNumExp, isPrimOp, isStrExp, PrimOp, isVarRef, isDefineExp, isIfExp, isProcExp,isAppExp, isProgram, Program } from './L3/L3-ast';
import { Result, bind, mapResult,  makeFailure, makeOk} from './shared/result';


const opMap: Record<string, string> = {
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "<": "<",
    ">": ">",
    "=": "==",
    "eq?": "==",
    "and": "and",
    "or": "or",
    "not": "not",
    "boolean?": "(lambda x : (type(x) == bool))",
    "number?": "(lambda x : (type(x) == int or type(x) == float))"
};

/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Parsed | Error] => Result<string>
*/
export const l2ToPython = (exp: Exp | Program): Result<string> => 
    isProgram(exp) ? bind(mapResult(l2ToPython, exp.exps), (exps: string[]) => makeOk(exps.join("\n"))) :
    
    isNumExp(exp) ? makeOk(exp.val.toString()) :
    isBoolExp(exp) ? makeOk(exp.val ? "True" : "False") :
    isStrExp(exp) ? makeOk(`"${exp.val}"`) : 
    isVarRef(exp) ? makeOk(exp.var) :
    isPrimOp(exp) ? makeOk(opMap[exp.op] || exp.op) :
    
    isDefineExp(exp) ? bind(l2ToPython(exp.val), (val: string) => 
        makeOk(`${exp.var.var} = ${val}`)
    ) :
    
    isIfExp(exp) ? bind(l2ToPython(exp.test), (test: string) =>
        bind(l2ToPython(exp.then), (then: string) =>
            bind(l2ToPython(exp.alt), (alt: string) =>
                makeOk(`(${then} if ${test} else ${alt})`)
            )
        )
    ) :
    
    isProcExp(exp) ? bind(l2ToPython(exp.body[0]), (body: string) =>
        makeOk(`(lambda ${exp.args.map(a => a.var).join(",")} : ${body})`)
    ) :

    isAppExp(exp) ? bind(l2ToPython(exp.rator), (rator: string) =>
        bind(mapResult(l2ToPython, exp.rands), (rands: string[]) => 
            isPrimOp(exp.rator) && exp.rator.op === "not" ? 
                makeOk(`(not ${rands[0]})`) :
            isPrimOp(exp.rator) && ["+", "-", "*", "/", "<", ">", "=", "eq?", "and", "or"].indexOf(exp.rator.op) !== -1 ? makeOk(`(${rands[0]} ${opMap[exp.rator.op]} ${rands[1]})`) :
            makeOk(`${rator}(${rands.join(", ")})`)
        )
    ) :
    makeFailure("Unknown expression type");