import { cli } from "cleye";
import { description, version } from "../package.json";
import hookCommand, { isCalledFromGitHook } from "./commands/hook.js";
import { translate } from "./commands/translate.js";

const rawArgv = process.argv.slice(2);

const response = cli(
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

    commands: [hookCommand],

    help: {
      description,
    },
  },
  (argv) => {
    if (isCalledFromGitHook) {
      console.log("This is called from github hook");
    } else {
      // translate({
      //   apiKey: argv.flags.apiKey,
      // });
    }
  },
  rawArgv
);

console.log(response);
