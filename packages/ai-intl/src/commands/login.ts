import { command } from "cleye";
import open from "open";
import express from "express";
require("dotenv").config();

const aiIntlEndpoint = process.env.ENVIRONMENT ?? "http://localhost:3000";
export default command(
  {
    name: "login",
  },
  async () => {
    const app = express();
    app.use(express.json());

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
      console.log(req.headers.cookie);
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
