import glob from "glob";
import task from "tasuku";
import fsExtra from "fs-extra";
import { Configuration, OpenAIApi } from "openai";
const { outputJson } = fsExtra;
import { getConfig } from "../utils/config.js";
import { getStagedDiff } from "./git.js";

const sanitizeMessage = (message: string) =>
  message
    .trim()
    .replace(/[\n\r]/g, "")
    .replace(/(\w)\.$/, "$1");

enum Locales {
  itIT = "it-IT",
  frFR = "fr-FR",
  ptPT = "pt-PT",
}

const promptTemplate = (locale: Locales) => `
  "Translate only the value of the key-value json file in input, the translated values must match ${locale} locale, then return the JSON\n";`;

export const translate = async () => {
  const stagedDiff = await getStagedDiff();

  if (!stagedDiff) {
    return;
  }

  console.log(stagedDiff);

  const { OPENAI_KEY: apiKey } = await getConfig();
  const OPENAI_KEY =
    process.env.OPENAI_KEY ?? process.env.OPENAI_API_KEY ?? apiKey;

  if (!OPENAI_KEY) {
    throw new Error(
      "No OpenAI API Key found. Please set the OPENAI_KEY environment variable."
    );
  }

  const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));
  glob(
    "**/locales/en-US/*.json",
    { realpath: true },
    async function (er, files) {
      Object.values(Locales).forEach(async (locale) => {
        await task(`Translating to ${locale}`, async ({ task }) => {
          files.forEach(async (file) => {
            const content = require(file);
            const prompt = `${promptTemplate(locale)}\n${sanitizeMessage(
              JSON.stringify(content)
            )}`;

            // Accounting for GPT-3's input req of 4k tokens (approx 8k chars)
            if (prompt.length > 8000) {
              throw new Error(
                "The diff is too large for the OpenAI API. Try reducing the number of staged changes, or write your own commit message."
              );
            }

            const fileName = file.split("/").pop();

            const nestedTask = await task(
              `Translating ${fileName} for ${locale}`,
              async ({ setTitle: setTranslationTitle, setStatus }) => {
                try {
                  setTranslationTitle(`Translating ${fileName}`);
                  const completion = await openai.createCompletion({
                    model: "text-davinci-003",
                    prompt,
                    temperature: 0.7,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0,
                    max_tokens: 3000,
                    stream: false,
                  });

                  const json = JSON.parse(
                    completion.data.choices[0].text ?? "{}"
                  );

                  setTranslationTitle(`Successfuly translated ${fileName}`);

                  await outputJson(file.replace("en-US", locale), json, {
                    spaces: 2,
                  });

                  setStatus("success");
                } catch (error) {
                  const errorAsAny = error as any;
                  if (errorAsAny.code === "ENOTFOUND") {
                    throw new Error(
                      `Error connecting to ${errorAsAny.hostname} (${errorAsAny.syscall}). Are you connected to the internet?`
                    );
                  }

                  errorAsAny.message = `OpenAI API Error: ${errorAsAny.message} - ${errorAsAny.response.statusText}`;
                  setTranslationTitle(`Error translating ${fileName}`);
                  setStatus("error");
                  throw errorAsAny;
                }
              }
            );
          });
        });
      });
    }
  );
};
