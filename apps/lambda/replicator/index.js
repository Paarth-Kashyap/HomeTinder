import { runReplication } from "./replicator.js";

export const handler = async () => {
  try {
    await runReplication();
    return { statusCode: 200, body: "TREB sync completed" };
  } catch (err) {
    console.error("Replication failed:", err);
    return { statusCode: 500, body: "Error during replication" };
  }
};
