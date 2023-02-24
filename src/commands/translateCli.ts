import glob from "glob";
import { getConfig } from "../utils/config.js";
import { command } from "cleye";
import { readConfigFile } from "../utils/fs.js";
import { Config } from "../cli.js";
import { translate } from "../utils/translate.js";
import { aiIntlFileName } from "../costants/aiFileName.js";

export default command(
  {
    name: "translate",
    parameters: [],
  },
  async (argv) => {
    const { defaultLocale, locales, translationsPath } = (await readConfigFile(
      aiIntlFileName
    )) as Config;

    const { OPENAI_KEY: apiKey } = await getConfig();
    const OPENAI_KEY =
      process.env.OPENAI_KEY ?? process.env.OPENAI_API_KEY ?? apiKey;

    if (!OPENAI_KEY) {
      throw new Error(
        "No OpenAI API Key found. Please set the OPENAI_KEY environment variable."
      );
    }

    const files = glob.sync(`**/${translationsPath}/${defaultLocale}/*.json`);

    return translate({ files, defaultLocale, locales, translationsPath });
  }
);
