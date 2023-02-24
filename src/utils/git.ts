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

export const getStagedDiff = async (defaultLocale: string) => {
  const diffCached = ["diff", "--cached"];
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
      .filter((name) => name.includes(".json") && name.includes(defaultLocale)),
    diff,
  };
};
