export const defaultProjectData = {
  repositories: [],
  tasks: [],
  codeReviews: [],
  standups: [],
  chats: [
    {
      id: "chat-1",
      role: "model" as const,
      text: "Hello! I am your AI Software Engineering Manager. I can answer inquiries about current sprints, analyze bottlenecks, check if developers are overallocated, review complex file structures, or suggest daily summaries. What can I do for you today?",
      timestamp: new Date().toISOString()
    }
  ],
  sprints: []
};
