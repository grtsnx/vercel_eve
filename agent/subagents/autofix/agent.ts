import { defineAgent } from "eve";
import { mayarModels } from "../../lib/model.js";

export default defineAgent({
  description:
    "Repairs generated project files after sandbox failures or security findings. Tool input must contain only message.",
  model: mayarModels.autofix,
});
