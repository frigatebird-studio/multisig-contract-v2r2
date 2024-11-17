"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILD_DIR = exports.WRAPPERS_DIR = exports.DAPP_DIR = void 0;
const path_1 = __importDefault(require("path"));
exports.DAPP_DIR = path_1.default.join(process.cwd(), "dapp");
exports.WRAPPERS_DIR = path_1.default.join(process.cwd(), "wrappers");
exports.BUILD_DIR = path_1.default.join(process.cwd(), "build");
