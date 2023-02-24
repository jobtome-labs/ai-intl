import { execa } from "execa";

export const assertGitRepo = async () => {
  const { stdout } = await execa(
    "git",
    ["rev-parse", "--is-inside-work-tree"],
    { reject: false }
  );

  if (stdout !== "true") {
    throw new Error("The current directory must be a Git repository!");
  }
};

const excludeFromDiff = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
].map((file) => `:(exclude)${file}`);

export const getStagedDiff = async () => {
  const diffCached = ["diff"];
  const { stdout: files } = await execa("git", [
    ...diffCached,
    "--name-only",
    ...excludeFromDiff,
  ]);

  if (!files) {
    return;
  }

  const { stdout: diff } = await execa("git", [
    ...diffCached,
    ...excludeFromDiff,
  ]);

  return {
    files: files
      .split("\n")
      .filter((name) => name.includes(".json") && name.includes("en-US")),
    diff,
  };
};

export const getDetectedMessage = (files: string[]) =>
  `Detected ${files.length.toLocaleString()} staged file${
    files.length > 1 ? "s" : ""
  }`;
