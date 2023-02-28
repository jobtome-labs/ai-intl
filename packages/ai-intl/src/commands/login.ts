import { command } from "cleye";
import open from "open";
import express from "express";
import { setConfigs } from "../utils/config.js";

export default command(
  {
    name: "login",
  },
  async () => {
    const app = express();

    await open(
      "https://ai-intl-ai-intl-platform.vercel.app/api/auth/signin?callbackUrl=http://localhost:3100/auth",
      {
        wait: true,
        newInstance: true,
      }
    );

    app.get("/auth", async function (req, res) {
      const token = await fetch(
        "https://ai-intl-platform-ai-intl-platform.vercel.app/api/auth/cli/login",
        {
          headers: {
            cookie: req.headers.cookie ?? "",
          },
        }
      );

      const json = await token.json();
      await setConfigs([["ACCESS_TOKEN", json.token]]);
      res.redirect(
        "https://ai-intl-platform-ai-intl-platform.vercel.app/auth/success"
      );
      process.exit(0);
    });
    const server = await app.listen(3100);

    return;
  }
);
