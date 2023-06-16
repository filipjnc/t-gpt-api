import fs from "fs";
import path from "path";
import zlib from "zlib";
import stream from "stream";

const rootDirPath = path.resolve(process.cwd(), "src/data");

export const storeStream = async (
  dirPath: string,
  fileName: string,
  options?: { compress?: boolean }
) => {
  await fs.promises.mkdir(path.join(rootDirPath, dirPath), {
    recursive: true,
  });
  const srcStream = new stream.PassThrough();
  const gzip = zlib.createGzip({ flush: zlib.constants.Z_SYNC_FLUSH });
  const done = new Promise(async (resolve, reject) => {
    stream.pipeline(
      srcStream,
      options?.compress === true ? gzip : new stream.PassThrough(),
      fs.createWriteStream(path.join(rootDirPath, dirPath, fileName)),
      (err) => {
        if (err) reject();
        resolve(true);
      }
    );
  });
  return { srcStream, done };
};
