"use client";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    window.close();
  });

  return (
    <div>
      <h1>Success</h1>
      <p>You can close this window.</p>
    </div>
  );
}
