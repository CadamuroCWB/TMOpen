import fs from 'node:fs';
import iconv from 'iconv-lite';
import { parse, type Options } from 'csv-parse';
import type { Readable } from 'node:stream';

export interface CsvLine {
  columns: string[];
  raw: string;
}


const parserOptions: Options = {
  delimiter: ';',
  quote: '"',
  escape: '"',
  relax_column_count: true,
  skip_empty_lines: true,
  trim: true,
  record_delimiter: ['\n', '\r\n', '\r'] as Options['record_delimiter'],
};

export function openCsvStream(
  filePath: string,
  encoding: 'latin1' | 'utf8' = 'latin1',
): Readable {
  const fileStream = fs.createReadStream(filePath);
  const decodeStream =
    encoding === 'latin1'
      ? iconv.decodeStream('iso-8859-1')
      : iconv.decodeStream('utf8');

  const parser = parse(parserOptions);

  return fileStream.pipe(decodeStream).pipe(parser);
}
