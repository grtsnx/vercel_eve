import { defineAgent } from "eve";
import { mayarModels } from "../../lib/model.js";

export default defineAgent({
  description:
    "Turns a safe build request into a concise internal handoff plan for design research. Tool input must contain only message.",
  model: mayarModels.orchestrator,
});
