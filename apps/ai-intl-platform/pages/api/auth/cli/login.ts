import { getToken } from "next-auth/jwt";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req, raw: true });
  try {
    await fetch("http://localhost:3100/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: token }),
    });
  } catch (error) {
    return res.redirect("/");
  }
}
