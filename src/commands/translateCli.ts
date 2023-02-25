import glob from "glob";
import { command } from "cleye";
import { fileExists, readConfigFile } from "../utils/fs.js";
import { Config } from "../cli.js";
import { aiIntlFileName } from "../costants/aiFileName.js";
import { validateAllKeysMatch } from "../utils/diff.js";
import { loadJson } from "../utils/fs.js";
import { multiselect, intro, outro } from "@clack/prompts";
import { green } from "kolorist";
import task from "tasuku";
import { translateIndividual } from "../utils/translateIndividial.js";

type StrcutMissingTranslations = {
  file: string;
  locale: string;
};

export default command(
  {
    name: "translate",
    parameters: [],
  },
  async (argv) => {
    const { defaultLocale, locales, translationsPath } = (await readConfigFile(
      aiIntlFileName
    )) as Config;

    const files = glob.sync(`${translationsPath}/${defaultLocale}/*.json`);

    const missingTranslations = [] as StrcutMissingTranslations[];

    for (const file of files) {
      for (const locale of locales) {
        const localeFile = file.replace(defaultLocale, locale);
        const doesTranslationForLocaleFileExists = await fileExists(localeFile);

        if (doesTranslationForLocaleFileExists) {
          const originalJson = loadJson(file);
          const translatedJson = loadJson(localeFile);

          const isMatching = validateAllKeysMatch({
            originalJson,
            generatedJson: translatedJson,
          });

          if (!isMatching) {
            missingTranslations.push({
              file,
              locale,
            });
          }
        } else {
          missingTranslations.push({
            file,
            locale,
          });
        }
      }
    }

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
