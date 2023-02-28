import { command } from "cleye";
import open from "open";
import express from "express";
import { setConfigs } from "../utils/config.js";
var cookieParser = require("cookie-parser");

require("dotenv").config();

const aiIntlEndpoint = "https://ai-intl-ai-intl-platform.vercel.app";
export default command(
  {
    name: "login",
  },
  async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    const url = `http://localhost:3100/auth`;
    await open(
      `${aiIntlEndpoint}/api/auth/signin?callbackUrl=${encodeURIComponent(
        url
      )}`,
      {
        wait: true,
        newInstance: true,
      }
    );

    app.get("/auth", async function (req, res) {
      const json = req.cookies;
      console.log(json);
      const token = json["next-auth.session-token"];
      await setConfigs([["ACCESS_TOKEN", token]]);
      res.redirect(`${aiIntlEndpoint}/auth/success`);
      process.exit();
    });

    // app.post("/auth", async function (req, res) {
    //   fetch(`${aiIntlEndpoint}/api/auth/signin`, {

    //   })
    //   const { token } = req.body;
    //   await setConfigs([["ACCESS_TOKEN", token]]);
    //   res.status(200);
    //   process.exit(0);
    // });

    const server = await app.listen(3100);

    return;
  }
);
