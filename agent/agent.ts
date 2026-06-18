import { defineAgent } from "eve";
import { mayarModels } from "./lib/model.js";

export default defineAgent({
  model: mayarModels.root,
});
