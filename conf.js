const fs = require("fs");
const path = require("path");
const home = require("os").homedir();

function findConfigFile(cwd = process.cwd()) {
  function tryParent(dir) {
    const next = path.dirname(dir);
    if (dir === next) return false;
    cwd = next;
    return true;
  }
  do {
    const file = path.join(cwd, ".dev.json");
    if (fs.existsSync(file)) return file;
  } while (tryParent(cwd));
  return path.join(home, ".dev.json");
}

function loadConfigFile(file) {
  let config = { rules: [], plugins: [] };
  if (fs.existsSync(file)) {
    config = JSON.parse(fs.readFileSync(file));
  }
  return config;
}

module.exports = {
  add(rule) {
    const file = findConfigFile();
    const config = loadConfigFile(file);
    config.rules.push(rule);
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
  },
  remove(rules) {
    const file = findConfigFile();
    const config = loadConfigFile(file);
    for (const { name, startsWith } of rules) {
      const index = config.rules.findIndex((e) => e.name === name && e.startsWith === startsWith);
      if (index !== -1) config.rules.splice(index, 1);
    }
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
  },
  plugin(fire) {
    const file = findConfigFile();
    const config = loadConfigFile(file);
    if (!config.plugins.includes(fire)) {
      config.plugins.push(fire);
    }
  },
  load(dev) {
    const file = findConfigFile();
    const config = loadConfigFile(file);
    dev.rules.splice(0, 0, ...config.rules);
    dev.plugins.splice(0, 0, ...config.plugins);
  },
};
