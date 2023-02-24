import task from "tasuku";
import fsExtra from "fs-extra";
import { Configuration, OpenAIApi } from "openai";
import { getConfig } from "../utils/config.js";
import { getStagedDiff } from "./git.js";
import path from "path";
import { execa } from "execa";

const { outputJson } = fsExtra;

const sanitizeMessage = (message: string) =>
  message
    .trim()
    .replace(/[\n\r]/g, "")
    .replace(/(\w)\.$/, "$1");

enum Locales {
  itIT = "it-IT",
}

const promptTemplate = (locale: Locales) => `
  "Translate only the value of the key-value json file in input, the translated values must match ${locale} locale, then return the JSON\n";`;

export const translate = async () => {
  const stagedDiff = await getStagedDiff();

  const { OPENAI_KEY: apiKey } = await getConfig();
  const OPENAI_KEY =
    process.env.OPENAI_KEY ?? process.env.OPENAI_API_KEY ?? apiKey;

  if (!OPENAI_KEY) {
    throw new Error(
      "No OpenAI API Key found. Please set the OPENAI_KEY environment variable."
    );
  }

  const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

  if (!stagedDiff) {
    return;
  }

  const translations = await task.group(
    (task) =>
      Object.values(Locales).map((locale) =>
        task(`Translating ${locale}`, async ({ task: nestedTask }) => {
          return nestedTask.group(
            (openAiTask) =>
              stagedDiff?.files.map((file) =>
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
                        "The diff is too large for the OpenAI API. Try reducing the number of staged changes, or write your own commit message."
                      );
                    }

                    setTitle(`Fetching translation for ${fileName}...`);
                    try {
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

                      await outputJson(file.replace("en-US", locale), json, {
                        spaces: 2,
                      });

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
    execa("git", ["add", "."]);
  });
};
