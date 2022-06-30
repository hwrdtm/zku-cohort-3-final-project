import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // const dirToCheck = process.cwd();
  const dirToCheck = "/vercel/path0/frontend";

  const allFiles = getAllFiles(dirToCheck);

  allFiles.forEach((file) => {
    console.log("detected file", { dirToCheck, file });
  });

  return res.status(200).json({ allFiles, dirToCheck });
}

const getAllFiles = function (dirPath: string, arrayOfFilesInput?: string[]) {
  const files = fs.readdirSync(dirPath);

  let arrayOfFiles = arrayOfFilesInput || [];

  files.forEach(function (file) {
    if (file === "node_modules") {
      return;
    }

    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
    }
  });

  return arrayOfFiles;
};
