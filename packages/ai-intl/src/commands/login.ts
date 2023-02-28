import { command } from "cleye";
import open from "open";
import express from "express";
import { setConfigs } from "../utils/config.js";
require("dotenv").config();

const aiIntlEndpoint = process.env.AI_INTL_ENDPOINT ?? "http://localhost:3000";

export default command(
  {
    name: "login",
  },
  async () => {
    const app = express();
    app.use(express.json());

    await open(`${aiIntlEndpoint}/api/auth/signin`, {
      wait: true,
      newInstance: true,
    });

    app.post("/auth", async function (req, res) {
      const { token } = req.body;
      await setConfigs([["ACCESS_TOKEN", token]]);
      res.status(200);
      process.exit(0);
    });

    const server = await app.listen(3100);

    return;
  }
);
