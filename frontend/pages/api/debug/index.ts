import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const dirToCheck = process.cwd();

  console.log("checking dir", { dirToCheck });
  const allFiles = getAllFiles(dirToCheck);

  allFiles.forEach((file) => {
    console.log("detected file", { dirToCheck, file });
  });

  return res.status(200).json({ allFiles, dirToCheck });
}

const getAllFiles = function (dirPath: string, arrayOfFilesInput?: string[]) {
  const files = fs.readdirSync(dirPath);

  let arrayOfFiles = arrayOfFilesInput || [];

  // console.log("files", files);

  files.forEach(function (file) {
    if (file === "node_modules") {
      return;
    }

    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      console.log("__dirname", __dirname);
      console.log("dirPath", dirPath);
      console.log("file", file);

      arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
    }
  });

  return arrayOfFiles;
};
