"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWrappersToJSON = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const parseWrapper_1 = require("./parseWrapper");
const utils_1 = require("../utils");
// Custom merge function for objects, for soft updates
const mergeObjects = (target, source) => {
    const mergedObj = { ...target };
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (mergedObj[key] && typeof mergedObj[key] === "object" && typeof source[key] === "object") {
                mergedObj[key] = mergeObjects(mergedObj[key], source[key]);
            }
            else if (mergedObj[key] === undefined) {
                mergedObj[key] = source[key];
            }
        }
    }
    return mergedObj;
};
async function mergeConfigs(configDest, configFrom) {
    // Update the configuration
    for (const key in configFrom) {
        if (configFrom.hasOwnProperty(key)) {
            const existingWrapper = configDest[key];
            const newWrapper = configFrom[key];
            // If the record already exists, merge the values preserving the existing values
            if (existingWrapper) {
                const mergedWrapper = {
                    defaultAddress: existingWrapper.defaultAddress || newWrapper.defaultAddress,
                    tabName: existingWrapper.tabName || newWrapper.tabName,
                    sendFunctions: mergeObjects(existingWrapper.sendFunctions, newWrapper.sendFunctions),
                    getFunctions: mergeObjects(existingWrapper.getFunctions, newWrapper.getFunctions),
                    definedTypes: mergeObjects(existingWrapper.definedTypes, newWrapper.definedTypes),
                };
                configDest[key] = mergedWrapper;
            }
            else {
                // If the record doesn't exist, add a new record
                configDest[key] = newWrapper;
            }
        }
    }
    return configDest;
}
async function writeUpdateConfig(configPath, newConfig) {
    let config = {}; // empty by default
    try {
        // Load the current config.json file
        const configFile = await promises_1.default.readFile(configPath, "utf-8");
        config = JSON.parse(configFile);
    }
    catch (e) { }
    // Merge the new config with the existing config
    config = await mergeConfigs(config, newConfig);
    // Write the modified config back to the file
    await promises_1.default.writeFile(configPath, JSON.stringify(config, (_, value) => {
        if (Array.isArray(value) && value.length === 0) {
            return []; // Replace empty arrays with []
        }
        return value;
    }, 2));
}
async function parseFromFiles(ui, files) {
    let wrappers = {};
    let config = {};
    for (const { name, path } of files) {
        const wrapperModule = require(path);
        const wrapperClass = wrapperModule[name];
        if (!wrapperClass)
            continue; // no main class - skip
        let wrapper;
        try {
            wrapper = await (0, parseWrapper_1.parseWrapper)(path, name);
        }
        catch (e) {
            if (e instanceof Error) {
                ui.write("⚠️ Omitting `" + name + "`: " + e.message);
            }
            continue;
        }
        wrappers[name] = wrapper;
        config[name] = {
            defaultAddress: "",
            tabName: "",
            sendFunctions: {},
            getFunctions: {},
            definedTypes: {},
        };
        // Fill sendFunctions and getFunctions config with '' to all params
        for (const sendMethod of Object.keys(wrapper.sendFunctions)) {
            config[name].sendFunctions[sendMethod] = {
                tabName: "",
                params: {},
            };
            for (const [paramName, paramData] of Object.entries(wrapper.sendFunctions[sendMethod])) {
                config[name].sendFunctions[sendMethod].params[paramName] = {
                    fieldTitle: "",
                    // Add to config an option to hide input if default value is present
                    overrideWithDefault: paramData.defaultValue || paramData.optional ? false : undefined,
                };
            }
        }
        for (const getMethod of Object.keys(wrapper.getFunctions)) {
            config[name].getFunctions[getMethod] = {
                tabName: "",
                params: {},
                outNames: [],
            };
            for (const [paramName, paramData] of Object.entries(wrapper.getFunctions[getMethod])) {
                config[name].getFunctions[getMethod].params[paramName] = {
                    fieldTitle: "",
                    overrideWithDefault: paramData.defaultValue || paramData.optional ? false : undefined,
                };
            }
        }
        for (const type of Object.keys(wrapper.definedTypes)) {
            config[name].definedTypes[type] = {
                shownName: "",
                properties: {},
            };
            for (const [paramName, paramData] of Object.entries(wrapper.definedTypes[type])) {
                config[name].definedTypes[type].properties[paramName] = {
                    fieldTitle: "",
                    overrideWithDefault: paramData.defaultValue || paramData.optional ? false : undefined,
                };
            }
        }
    }
    return { wrappers, config, paths: files.map((f) => f.path) };
}
async function parseWrappersToJSON(ui, wrappersOut = "wrappers.json", configOut = "config.json") {
    const files = await (0, utils_1.findWrappers)();
    const { wrappers, config, paths } = await parseFromFiles(ui, files);
    // Write JSONs
    await promises_1.default.writeFile(wrappersOut, JSON.stringify(wrappers, null, 2));
    writeUpdateConfig(configOut, config);
    return paths;
}
exports.parseWrappersToJSON = parseWrappersToJSON;
