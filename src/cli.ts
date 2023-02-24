import { cli } from "cleye";
import { description, version } from "../package.json";
import hookCommand from "./commands/hook.js";
import configCommand from "./commands/config.js";
import translateCli from "./commands/translateCli.js";
import generateCommand from "./commands/generate.js";
import { translate } from "./utils/translate.js";
import { readConfigFile } from "./utils/fs.js";
import { getStagedDiff } from "./utils/git.js";
import { aiIntlFileName } from "./costants/aiFileName.js";

export type Config = {
  translationsPath: string;
  defaultLocale: string;
  locales: string[];
};

cli(
  {
    name: "ai-intl",
    version,
    description,
    flags: {
      apiKey: {
        type: String,
        description: "OpenAI API Key",
      },
    },

    commands: [configCommand, hookCommand, translateCli, generateCommand],

    help: {
      description,
    },
  },
  async (argv) => {
    const { defaultLocale, locales, translationsPath } = (await readConfigFile(
      aiIntlFileName
    )) as Config;
    const stagedDiff = await getStagedDiff(defaultLocale);

    translate({
      defaultLocale,
      locales,
      translationsPath,
      files: stagedDiff?.files,
    });
  }
);
