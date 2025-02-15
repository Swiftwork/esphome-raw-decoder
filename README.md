# ESPHome Raw Decoder

CLI tool to process and decode ESPHome raw IR dump files into binary sequences.

## Installation

```bash
yarn install
```

## Usage

Basic usage:
```bash
yarn process [options] [file]
```

### Options

- `-o, --output <file>` - Output file path (default: "decoded.txt")
- `--one <microseconds>` - One threshold in microseconds (default: 1250)
- `--zero <microseconds>` - Zero threshold in microseconds (default: 450)
- `--tolerance <percent>` - Tolerance percentage (default: 25)
- `--min-length <bits>` - Minimum signal length (default: 8)
- `--reverse` - Reverse bit order (default: true)

### Example

Process a dump file with custom thresholds:
```bash
yarn process --one 1500 --zero 500 dump.txt
```

## Input Format

The tool processes ESPHome raw IR/RF dump files. Each line should contain IR/RF timings in the format:
```
[timestamp][remote.raw:0]: Received Raw: 1234, -5678, 910, -1112
```

## Output

The tool outputs binary sequences, one per line. Each sequence represents the decoded IR signal.
