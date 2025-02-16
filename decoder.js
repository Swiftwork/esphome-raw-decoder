import { Command } from "commander";
import { processAction } from "./actions/process.js";

const program = new Command();

program
  .name("esphome-decoder")
  .description("CLI to process ESPHome raw IR dumps")
  .version("1.0.0");

program
  .command("process")
  .description("Process a dump file and combine raw IR signals")
  .option("-o, --output <file>", "output file path", "decoded.txt")
  .option("--one <microseconds>", "one threshold in microseconds", 1250)
  .option("--zero <microseconds>", "zero threshold in microseconds", 450)
  .option("--tolerance <percent>", "tolerance percentage", 25)
  .option("--min-length <bits>", "minimum signal length", 8)
  .option("--max-length <bits>", "maximum signal length", 32)
  .option("--reverse", "reverse bit order", true)
  .option("--faults", "show faults with an X", false)
  .option("--hex", "append hex after binary", false)
  .option("--group", "attempt to group signals", false)
  .argument("[file]", "dump file to process", "dump.txt")
  .action(processAction);

program.parse();
