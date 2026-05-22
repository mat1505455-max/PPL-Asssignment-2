import { ClassExp, ProcExp, Exp, Program, CExp, Binding,
         makeProgram, makeDefineExp, makeIfExp, makeProcExp, makeAppExp, makeLetExp,
         makePrimOp, makeVarRef, makeVarDecl, makeBinding, makeLitExp,
         isProgram, isDefineExp, isClassExp, isProcExp, isIfExp, isAppExp, isLetExp } from "./L3-ast";
import { Result, makeOk, mapv, mapResult, bind } from "../shared/result";
import { makeSymbolSExp } from "./L3-value";

/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
*/
export const class2proc = (exp: ClassExp): ProcExp => {
    const errorLit = makeLitExp(makeSymbolSExp("error"));

    // Build nested if chain from last method backwards
    const dispatchBody = exp.methods.reduceRight(
        (acc: CExp, binding: Binding): CExp =>
            makeIfExp(
                makeAppExp(makePrimOp("eq?"), [makeVarRef("msg"), makeLitExp(makeSymbolSExp(binding.var.var))]),
                isProcExp(binding.val) ? binding.val.body[0] : binding.val,
                acc
            ),
        errorLit as CExp
    );

    return makeProcExp(exp.fields, [makeProcExp([makeVarDecl("msg")], [dispatchBody])]);
};


/*
Purpose: Transform all class forms in the given AST to procs
Signature: transform(AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

const transformCExp = (exp: CExp): Result<CExp> => {
    if (isClassExp(exp))
        return transformCExp(class2proc(exp));
    if (isProcExp(exp))
        return mapv(mapResult(transformCExp, exp.body), (body: CExp[]) => makeProcExp(exp.args, body));
    if (isIfExp(exp))
        return bind(transformCExp(exp.test), (test: CExp) =>
               bind(transformCExp(exp.then), (then: CExp) =>
               mapv(transformCExp(exp.alt), (alt: CExp) => makeIfExp(test, then, alt))));
    if (isAppExp(exp))
        return bind(transformCExp(exp.rator), (rator: CExp) =>
               mapv(mapResult(transformCExp, exp.rands), (rands: CExp[]) => makeAppExp(rator, rands)));
    if (isLetExp(exp)) {
        const transformBinding = (b: Binding): Result<Binding> =>
            mapv(transformCExp(b.val), (val: CExp) => makeBinding(b.var.var, val));
        return bind(mapResult(transformBinding, exp.bindings), (bindings: Binding[]) =>
               mapv(mapResult(transformCExp, exp.body), (body: CExp[]) => makeLetExp(bindings, body)));
    }
    return makeOk(exp);
};

const transformExp = (exp: Exp): Result<Exp> =>
    isDefineExp(exp) ? mapv(transformCExp(exp.val), (val: CExp) => makeDefineExp(exp.var, val)) :
    transformCExp(exp as CExp);

export const transform = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? mapv(mapResult(transformExp, exp.exps), (exps: Exp[]) => makeProgram(exps)) :
    transformExp(exp as Exp);
