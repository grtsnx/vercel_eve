import { defineAgent } from "eve";
import { mayarModels } from "../../lib/model.js";

export default defineAgent({
  description:
    "Writes concise user-facing responses for normal chat, refusals, approval checkpoints, and final build summaries. Tool input must contain only message.",
  model: mayarModels.conversation,
});
