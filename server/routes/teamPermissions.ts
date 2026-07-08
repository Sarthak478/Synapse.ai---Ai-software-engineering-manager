type TeamMemberLike = {
  id: string;
  isHead?: boolean;
};

type PermissionResult = {
  allowed: boolean;
  reason?: string;
};

function countHeads(developers: TeamMemberLike[]) {
  return developers.filter((dev) => dev.isHead === true).length;
}

function isHead(developers: TeamMemberLike[], devId: string) {
  return developers.find((dev) => dev.id === devId)?.isHead === true;
}

export function canDeleteDeveloper(
  developers: TeamMemberLike[],
  actorDevId: string,
  targetDevId: string
): PermissionResult {
  if (!isHead(developers, actorDevId)) {
    return { allowed: false, reason: "Only a Team Head can remove members." };
  }

  if (actorDevId === targetDevId) {
    return { allowed: false, reason: "A Team Head cannot remove their own active account." };
  }

  const targetDev = developers.find((dev) => dev.id === targetDevId);
  if (!targetDev) {
    return { allowed: false, reason: "Team member not found." };
  }

  if (targetDev.isHead === true && countHeads(developers) <= 1) {
    return { allowed: false, reason: "Assign another Team Head before removing the last Head." };
  }

  return { allowed: true };
}

export function canSetHeadPrivilege(
  developers: TeamMemberLike[],
  actorDevId: string,
  targetDevId: string,
  nextIsHead: boolean
): PermissionResult {
  if (!isHead(developers, actorDevId)) {
    return { allowed: false, reason: "Only a Team Head can change Head privileges." };
  }

  const targetDev = developers.find((dev) => dev.id === targetDevId);
  if (!targetDev) {
    return { allowed: false, reason: "Team member not found." };
  }

  if (actorDevId === targetDevId && nextIsHead === false) {
    return { allowed: false, reason: "Head privileges can only be revoked by another Team Head." };
  }

  if (targetDev.isHead === true && nextIsHead === false && countHeads(developers) <= 1) {
    return { allowed: false, reason: "Assign another Team Head before revoking the last Head." };
  }

  return { allowed: true };
}

export function hasAtLeastOneHead(developers: TeamMemberLike[]) {
  return countHeads(developers) > 0;
}
