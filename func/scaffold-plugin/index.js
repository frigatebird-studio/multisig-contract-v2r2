"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScaffoldPlugin = void 0;
const scaffold_1 = require("./scaffold");
class ScaffoldPlugin {
    runners() {
        return [
            {
                name: "scaffold",
                runner: scaffold_1.scaffold,
                help: `Usage: blueprint scaffold [flags]

Generates a dapp using the contracts described in the wrappers/ directory.

Flags:
--update - prevents regenerating whole dapp, and just updates the wrappers already present in the dapp/ directory. Does not affect if generating for the first time.`,
            },
        ];
    }
}
exports.ScaffoldPlugin = ScaffoldPlugin;
