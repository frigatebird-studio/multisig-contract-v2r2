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
exports.findImportsOfList = exports.findImports = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const parser_1 = require("@babel/parser");
const traverse_1 = __importDefault(require("@babel/traverse"));
// can't do it async because of babel + traverse
const parseFile = async (filePath) => {
    const content = await fs.readFile(filePath, "utf-8");
    return (0, parser_1.parse)(content, {
        sourceType: "module",
        plugins: ["typescript"],
    });
};
const findImportPaths = async (filePath, baseDir) => {
    const ast = await parseFile(filePath);
    let importPaths = [];
    (0, traverse_1.default)(ast, {
        ImportDeclaration: ({ node }) => {
            const importPath = node.source.value;
            const fullPath = path.resolve(baseDir, path.dirname(filePath), importPath);
            importPaths.push(fullPath);
        },
    });
    return importPaths;
};
// recursive function that travels through imports
const processFile = async (filePath, baseDir, visited) => {
    if (visited.has(filePath))
        return new Set();
    visited.add(filePath);
    let files = new Set();
    files.add(filePath);
    const importPaths = await findImportPaths(filePath, baseDir);
    // try to check if files exist and go deeper in recursion
    for (let importPath of importPaths) {
        const resolvedPath = importPath + ".ts";
        try {
            await fs.access(resolvedPath);
            const newFiles = await processFile(resolvedPath, baseDir, visited);
            files = new Set([...files, ...newFiles]);
            break;
        }
        catch (error) {
            // file doesn't "bexist - unexpected behaviour - but continue
        }
    }
    return files;
};
async function findImports(entryFile, baseDir) {
    const visited = new Set();
    const importsSet = await processFile(entryFile, baseDir, visited);
    return Array.from(importsSet);
}
exports.findImports = findImports;
async function findImportsOfList(fileList, baseDir) {
    // returns a list of imports that each file depends on in some directory/project
    // `allImports` will be the result - convert it to list at the end
    // `visited` is a cache set - for `processFile` function - to avoid loops
    let allImports = new Set();
    const visited = new Set();
    for (let file of fileList) {
        const fileImports = await processFile(file, baseDir, visited);
        allImports = new Set([...allImports, ...fileImports]);
    }
    return Array.from(allImports);
}
exports.findImportsOfList = findImportsOfList;
