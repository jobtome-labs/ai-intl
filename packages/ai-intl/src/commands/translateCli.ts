import { command } from "cleye";
import { findNewTranslationsFile, readConfigFile } from "../utils/fs.js";
import { Config } from "../cli.js";
import { aiIntlFileName } from "../costants/aiFileName.js";
import { multiselect, intro, outro } from "@clack/prompts";
import { green } from "kolorist";
import task from "tasuku";
import { translate } from "../utils/translate.js";
import { getConfig } from "../utils/config.js";

export default command(
  {
    name: "translate",
    parameters: [],
  },
  async (argv) => {
    let { ACCESS_TOKEN } = await getConfig();
    const response = await fetch("http://localhost:3000/api/auth/cli/login", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const { defaultLocale } = (await readConfigFile(aiIntlFileName)) as Config;
    const missingTranslations = await findNewTranslationsFile();

    if (missingTranslations.length === 0) {
      console.log(green("✔"), "Your translations are up to date");
      return;
    }

    intro("Missing translations found");

    const missingTranslationsToGenerate = (await multiselect({
      message: "Select missing translations you want to generate",
      initialValues: [],
      options: missingTranslations.map((missingTranslation) => ({
        label:
          `${missingTranslation.file} for ${missingTranslation.locale}` as string,
        value:
          `${missingTranslation.file}___${missingTranslation.locale}` as string,
      })),
    })) as string[];

    const filesToTranslate = missingTranslationsToGenerate.map(
      (missingTranslation) => {
        const [file, locale] = missingTranslation.split("___");
        return {
          file,
          locale,
        };
      }
    );

    outro("Thanks we are generating translations for you");

    return await task.group(
      (task) =>
        filesToTranslate.map(({ file, locale }) =>
          task(
            `Translating ${file} to ${locale}`,
            async ({ task: nestedTask }) => {
              return translate({
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
