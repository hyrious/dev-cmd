#!/usr/bin/env node

const isCli = require.main === module;
const { spawn } = require("child_process");
const { inspect } = require("util");
const conf = require("./conf");

function showRule({ name, startsWith, run, remove }) {
  let str = name;
  if (startsWith != null) str += " = " + startsWith;
  if (typeof run === "function") {
    str += " [Function]";
  } else {
    str += " " + inspect(run);
  }
  return str;
}

function add(name, { startsWith = null, run = null, remove = null }) {
  let index = this.rules.findIndex((e) => e.name === name && e.startsWith === startsWith);
  if (index === -1) index = this.rules.length;
  this.rules[index] = { name, startsWith, run, remove };
  if (isCli) console.log("+ " + showRule(this.rules[index]));
  return this.rules[index];
}

function list(name) {
  const result = [];
  const regex = RegExp(name);
  for (const rule of this.rules) {
    if (regex.test(rule.name)) {
      if (isCli) console.log("+ " + showRule(rule));
      result.push(rule);
    }
  }
  return result;
}

function remove(name, { startsWith = null }) {
  let index = this.rules.findIndex((e) => e.name === name && e.startsWith === startsWith);
  if (index === -1) {
    if (isCli) console.log("not found");
    return;
  }
  const rule = this.rules.splice(index, 1)[0];
  if (isCli) console.log("- " + showRule(rule));
  return rule;
}

function removeAll(name) {
  let index;
  const removed = [];
  while ((index = this.rules.findIndex((e) => e.name === name)) !== -1) {
    const rule = this.rules.splice(index, 1)[0];
    removed.push(rule);
    if (isCli) console.log("- " + showRule(rule));
  }
  return removed;
}

function sh(cmd, args = []) {
  if (isCli) console.log("> " + cmd + " " + inspect(args));
  const proc = spawn(cmd, args);
  proc.stdout.on("data", (data) => console.log(String(data)));
  proc.stderr.on("data", (data) => console.log(String(data)));
}

function plugin(file) {
  const path = require.resolve(file, { paths: [process.cwd()] });
  require(path)(this);
}

function findAndRun(name, line) {
  let index = this.rules.findIndex((e) => e.name === name && e.startsWith === line[0]);
  if (index === -1) {
    index = this.rules.findIndex((e) => e.name === name);
  }
  if (index === -1) {
    if (isCli) console.log("not found");
    return;
  }
  const run = this.rules[index].run;
  if (Array.isArray(run)) {
    index = run.indexOf("...");
    if (index !== -1) {
      run.splice(index, 1, ...line);
    }
    const [cmd, ...args] = run;
    this.sh(cmd, args);
  } else if (typeof run === "function") {
    run.call(this);
  }
}

function help() {
  console.log(`example:
    dev -A hello echo "hello, world!"
    dev hello
    dev -R hello`);
}

function args(...as) {
  if (as.length === 0) {
    help();
  } else {
    if (["--add", "-A"].includes(as[0])) {
      if (!as[1]) return;
      const name = as[1];
      let rule;
      if (["--starts-with", "="].includes(as[2]) && as[3]) {
        const startsWith = as[3];
        const run = as.slice(4);
        rule = this.add(name, { startsWith, run });
      } else {
        const run = as.slice(2);
        rule = this.add(name, { run });
      }
      conf.add(rule);
      return;
    } else if (["--remove", "-R"].includes(as[0])) {
      if (!as[1]) return;
      const name = as[1];
      let rules;
      if (as[2] === "--all") {
        rules = removeAll(name);
      } else if (["--starts-with", "="].includes(as[2]) && as[3]) {
        const startsWith = as[3];
        const rule = this.remove(name, { startsWith });
        rules = [rule];
      } else {
        const rule = this.remove(name, {});
        rules = [rule];
      }
      conf.remove(rules);
      return;
    } else if (["--list", "-L"].includes(as[0])) {
      this.list();
      return;
    } else if (["--plugin", "-P"].includes(as[0])) {
      if (!as[1]) return;
      const file = as[1];
      this.plugins.push(file);
      if (as[2] === '--save') {
        conf.plugin(file);
        as = as.slice(3);
      } else {
        as = as.slice(2);
      }
    }
    if (as.length > 0) {
      for (const file of this.plugins) {
        this.plugin(file);
      }
      const name = as[0];
      const first = as[1] || null;
      this.findAndRun(name, as.slice(1));
    }
  }
}

const dev = {
  rules: [],
  plugins: [],
  add,
  list,
  remove,
  removeAll,
  sh,
  plugin,
  help,
  args,
  findAndRun,
};

if (require.main === module) {
  conf.load(dev);
  dev.args(...process.argv.slice(2));
} else {
  module.exports = dev;
}
