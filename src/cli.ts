import { cli } from "cleye";
import { description, version } from "../package.json";
import hookCommand, { isCalledFromGitHook } from "./commands/hook.js";
import configCommand from "./commands/config.js";
import translateCli from "./commands/translateCli.js";
import { translate } from "./utils/translate.js";

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

    commands: [configCommand, hookCommand, translateCli],

    help: {
      description,
    },
  },
  (argv) => {
    if (isCalledFromGitHook) {
      translate();
    } else {
      translate();
    }
  }
);
