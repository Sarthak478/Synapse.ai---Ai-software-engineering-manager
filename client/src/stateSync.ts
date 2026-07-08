import { defaultProjectData } from "./defaultProjectData";

export function getProjectDataKey(workspaceId: string | null, devId: string | null) {
  if (!workspaceId || !devId) return "";
  return `synapse-project-data-${workspaceId}-${devId}`;
}

export function loadLocalProjectData(workspaceId: string | null, devId: string | null) {
  if (!workspaceId || !devId) return { ...defaultProjectData };

  if (localStorage.getItem("synapse-project-data")) {
    localStorage.removeItem("synapse-project-data");
  }
  if (localStorage.getItem("synapse-shared-gemini-key")) {
    localStorage.removeItem("synapse-shared-gemini-key");
  }

  const stored = localStorage.getItem(getProjectDataKey(workspaceId, devId));
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored project data:", e);
    }
  }

  return { ...defaultProjectData };
}

export function buildLocalProjectData(state: any) {
  return {
    tasks: state.tasks || [],
    codeReviews: state.codeReviews || [],
    standups: state.standups || [],
    chats: state.chats || [],
    sprints: state.sprints || []
  };
}

export function saveLocalProjectData(workspaceId: string | null, devId: string | null, state: any) {
  if (!workspaceId || !devId) return;
  localStorage.setItem(getProjectDataKey(workspaceId, devId), JSON.stringify(buildLocalProjectData(state)));
}

export function mergeServerAndLocalState(serverState: any, localProject: any) {
  const { repositories: _ignoredRepositories, ...localOnlyProjectState } = localProject || {};

  return {
    ...defaultProjectData,
    ...serverState,
    ...localOnlyProjectState,
    repositories: Array.isArray(serverState?.repositories) ? serverState.repositories : [],
    settings: {
      ...serverState?.settings,
      hasGeminiApiKey: serverState?.settings?.hasGeminiApiKey
    }
  };
}
