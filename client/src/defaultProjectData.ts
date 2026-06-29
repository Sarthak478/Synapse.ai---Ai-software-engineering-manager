export const defaultProjectData = {
  repositories: [
    {
      id: "repo-1",
      name: "SaaS E-Commerce Core",
      url: "https://github.com/techcorp/ecommerce-core",
      description: "Our primary SaaS microservice backend handling orders, cart orchestration, payment gateways (Stripe integration), and Redis caching layers.",
      scanned: true,
      stack: ["Node.js", "Express", "PostgreSQL", "Redis", "Stripe SDK", "Docker"],
      modules: [
        { name: "Auth Service", type: "authentication", deps: ["Gateway"] },
        { name: "Order Controller", type: "business-logic", deps: ["Auth Service", "Stripe Controller"] },
        { name: "Stripe Controller", type: "integration", deps: [] },
        { name: "Cache Manager", type: "db-proxy", deps: [] }
      ],
      apis: [
        { path: "/api/v1/auth/login", method: "POST", description: "Authenticate service users" },
        { path: "/api/v1/orders/checkout", method: "POST", description: "Initialize order and pay with Stripe" },
        { path: "/api/v1/orders/status/:id", method: "GET", description: "Retrieve precise state of an order" }
      ],
      databases: ["PostgreSQL (Relational)", "Redis Cache"],
      architecture: {
        nodes: [
          { id: "node-frontend", label: "Client Web App\n(React SPA)", type: "frontend", x: 100, y: 150 },
          { id: "node-gateway", label: "API Ingress Ingress\n(Nginx Ingress)", type: "gateway", x: 280, y: 150 },
          { id: "node-auth", label: "Auth microservice\n(Express/JWT)", type: "service", x: 480, y: 80 },
          { id: "node-orders", label: "Orders engine\n(NestJS Microservice)", type: "service", x: 480, y: 220 },
          { id: "node-postgres", label: "Main Database\n(PostgreSQL SQL)", type: "database", x: 700, y: 150 },
          { id: "node-redis", label: "In-memory cache\n(Redis)", type: "database", x: 700, y: 270 }
        ],
        edges: [
          { from: "node-frontend", to: "node-gateway", label: "HTTP REST" },
          { from: "node-gateway", to: "node-auth", label: "Internal Proxy" },
          { from: "node-gateway", to: "node-orders", label: "gRPC" },
          { from: "node-auth", to: "node-postgres", label: "SQL Queries" },
          { from: "node-orders", to: "node-postgres", label: "Drizzle ORM" },
          { from: "node-orders", to: "node-redis", label: "Key caching" }
        ]
      }
    }
  ],
  tasks: [
    {
      id: "task-1",
      title: "Design scalable API for bulk order checkout with Redis locks",
      description: "Implement a highly available check-out endpoint inside Order Controller. Block duplicate checkout calls using Redis locks to avoid double-charging customers during peak traffic, resolving payment race conditions.",
      priority: "high" as const,
      status: "in_progress" as const,
      storyPoints: 5,
      assignedTo: "dev-1",
      skillsRequired: ["React", "Express", "Redis"],
      blockedBy: [],
      subtasks: [
        { id: "sub-1-1", title: "Write distributed lock logic with redis-ioredis", done: true },
        { id: "sub-1-2", title: "Add lock wrap middleware onto POST checkout", done: false },
        { id: "sub-1-3", title: "Conduct heavy race condition unit tests", done: false }
      ]
    },
    {
      id: "task-2",
      title: "Audit Stripe checkout webhook signatures & verify credentials",
      description: "The Stripe integration lacks webhook verification. Construct high-confidence cryptographic signature verification on current billing route /api/v1/orders/stripe-webhook using express-raw-body parsers.",
      priority: "critical" as const,
      status: "in_progress" as const,
      storyPoints: 8,
      assignedTo: "dev-2",
      skillsRequired: ["Node.js", "Security audits"],
      blockedBy: [],
      subtasks: [
        { id: "sub-2-1", title: "Receive raw request streams safely on webhook port", done: true },
        { id: "sub-2-2", title: "Utilize stripe.webhooks.constructEvent properly", done: false },
        { id: "sub-2-3", title: "Create fallback mock controller logger", done: false }
      ]
    },
    {
      id: "task-3",
      title: "Responsive order progress visualizer & tracking timeline",
      description: "Generate a beautiful pixel-perfect order shipment stepper page on the frontend client. Use framer motion/react for smooth pulse transitions between packaging, shipping, and delivery.",
      priority: "medium" as const,
      status: "in_progress" as const,
      storyPoints: 3,
      assignedTo: "dev-3",
      skillsRequired: ["React", "Tailwind CSS", "animations"],
      blockedBy: ["task-1"],
      subtasks: [
        { id: "sub-3-1", title: "Construct responsive stepper layout skeleton", done: true },
        { id: "sub-3-2", title: "Connect real-time REST subscription hooks", done: false }
      ]
    },
    {
      id: "task-4",
      title: "Refactor old Auth middleware authentication helper logic",
      description: "De-clutter nested JWT promise callbacks. Convert legacy auth middlewares inside '/middleware/auth.js' to high-performing modern ESM TypeScript async-await functions.",
      priority: "low" as const,
      status: "todo" as const,
      storyPoints: 2,
      assignedTo: "dev-1",
      skillsRequired: ["Express", "System Architecture"],
      blockedBy: [],
      subtasks: [
        { id: "sub-4-1", title: "Rewrite callback syntax as direct try-catch", done: false }
      ]
    }
  ],
  codeReviews: [],
  standups: [
    {
      id: "standup-1",
      developerId: "dev-1",
      date: "2026-06-22",
      yesterday: ["Setup Redis instance and Docker compose environment configs", "Mapped API checkout endpoints for bulk execution"],
      today: ["Implementing distributed lock middleware in Order Controller", "Writing race condition payloads with Jest"],
      blockers: []
    },
    {
      id: "standup-2",
      developerId: "dev-2",
      date: "2026-06-22",
      yesterday: ["Configured Stripe API webhook routers", "Debugged raw-body parser options inside main express middleware"],
      today: ["Audit webhook signature decryption on sandbox payload", "Review Diana's latest secure test assertions"],
      blockers: []
    },
    {
      id: "standup-3",
      developerId: "dev-3",
      date: "2026-06-22",
      yesterday: ["Mocked layout views for tracking stepper UI", "Scoped motion frames inside order list"],
      today: ["Link React triggers to Order Controller", "Wait for checkout locked endpoints (Blocked by Alice)"],
      blockers: ["Checkout API payload needs to be stable (Alice working on task-1)"]
    }
  ],
  chats: [
    {
      id: "chat-1",
      role: "model" as const,
      text: "Hello! I am your AI Software Engineering Manager. I can answer inquiries about current sprints, analyze bottlenecks, check if developers are overallocated, review complex file structures, or suggest daily summaries. What can I do for you today?",
      timestamp: new Date().toISOString()
    }
  ],
  sprints: [
    {
      id: "sprint-1",
      name: "SaaS Launchpad - Sprint 1",
      status: "active" as const,
      requirements: "Secure the Stripe payment webhooks backend, optimize checkout concurrency rates via distributed Redis locks, and build the customer tracking visualizer in the React UI.",
      startDate: "2026-06-15",
      endDate: "2026-06-29",
      predictedCompletionProbability: 82,
      delays: [
        { taskId: "task-3", risk: "medium" as const, reason: "Blocked by task-1 (Distributed checking lock API done by Alice). Delay on order checkout setup directly moves stepper UI back." }
      ],
      suggestions: [
        "Re-route Charlie to assist Alice on checkout API testing to unblock task-3 quickly.",
        "Ensure Stripe webhook testing is mocked inside local test runner to run parallel to active Order Controller logic."
      ]
    }
  ]
};
