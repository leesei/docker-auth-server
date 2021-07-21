#!/usr/bin/env node

const Fs = require("fs");
const Path = require("path");

const Bcrypt = require("bcrypt");
const ParseArgs = require("minimist");

function PrintUsage() {
  console.log("Usage:");
  console.log();
  console.log(`  ${Path.basename(process.argv[1])} PASSWORD|JSON`);
}

const argv = ParseArgs(process.argv.slice(2), {
  alias: {
    r: "rounds",
  },
  default: {
    rounds: 9,
  },
  "--": true,
});
// console.log(argv); process.exit(0);

if (argv._.length != 1) {
  PrintUsage();
  process.exit(0);
}

argv.rounds = Number.parseInt(argv.rounds, 10);
if (Fs.existsSync(argv._[0])) {
  const users = JSON.parse(Fs.readFileSync(argv._[0], "utf8"));
  for (var k in users) {
    users[k].password = Bcrypt.hashSync(users[k].password, argv.rounds);
  }
  console.log(JSON.stringify(users, null, 2));
} else {
  console.log(Bcrypt.hashSync(argv._[0], argv.rounds));
}
