import { USE_MOCK } from "./config.js";
import { mock } from "./mock.js";
import { live } from "./live.js";

export const api = USE_MOCK ? mock : live;

export { USE_MOCK };
