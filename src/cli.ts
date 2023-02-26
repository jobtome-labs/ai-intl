import { cli } from "cleye";
import { description, version } from "../package.json";
import hookCommand from "./commands/hook.js";
import configCommand from "./commands/config.js";
import translateCli from "./commands/translateCli.js";
import generateCommand from "./commands/generate.js";
import { readConfigFile } from "./utils/fs.js";
import { getStagedDiff } from "./utils/git.js";
import { aiIntlFileName } from "./costants/aiFileName.js";
import task from "tasuku";
import { translateIndividual } from "./utils/translate.js";
import { green } from "kolorist";

type StrcutMissingTranslations = {
  file: string;
  locale: string;
};

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
    const {
      defaultLocale,
      locales,
      translationsPath: defaultTranslationsPath,
    } = (await readConfigFile(aiIntlFileName)) as Config;
    const pathToSearchDiff = `${defaultTranslationsPath}/${defaultLocale}`;
    const stagedDiff = await getStagedDiff(pathToSearchDiff);

    if (!stagedDiff) {
      console.log(
        green("✔"),
        "Your translations are up to date, continue committing..."
      );
      return;
    }

    let missingTranslationsToGenerate: StrcutMissingTranslations[] = [];

    for (const file of stagedDiff.files) {
      for (const locale of locales) {
        missingTranslationsToGenerate.push({
          file,
          locale,
        });
      }
    }

    return await task.group(
      (task) =>
        missingTranslationsToGenerate.map(({ file, locale }) =>
          task(
            `Translating ${file} to ${locale}`,
            async ({ task: nestedTask }) => {
              return translateIndividual({
                file,
                locale,
                defaultLocale,
                task: nestedTask,
              });
            }
          )
        ),
      {
        concurrency: 5,
      }
    );
  }
);
