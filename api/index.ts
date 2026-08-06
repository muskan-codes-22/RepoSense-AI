import mod from "./server.cjs";

export const config = {
  maxDuration: 60,
};

export default mod.default ?? mod;
