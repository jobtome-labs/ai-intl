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

    await open("http://localhost:3000/api/auth/signin?redirect=cli", {
      wait: true,
      newInstance: true,
    });

    app.get("/auth", async function (req, res) {
      const token = await fetch("http://localhost:3000/api/auth/cli/login", {
        headers: {
          cookie: req.headers.cookie ?? "",
        },
      });
      const json = await token.json();
      await setConfigs([["ACCESS_TOKEN", json.token]]);
      res.redirect("http://localhost:3000/auth/success");
      process.exit(0);
    });
    const server = await app.listen(3100);

    return;
  }
);
