"use server";

// Re-export the scenario server actions from the parent route's shared module.
// `export { ... } from "..."` alone would make this file a regular module
// (not a server module), and Turbopack would then complain the named exports
// don't exist for client/SSR imports. Aggregating them here keeps the contract
// that an `actions.ts` file inside an App-Router directory is a server module.

import {
  createScenarioAction,
  deleteScenarioAction,
  updateScenarioAction,
  updateScenarios,
} from "../actions";

export { createScenarioAction, deleteScenarioAction, updateScenarioAction, updateScenarios };
