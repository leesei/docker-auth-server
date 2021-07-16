#!/usr/bin/env node

const Path = require("path");

const Bcrypt = require("bcrypt");
const ParseArgs = require("minimist");

function PrintUsage() {
  console.log("Usage:");
  console.log();
  console.log(`  ${Path.basename(process.argv[1])} PASSWORD`);
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
console.log(Bcrypt.hashSync(argv._[0], parseInt(argv.rounds, 10)));
