import fs from "fs/promises";
import { createRequire } from "node:module";
import path from "path";

// lstat is used because this is also used to check if a symlink file exists
export const fileExists = (filePath: string) =>
  fs.lstat(filePath).then(
    () => true,
    () => false
  );

export const readConfigFile = async (filePath: string) => {
  const doesConfigExists = await fileExists(filePath);
  if (!doesConfigExists) {
    throw new Error(
      "ai-intl.config.js not found. Please run `ai-intl generate` to create one."
    );
  }

  return await import(path.resolve(filePath)).then((module) => module.default);
};

export const loadJson = (filePath: string) => {
  const require = createRequire(import.meta.url);
  return require(path.resolve(filePath));
};
