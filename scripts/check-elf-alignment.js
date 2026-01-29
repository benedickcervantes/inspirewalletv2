#!/usr/bin/env node

/* eslint-disable no-console */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node scripts/check-elf-alignment.js <path-to-apk>',
      '',
      'Checks all native .so libraries inside an APK for 16 KB ELF segment alignment.',
      'Requires the `unzip` command to be available on your PATH.',
    ].join('\n')
  );
}

if (process.argv.length < 3) {
  printUsage();
  process.exit(1);
}

const apkPath = path.resolve(process.argv[2]);

if (!fs.existsSync(apkPath)) {
  console.error(`APK not found: ${apkPath}`);
  process.exit(1);
}

function runUnzip(args, encoding) {
  const result = spawnSync('unzip', args, {
    encoding: encoding ?? null,
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(
        'Error: `unzip` command not found. Install unzip or extract the APK manually and run checks on the .so files.'
      );
      process.exit(1);
    }
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : '';
    throw new Error(`unzip ${args.join(' ')} failed with code ${result.status}\n${stderr}`);
  }

  return result.stdout;
}

let listing;
try {
  listing = runUnzip(['-Z1', apkPath], 'utf8');
} catch (error) {
  console.error('Failed to list APK contents via unzip:');
  console.error(error.message || error);
  process.exit(1);
}

const entries = listing
  .toString()
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && line.endsWith('.so') && line.includes('/lib/'));

if (entries.length === 0) {
  console.log('No native .so libraries found inside the APK.');
  process.exit(0);
}

function readU16(buf, offset, little) {
  return little ? buf.readUInt16LE(offset) : buf.readUInt16BE(offset);
}

function readU32(buf, offset, little) {
  return little ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
}

function readU64(buf, offset, little) {
  if (little) {
    const lo = buf.readUInt32LE(offset);
    const hi = buf.readUInt32LE(offset + 4);
    return hi * 0x100000000 + lo;
  }

  const hi = buf.readUInt32BE(offset);
  const lo = buf.readUInt32BE(offset + 4);
  return hi * 0x100000000 + lo;
}

function getElfLoadAlignments(buffer) {
  if (buffer.length < 64) {
    throw new Error('File too small for ELF header');
  }

  if (
    buffer[0] !== 0x7f ||
    buffer[1] !== 0x45 ||
    buffer[2] !== 0x4c ||
    buffer[3] !== 0x46
  ) {
    throw new Error('Not an ELF shared library');
  }

  const eiClass = buffer[4];
  const is64 = eiClass === 2;
  const little = buffer[5] === 1;

  let ePhOff;
  let ePhEntSize;
  let ePhNum;

  if (is64) {
    ePhOff = readU64(buffer, 32, little);
    ePhEntSize = readU16(buffer, 54, little);
    ePhNum = readU16(buffer, 56, little);
  } else {
    ePhOff = readU32(buffer, 28, little);
    ePhEntSize = readU16(buffer, 42, little);
    ePhNum = readU16(buffer, 44, little);
  }

  const PT_LOAD = 1;
  const alignments = [];

  for (let i = 0; i < ePhNum; i += 1) {
    const off = ePhOff + i * ePhEntSize;
    if (off + ePhEntSize > buffer.length) {
      break;
    }

    let pType;
    let pAlign;

    if (is64) {
      pType = readU32(buffer, off, little);
      pAlign = readU64(buffer, off + 48, little);
    } else {
      pType = readU32(buffer, off, little);
      pAlign = readU32(buffer, off + 28, little);
    }

    if (pType === PT_LOAD) {
      alignments.push(pAlign);
    }
  }

  if (alignments.length === 0) {
    throw new Error('No PT_LOAD segments found');
  }

  return alignments;
}

console.log(`Checking ELF alignment for ${entries.length} native libraries in:`);
console.log(`  ${apkPath}\n`);

const threshold = 16384; // 16 KB
const results = [];
const unaligned = [];

for (const entry of entries) {
  let buffer;

  try {
    buffer = runUnzip(['-p', apkPath, entry]);
  } catch (error) {
    results.push({
      entry,
      ok: false,
      error: `Failed to extract from APK: ${error.message || error}`,
      alignments: [],
    });
    unaligned.push(entry);
    continue;
  }

  try {
    const aligns = getElfLoadAlignments(buffer);
    const minAlign = Math.min(...aligns);
    const ok = Number.isFinite(minAlign) && minAlign >= threshold;

    results.push({
      entry,
      ok,
      alignments: aligns,
      minAlign,
    });

    if (!ok) {
      unaligned.push(entry);
    }
  } catch (error) {
    results.push({
      entry,
      ok: false,
      error: error.message || String(error),
      alignments: [],
    });
    unaligned.push(entry);
  }
}

for (const result of results) {
  const status = result.ok ? 'OK        ' : 'UNALIGNED ';
  const alignInfo =
    result.alignments && result.alignments.length > 0
      ? `[${result.alignments.join(', ')}]`
      : '[no PT_LOAD alignment data]';

  if (result.error) {
    console.log(`${status} ${result.entry}  ${alignInfo}  - ${result.error}`);
  } else {
    console.log(`${status} ${result.entry}  ${alignInfo}`);
  }
}

if (unaligned.length > 0) {
  console.log(
    `\nFound ${unaligned.length} libraries with LOAD segment alignment < ${threshold} or unreadable ELF headers.`
  );
  console.log('These libraries may prevent full 16 KB page-size support on Google Play.');
  process.exit(2);
}

console.log(
  `\nAll native libraries have LOAD segment alignment >= ${threshold} (16 KB).`
);
process.exit(0);

