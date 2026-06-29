export interface Developer {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: string;
  skills: string[];
  workloadPoints: number;
  velocity: number;
  activeTaskId?: string;
  isHead?: boolean; // True if this developer is the Team Head / Administrator with special permissions
  userId?: string;  // Custom user login identifier (cannot be changed after creation)
  password?: string; // Custom login password (changeable by user)
  personalCredentials?: {
    jiraDomain?: string;
    apiToken?: string;
    githubToken?: string;
    customEndpoint?: string;
  };
  contributions: {
    commits: number;
    PRs: number;
    reviews: number;
  };
}

export interface SystemNode {
  id: string;
  label: string;
  type: 'frontend' | 'gateway' | 'service' | 'database';
  x: number;
  y: number;
}

export interface SystemEdge {
  from: string;
  to: string;
  label?: string;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  description: string;
  stack?: string[];
  modules?: {
    name: string;
    type: string;
    deps: string[];
  }[];
  apis?: {
    path: string;
    method: string;
    description: string;
  }[];
  databases?: string[];
  scanned: boolean;
  architecture?: {
    nodes: SystemNode[];
    edges: SystemEdge[];
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  storyPoints: number;
  assignedTo?: string; // Developer ID
  skillsRequired: string[];
  subtasks: {
    id: string;
    title: string;
    done: boolean;
  }[];
  blockedBy: string[]; // Task IDs
  estimatedMinutes?: number;
  jiraKey?: string;
  jiraUrl?: string;
  jiraSynced?: boolean;
}

export interface CodeIssue {
  type: 'smell' | 'vulnerability' | 'performance' | 'duplicate';
  severity: 'low' | 'medium' | 'high';
  message: string;
  line: number;
  suggestion: string;
}

export interface CodeReview {
  id: string;
  fileName: string;
  codeSnippet: string;
  qualityScore: number;
  issues: CodeIssue[];
  summary: string;
  optimizedCode: string;
  timestamp: string;
}

export interface StandupReport {
  id: string;
  developerId: string;
  date: string;
  yesterday: string[];
  today: string[];
  blockers: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface Sprint {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'planning';
  requirements: string;
  startDate: string;
  endDate: string;
  predictedCompletionProbability: number; // e.g., 85 for 85%
  delays: {
    taskId: string;
    risk: 'medium' | 'high';
    reason: string;
  }[];
  suggestions: string[];
}

export interface AppState {
  developers: Developer[];
  repositories: Repository[];
  tasks: Task[];
  codeReviews: CodeReview[];
  standups: StandupReport[];
  chats: ChatMessage[];
  sprints: Sprint[];
  settings?: {
    geminiApiKey: string;
    hasGeminiApiKey?: boolean;
    geminiApiKeyHash?: string;
  };
  jiraConfig?: {
    domain: string;
    email: string;
    apiToken: string;
    projectKey: string;
    connected: boolean;
  };
}
