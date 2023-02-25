import task from "tasuku";
import fsExtra from "fs-extra";
import { Configuration, OpenAIApi } from "openai";
import { getConfig } from "../utils/config.js";
import path from "path";
import { execa } from "execa";
import { isCalledFromGitHook } from "../commands/hook.js";
import { validateAllKeysMatch } from "./diff.js";

const { outputJson } = fsExtra;

const sanitizeMessage = (message: string) =>
  message
    .trim()
    .replace(/[\n\r]/g, "")
    .replace(/(\w)\.$/, "$1");

const promptTemplate = (locale: string) => `
  "Translate only the value of the key-value json file in input, the translated values must match ${locale} locale, keep the same key of the json without translating it, then return the JSON\n";`;

type TranslateProps = {
  files?: string[];
  defaultLocale: string;
  locales: string[];
  translationsPath: string;
};

export const translate = async ({
  files,
  defaultLocale,
  locales,
}: TranslateProps) => {
  const { OPENAI_KEY: apiKey } = await getConfig();
  const OPENAI_KEY =
    process.env.OPENAI_KEY ?? process.env.OPENAI_API_KEY ?? apiKey;

  const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

  if (!files) {
    return;
  }

  const translations = await task.group(
    (task) =>
      locales.map((locale) =>
        task(`Translating ${locale}`, async ({ task: nestedTask }) => {
          return nestedTask.group(
            (openAiTask) =>
              files.map((file) =>
                openAiTask(
                  `Translating ${file.split("/").pop()}`,
                  async ({ setTitle, setStatus }) => {
                    const fileName = file.split("/").pop();
                    setTitle(`Preparing translation for ${fileName}...`);
                    const content = require(path.resolve(file));
                    const prompt = `${promptTemplate(
                      locale
                    )}\n${sanitizeMessage(JSON.stringify(content))}`;

                    // Accounting for GPT-3's input req of 4k tokens (approx 8k chars)
                    if (prompt.length > 8000) {
                      throw new Error(
                        "The translations file is too large for the OpenAI API."
                      );
                    }

                    setTitle(`Fetching translation for ${fileName}...`);
                    try {
                      const completion = await openai.createCompletion({
                        model: "text-davinci-003",
                        prompt,
                        temperature: 0.2,
                        top_p: 1,
                        frequency_penalty: 0,
                        presence_penalty: 0,
                        max_tokens: 3000,
                        stream: false,
                      });

                      const generatedJson = JSON.parse(
                        completion.data.choices[0].text ?? "{}"
                      ) as JSON;

                      const isMatching = validateAllKeysMatch({
                        generatedJson,
                        originalJson: content,
                      });

                      if (!isMatching) {
                        throw new Error(
                          `The generated translation for ${fileName} doesn't match the original one.`
                        );
                      }

                      await outputJson(
                        file.replace(defaultLocale, locale),
                        generatedJson,
                        {
                          spaces: 2,
                        }
                      );

                      setTitle(
                        `Successfully received translation for ${fileName}...`
                      );
                      setStatus("success");

                      return "Success";
                    } catch (error) {
                      const errorAsAny = error as any;
                      if (errorAsAny.code === "ENOTFOUND") {
                        throw new Error(
                          `Error connecting to ${errorAsAny.hostname} (${errorAsAny.syscall}). Are you connected to the internet?`
                        );
                      }

                      errorAsAny.message = `OpenAI API Error: ${errorAsAny.message} - ${errorAsAny.response.statusText}`;
                      throw errorAsAny;
                    }
                  }
                )
              ),
            {
              concurrency: 5,
            }
          );
        })
      ),
    {
      concurrency: 5,
    }
  );

  Promise.allSettled(translations).then(() => {
    if (isCalledFromGitHook) {
      execa("git", ["add", "."]);
    }
  });
};
