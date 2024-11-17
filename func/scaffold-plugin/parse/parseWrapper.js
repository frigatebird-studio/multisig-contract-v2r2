"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWrapper = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const babelParser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const generator_1 = __importDefault(require("@babel/generator"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils");
async function parseWrapper(filePath, className) {
    const content = await promises_1.default.readFile(filePath, "utf-8");
    const ast = babelParser.parse(content, {
        sourceType: "module",
        plugins: ["typescript"],
        attachComment: false,
        ranges: false,
        createParenthesizedExpressions: true,
    });
    if (ast.errors.length > 0)
        throw ast.errors;
    let sendFunctions = {};
    let getFunctions = {};
    let canBeCreatedFromConfig = false;
    let canBeCreatedFromAddress = false;
    let configType = undefined;
    let definedTypes = {};
    function isTypeDefinedInFile(typeName, ast) {
        let isDefined = false;
        (0, traverse_1.default)(ast, {
            TSTypeAliasDeclaration(path) {
                if (path.node.id.name === typeName) {
                    isDefined = true;
                }
            },
            TSInterfaceDeclaration(path) {
                if (path.node.id.name === typeName) {
                    isDefined = true;
                }
            },
        });
        return isDefined;
    }
    function handleTypeObject(typeName, ast) {
        // parse interface/type alias by its name.
        // sets a string if type is just an alias to some other type.
        // and sets the fields (properties) to create a type if it's an object.
        let _parsedTypeStr = "";
        let _properties = {};
        // internal function for 2 tree brances - alias and interface types
        // (see the main `traverse` below it)
        function _handleObjectType(path) {
            // same name
            if (path.node.id.name === typeName) {
                path.traverse({
                    // for each property
                    TSPropertySignature(propertyPath) {
                        const ta = propertyPath.node.typeAnnotation;
                        if (propertyPath.node.key.type == "Identifier" && ta?.type == "TSTypeAnnotation") {
                            const optional = !!propertyPath.node.optional;
                            // no default value in interfaces and aliases
                            const field = propertyPath.node.key.name;
                            _properties[field] = {
                                type: (0, generator_1.default)(ta).code.slice(2),
                                optional,
                            };
                        }
                    },
                });
                // if not found any properties
                // leave the type as is (and if type exists)
                if (Object.keys(_properties).length == 0 && "typeAnnotation" in path.node)
                    _parsedTypeStr = (0, generator_1.default)(path.node.typeAnnotation).code;
            }
        }
        (0, traverse_1.default)(ast, {
            TSTypeAliasDeclaration(path) {
                _handleObjectType(path);
            },
            TSInterfaceDeclaration(path) {
                _handleObjectType(path);
            },
        });
        definedTypes[typeName] = _parsedTypeStr || _properties;
    }
    (0, traverse_1.default)(ast, {
        Class(path) {
            // parsing main wrapper class.
            // taking send and get functions +
            // createFromConfig, createFromAddress existences
            const { node } = path;
            if (node.type == "ClassDeclaration" &&
                node.id?.name == className &&
                node.implements &&
                node.implements.length === 1 &&
                node.implements.findIndex((i) => i.type == "TSExpressionWithTypeArguments" &&
                    i.expression.type == "Identifier" &&
                    i.expression.name == "Contract") !== -1) {
                path.traverse({
                    ClassMethod(path) {
                        const { node } = path;
                        if (node.kind === "method" &&
                            node.key.type === "Identifier" &&
                            node.async === true &&
                            (node.key.name.startsWith("send") || node.key.name.startsWith("get"))) {
                            const isGet = node.key.name.startsWith("get");
                            let methodParams = {};
                            path.node.params.forEach((param) => {
                                let defaultValue;
                                // check for defaulValue
                                if (param.type === "AssignmentPattern" && param.left.type === "Identifier") {
                                    defaultValue = (0, generator_1.default)(param.right).code;
                                    param = param.left;
                                }
                                if (param.type !== "Identifier" || param.typeAnnotation?.type !== "TSTypeAnnotation")
                                    throw new Error("Unexpected param type");
                                const name = param.name;
                                // remove provider param in all methods, and via in send methods
                                if (name === "provider" || (!isGet && name === "via"))
                                    return;
                                methodParams[name] = {
                                    type: (0, generator_1.default)(param.typeAnnotation).code.slice(2),
                                    optional: !!param.optional,
                                    defaultValue,
                                };
                            });
                            if (isGet)
                                getFunctions[node.key.name] = methodParams;
                            else
                                sendFunctions[node.key.name] = methodParams;
                        }
                        // checking createFromConfig, createFromAddress existence
                        else if (node.kind === "method" && node.key.type === "Identifier" && node.static === true) {
                            if (node.key.name === "createFromConfig") {
                                canBeCreatedFromConfig = true;
                            }
                            if (node.key.name === "createFromAddress") {
                                canBeCreatedFromAddress = true;
                            }
                        }
                    },
                });
            }
        },
        // searching for every used type reference in the code.
        // if this type was defined in the file - put it into `definedTypes`
        TSTypeReference(path) {
            if (path.node.type == "TSTypeReference" &&
                path.node.typeName.type == "Identifier" &&
                isTypeDefinedInFile(path.node.typeName.name, ast) &&
                !definedTypes[path.node.typeName.name])
                // this will process and assign the type
                handleTypeObject(path.node.typeName.name, ast);
        },
    });
    const parseConfigResult = definedTypes[className + "Config"];
    // correct config is not an object. if has no config - will be undefined
    if (typeof parseConfigResult !== "string") {
        configType = parseConfigResult;
    }
    if (!canBeCreatedFromAddress) {
        throw new Error(`Cannot be created from address (need to create contract instance when sending)`);
    }
    let codeHex = undefined;
    if (canBeCreatedFromConfig) {
        try {
            codeHex = await (0, utils_1.readCompiled)(className);
        }
        catch (e) {
            canBeCreatedFromConfig = false;
            if ("sendDeploy" in sendFunctions)
                delete sendFunctions["sendDeploy"];
        }
    }
    const relativePath = `./${path_1.default.relative(process.cwd(), filePath).replace(/\\/g, "/")}`;
    return {
        sendFunctions,
        getFunctions,
        path: relativePath,
        deploy: {
            canBeCreatedFromConfig,
            configType,
            codeHex,
        },
        definedTypes,
    };
}
exports.parseWrapper = parseWrapper;
