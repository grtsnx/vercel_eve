import { defineAgent } from "eve";
import { mayarModels } from "../../lib/model.js";

export default defineAgent({
  description:
    "Classifies, filters, and routes user prompts before any other Mayar specialist runs. Tool input must contain only message.",
  model: mayarModels.intent,
});
