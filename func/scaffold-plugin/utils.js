"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCompiled = exports.findWrappers = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("./paths");
const findWrappers = async () => (await promises_1.default.readdir(paths_1.WRAPPERS_DIR))
    .filter((f) => f.match(/^[A-Z][a-zA-Z0-9]*\.ts$/))
    .map((f) => ({ path: path_1.default.join(paths_1.WRAPPERS_DIR, f), name: path_1.default.parse(f).name }));
exports.findWrappers = findWrappers;
const readCompiled = async (name) => {
    const filePath = path_1.default.join(paths_1.BUILD_DIR, name + ".compiled.json");
    return JSON.parse(await promises_1.default.readFile(filePath, "utf-8"))["hex"];
};
exports.readCompiled = readCompiled;
