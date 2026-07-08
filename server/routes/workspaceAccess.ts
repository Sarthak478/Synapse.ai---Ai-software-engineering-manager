import { Developer } from "../db/models.js";

export function resolveWorkspaceIdFromDeveloper(dev: any): string {
  if (dev?.workspaceId) {
    return dev.workspaceId;
  }

  const err: any = new Error("Access Denied: Session no longer maps to an active developer profile.");
  err.status = 403;
  throw err;
}

export async function getWorkspaceIdForDev(devId: string): Promise<string> {
  const dev = await Developer.findOne({ id: devId }).lean();
  return resolveWorkspaceIdFromDeveloper(dev);
}
