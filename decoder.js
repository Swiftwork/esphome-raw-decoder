import { Command } from "commander";
import { decodeAction } from "./actions/decode.js";
import { renderAction } from "./actions/render.js";
import { analyzeAction } from "./actions/analyze.js";

const program = new Command();

program
  .name("esphome-decoder")
  .description("CLI to process ESPHome raw RF/IR dumps")
  .version("1.0.0");

program
  .command("decode")
  .description("decode a dump file and combine raw RF/IR signals")
  .option("--one <microseconds>", "one threshold in microseconds", 1250)
  .option("--zero <microseconds>", "zero threshold in microseconds", 450)
  .option("--tolerance <percent>", "tolerance percentage", 25)
  .option("--min-length <bits>", "minimum signal length", 8)
  .option("--max-length <bits>", "maximum signal length", 32)
  .option("--min-occurrences <number>", "minimum occurrences of valid signals", 3)
  .option("--reverse", "reverse bit order", false)
  .option("--split", "analyze and split signals into fixed and variable parts", false)
  .argument("[file]", "dump file to process", "dump.txt")
  .action(decodeAction);

program
  .command("render")
  .description("Render a dump file as a graph")
  .option("-o, --output <file>", "output file path", "decoded-graph.html")
  .option("--min-length <bits>", "minimum signal length", 8)
  .option("--max-length <bits>", "maximum signal length", 32)
  .argument("[file]", "dump file to process", "dump.txt")
  .action(renderAction);

program
  .command("analyze")
  .description("Analyze raw signals to find median/average pulse lengths and signal statistics")
  .option("--min-length <bits>", "minimum signal length", 8)
  .option("--max-length <bits>", "maximum signal length", 32)
  .option("--min-short-pulse <microseconds>", "minimum short pulse length", 50)
  .option("--max-short-pulse <microseconds>", "maximum short pulse length", 350)
  .option("--min-long-pulse <microseconds>", "minimum long pulse length", 600)
  .option("--max-long-pulse <microseconds>", "maximum long pulse length", 1000)
  .option("--histogram", "show pulse duration histogram", false)
  .argument("[file]", "dump file to process", "dump.txt")
  .action(analyzeAction);

program.parse();
