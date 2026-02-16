import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export { createEnv } from "@t3-oss/env-core";
export { z };

export const createAppEnv = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
  },
});
