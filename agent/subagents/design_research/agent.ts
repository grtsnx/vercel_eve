import { defineAgent } from "eve";
import { mayarModels } from "../../lib/model.js";

export default defineAgent({
  description:
    "Creates an approval-ready design brief before code is written. Tool input must contain only message.",
  model: mayarModels.designResearch,
});
