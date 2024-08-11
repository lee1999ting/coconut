/**
 * Three primary stages:
 * 1. Parsing 解析
 *    - take raw code and turning it into a more abstract representation of the code.
 *    - 把原始的代码变成更抽象的表示
 * 2. Transformation 转换
 *    - take this abstract representation and manipulates to do whatever the compilers wants it to
 * 3. Code Generation 代码生成
 *    - take the transformed representation of the code and turns it into new code.
 */

/**
 * Parsing
 * 1. 词法分析 Lexical Analysis
 * 2. 句法分析 Syntactic Analysis
 *    - Abstract Syntax Tree
 */
'use strict';
// THE TOKENIZER
function tokenizer(input){
    let current  = 0;
    let tokens = [];
    while(current < input.length){
        let char = input[current];
        //括号
        if(char === '('){
            tokens.push({
                type:'paren',
                value:'(',
            });
            current++;
            continue;//跳出本次循环
        }
        if(char === ')'){
            tokens.push({
                type:'paren',
                value:')',
            });
            current++;
            continue;
        }

        //空格,throw out whitespace
        let WHITESPACE = /\s/;
        if(WHITESPACE.test(char)){
            current++;
            continue;
        }

        //数字
        let NUMBERS = /[0-9]/;
        if(NUMBERS.test(char)){
            let value = '';
            while(NUMBERS.test(char)){
                value += char;
                char = input[++current];
            }
            tokens.push({
                type:'number',
                value,
            });
            continue;
        }

        // "xxx" 被双引号包围的字符串
        if(char === '"'){
            let value = '';
            char = input[++current];
            while(char !== '"'){
                value += char;
                char = input[++current];
            }
            char = input[++current];
            tokens.push({
                type:'string',
                value
            });
            continue;
        }

        //name
        let LETTERS = /[a-z]/i;
        if(LETTERS.test(char)){
            let value = '';
            while(LETTERS.test(char)){
                value += char;
                char = input[++current];
            }
            tokens.push({
                type:'name',
                value
            });
            continue;
        }

        //not match
        throw new TypeError('I don\'t know what this character is' + char);
    }
    // console.log(tokens);
    return tokens;
}
/**
 * tokens数组转化为AST,abstract syntax tree
 * [{ type: 'paren', value: '(' }, ...] => { type: 'Program', body: [...] }
 */
// THE PARSER
function parser(tokens){
    let current = 0;
    function walk(){
        let token = tokens[current];
        if(token.type === 'number'){
            current++;
            return {
                type: 'NumberLiteral',
                value: token.value,
            };
        }
        if(token.type === 'string'){
            current++;
            return {
                type: 'StringLiteral',
                value: token.value,
            };
        }
        if(token.type === 'paren' && token.value === '('){
            token = tokens[++current];
            let node = {
                type: 'CallExpression',
                name: token.value,
                params: [],
            };
            token = tokens[++current];
            while(
                (token.type !== 'paren') ||
                (token.type === 'paren' && token.value !== ')')
            ){
                node.params.push(walk());
                token = tokens[current];
            }
            current++;
            return node;
        }
        throw new TypeError(token.type);
    }
    let ast = {
        type: 'Program',
        body: [],
    };
    while(current < tokens.length){
        ast.body.push(walk());
    }
    return ast;
}
//THE TRAVERSER 遍历函数
function traverser(ast, visitor){
    function traverserArray(array, parent){
        array.forEach(child => {
            traverserNode(child, parent);
        });
    }
    function traverserNode(node, parent){
        let methods = visitor[node.type];
        if(methods && methods.enter){
            methods.enter(node, parent);
        }
        switch(node.type){
            case 'Program':
                traverserArray(node.body, node);
                break;
            case 'CallExpression':
                traverserArray(node.params, node);
                break;
            case 'NumberLiteral':
            case 'StringLiteral':
                break;
            default:
                throw new TypeError(node.type);
        }
        if(methods && methods.exit){
            methods.exit(node, parent);
        }
    }
    // 启动遍历，因为ast顶层没有父节点
    traverserNode(ast, null);
}
// THE TRANSFORMER 
function transformer(ast) {
    let newAst = {
        type: 'Program',
        body: [],
    };
    // 给要push的父节点添加一个context属性
    ast._context = newAst.body;
    traverser(ast, {
        NumberLiteral: {
            enter(node, parent){
                parent._context.push({
                    type: 'NumberLiteral',
                    value: node.value,
                });
            },
        },

        StringLiteral: {
            enter(node, parent){
                parent._context.push({
                    type: 'StringLiteral',
                    value: node.value,
                });
            },
        },

        CallExpression: {
            enter(node, parent){
                let expression = {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: node.name,
                    },
                    arguments: [],
                };
                node._context = expression.arguments;
                if(parent.type !== 'CallExpression'){
                    expression = {
                        type: 'ExpressionStatement',
                        expression: expression,
                    };
                }
                parent._context.push(expression);
            },
        }
    });
    return newAst;
}

//THE CODE GENERATOR
function codeGenerator(node){
    switch (node.type) {
        case 'Program':
            return node.body.map(codeGenerator).join('\n');
        case 'ExpressionStatement':
            return codeGenerator(node.expression) + ';';
        case 'CallExpression':
            return codeGenerator(node.callee) + `(${node.arguments.map(codeGenerator).join(',')})`
        case 'Identifier':
            return node.name;
        case 'NumberLiteral':
            return node.value;
        case 'StringLiteral':
            return `"${node.value}"`;
        default:
            throw new TypeError(node.type);
    }
}
/**
 * 1. input  => tokenizer   => tokens
 * 2. tokens => parser      => ast
 * 3. ast    => transformer => newAst
 * 4. newAst => generator   => output
 */
function compiler(input){
    let tokens = tokenizer(input);
    let ast = parser(tokens);
    let newAst = transformer(ast);
    let output = codeGenerator(newAst);
    return output;
}
console.log(compiler('(add 2 (subtract 3 7))'));
console.log(compiler('(count 9 (add 2 6))'));
console.log(compiler('(sub 3 (mul 8 1))'));

