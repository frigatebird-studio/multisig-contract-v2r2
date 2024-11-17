"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scaffold = void 0;
const blueprint_1 = require("@ton/blueprint");
const arg_1 = __importDefault(require("arg"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const findImports_1 = require("./parse/findImports");
const wrappersToJSON_1 = require("./parse/wrappersToJSON");
const paths_1 = require("./paths");
const WRAPPERS_JSON = path_1.default.join(paths_1.DAPP_DIR, "src/config/wrappers.json");
const CONFIG_JSON = path_1.default.join(paths_1.DAPP_DIR, "src/config/config.json");
const scaffold = async (args, ui) => {
    const localArgs = (0, arg_1.default)({
        "--update": Boolean,
    });
    ui.write(`Scaffold script running, ${localArgs["--update"] ? "updating" : "generating"} dapp...\n\n`);
    ui.setActionPrompt("⏳ Compiling contracts...");
    try {
        await (0, blueprint_1.buildAll)(ui);
    }
    catch (e) {
        ui.clearActionPrompt();
        ui.write(e.toString());
        ui.write(`\n❌ Failed to compile one of the files`);
        ui.write("Please make sure you can run `blueprint build --all` successfully before scaffolding.");
        process.exit(1);
    }
    ui.clearActionPrompt();
    ui.write("✅ Compiled.\n");
    let dappExisted = false;
    try {
        // try to access directories we will be working with
        await promises_1.default.access(paths_1.DAPP_DIR);
        await promises_1.default.access(path_1.default.join(paths_1.DAPP_DIR, "public"));
        await promises_1.default.access(path_1.default.join(paths_1.DAPP_DIR, "src"));
        dappExisted = true;
    }
    catch (e) { }
    if (!localArgs["--update"] || !dappExisted) {
        if (localArgs["--update"]) {
            ui.write("⚠️ Warning: no dapp found, a new one will be created.\n");
        }
        ui.setActionPrompt("📁 Creating dapp directory...");
        await promises_1.default.cp(path_1.default.join(__dirname, "dapp"), paths_1.DAPP_DIR, { recursive: true, force: true });
        // wrappersConfigTypes.ts is imported in blueprint, to parse wrappers,
        // we remove the compiled files from the destination.
        // await fs.rm(path.join(DAPP_DIR, "src", "utils", "wrappersConfigTypes.d.ts"));
        // await fs.rm(path.join(DAPP_DIR, "src", "utils", "wrappersConfigTypes.js"));
        ui.clearActionPrompt();
        ui.write("✅ Created dapp directory.\n");
        ui.setActionPrompt("📝 Setting title...");
        // convert module name from package.json
        // from kebab-case to CamelCase with space
        // e.g. my-contract -> My Contract
        const appName = JSON.parse(await promises_1.default.readFile(path_1.default.join(process.cwd(), "package.json"), "utf-8"))
            .name.split("-")
            .map((s) => s[0].toUpperCase() + s.slice(1))
            .join(" ");
        const envFile = path_1.default.join(paths_1.DAPP_DIR, ".env");
        const env = await promises_1.default.readFile(envFile, "utf-8");
        await promises_1.default.writeFile(envFile, env.replace("My Contract", appName));
        ui.clearActionPrompt();
        ui.write("✅ Set title.\n");
    }
    ui.setActionPrompt("📝 Updating dapp configs...");
    await promises_1.default.mkdir(path_1.default.join(paths_1.DAPP_DIR, "src/config"), { recursive: true });
    const wrappersFiles = await (0, wrappersToJSON_1.parseWrappersToJSON)(ui, WRAPPERS_JSON, CONFIG_JSON);
    ui.clearActionPrompt();
    ui.write("✅ Updated dapp configs.\n");
    ui.setActionPrompt("📁 Copying wrappers into dapp...");
    await promises_1.default.mkdir(path_1.default.join(paths_1.DAPP_DIR, "src/wrappers"), { recursive: true });
    const filesToCopy = await (0, findImports_1.findImportsOfList)(wrappersFiles, process.cwd());
    for (const filePath of filesToCopy) {
        const relativePath = path_1.default.relative(process.cwd(), filePath);
        await promises_1.default.cp(filePath, path_1.default.join(paths_1.DAPP_DIR, "src", relativePath), {
            force: true,
        });
    }
    ui.clearActionPrompt();
    ui.write("✅ Copied wrappers into dapp.\n");
    ui.write("✅ Scaffold complete!\n");
    ui.write("\nTo start the dapp, run:\n");
    ui.write("cd dapp && yarn && yarn dev\n\n");
    ui.write("To build and start as for production, run:\n");
    ui.write("cd dapp && yarn && yarn build && serve -s build\n\n");
};
exports.scaffold = scaffold;
