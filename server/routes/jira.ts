import { Router } from "express";

const router = Router();

// Obtain server environment configuration for Jira (for read-only UI indicators)
router.get("/env-config", (req, res) => {
  res.json({
    hasEnvConfig: !!(process.env.JIRA_DOMAIN && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN),
    envDomain: process.env.JIRA_DOMAIN || "",
    envEmail: process.env.JIRA_EMAIL || "",
    envProjectKey: process.env.JIRA_PROJECT_KEY || ""
  });
});

// Create a Jira Issue (supports simulated sandbox fallback)
router.post("/create-issue", async (req, res) => {
  const { domain, email, apiToken, projectKey, title, description } = req.body;

  const jiraDomain = domain || process.env.JIRA_DOMAIN;
  const jiraEmail = email || process.env.JIRA_EMAIL;
  const jiraToken = apiToken || process.env.JIRA_API_TOKEN;
  const jiraProject = projectKey || process.env.JIRA_PROJECT_KEY || "PROJ";

  if (!jiraDomain || !jiraEmail || !jiraToken) {
    // Elegant simulation when credentials are not filled yet
    const simulatedKey = `${jiraProject}-${Math.floor(100 + Math.random() * 900)}`;
    return res.json({
      success: true,
      simulated: true,
      key: simulatedKey,
      url: `https://sandbox.atlassian.net/browse/${simulatedKey}`,
      message: "Sandbox Mode: Simulated ticketing creation successful. Configure credentials in Settings for real connection."
    });
  }

  const cleanDomain = jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${cleanDomain}/rest/api/3/issue`;
  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64");

  const issueData = {
    fields: {
      project: {
        key: jiraProject
      },
      summary: title,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: description || "Created via Synapse AI Suite."
              }
            ]
          }
        ]
      },
      issuetype: {
        name: "Task"
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(issueData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Jira API Response Code ${response.status}`,
        details: errorText
      });
    }

    const data: any = await response.json();
    return res.json({
      success: true,
      simulated: false,
      key: data.key,
      id: data.id,
      url: `https://${cleanDomain}/browse/${data.key}`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Jira Server Connection Refused: ${err.message}`
    });
  }
});

// Fetch Jira Issues for a project (supports simulated sandbox fallback)
router.post("/fetch-issues", async (req, res) => {
  const { domain, email, apiToken, projectKey } = req.body;

  const jiraDomain = domain || process.env.JIRA_DOMAIN;
  const jiraEmail = email || process.env.JIRA_EMAIL;
  const jiraToken = apiToken || process.env.JIRA_API_TOKEN;
  const jiraProject = projectKey || process.env.JIRA_PROJECT_KEY || "PROJ";

  if (!jiraDomain || !jiraEmail || !jiraToken) {
    // Beautiful sandbox demo sync data
    const simulatedIssues = [
      {
        id: `jira-mock-1`,
        key: `${jiraProject}-101`,
        title: `[${jiraProject}-101] Implement webhook security checks on payload validation`,
        description: "Verify cryptography of incoming Stripe callbacks to shield the ordering gateway from malicious replay injection vectors.",
        priority: "critical",
        storyPoints: 8,
        status: "todo",
        url: `https://sandbox.atlassian.net/browse/${jiraProject}-101`
      },
      {
        id: `jira-mock-2`,
        key: `${jiraProject}-102`,
        title: `[${jiraProject}-102] Refactor async-await authentication guards`,
        description: "Convert double-nested passport promise handlers into flat ES Module typescript structures inside server core middleware layers.",
        priority: "medium",
        storyPoints: 2,
        status: "todo",
        url: `https://sandbox.atlassian.net/browse/${jiraProject}-102`
      },
      {
        id: `jira-mock-3`,
        key: `${jiraProject}-103`,
        title: `[${jiraProject}-103] Render beautiful espresso coffee layouts in UI`,
        description: "Adopt soft wood-grained espresso palettes with high-contrast buttons, smooth transition triggers, and glowing teal-accent indicators.",
        priority: "high",
        storyPoints: 3,
        status: "done",
        url: `https://sandbox.atlassian.net/browse/${jiraProject}-103`
      }
    ];

    return res.json({
      success: true,
      simulated: true,
      issues: simulatedIssues
    });
  }

  const cleanDomain = jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const jql = encodeURIComponent(`project=${jiraProject} ORDER BY created DESC`);
  const url = `https://${cleanDomain}/rest/api/3/search?jql=${jql}&maxResults=15`;
  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Jira API returned error code ${response.status}`,
        details: errorText
      });
    }

    const data: any = await response.json();
    const issues = (data.issues || []).map((issue: any) => {
      // Find story points custom fields
      let storyPoints = 3;
      const customFieldKeys = Object.keys(issue.fields).filter(k => k.startsWith("customfield_"));
      for (const k of customFieldKeys) {
        if (typeof issue.fields[k] === "number") {
          storyPoints = issue.fields[k];
          break;
        }
      }

      // Map Jira status to our lanes
      const jiraStatus = (issue.fields.status?.name || "To Do").toLowerCase();
      let status: "todo" | "in_progress" | "review" | "done" = "todo";
      if (jiraStatus.includes("progress") || jiraStatus.includes("active")) {
        status = "in_progress";
      } else if (jiraStatus.includes("review") || jiraStatus.includes("audit")) {
        status = "review";
      } else if (jiraStatus.includes("done") || jiraStatus.includes("closed") || jiraStatus.includes("resolved")) {
        status = "done";
      }

      // Map Jira priority
      const jiraPriority = (issue.fields.priority?.name || "Medium").toLowerCase();
      let priority: "low" | "medium" | "high" | "critical" = "medium";
      if (jiraPriority.includes("crit") || jiraPriority.includes("block")) {
        priority = "critical";
      } else if (jiraPriority.includes("high") || jiraPriority.includes("major")) {
        priority = "high";
      } else if (jiraPriority.includes("low") || jiraPriority.includes("minor")) {
        priority = "low";
      }

      const desc = issue.fields.description?.content?.[0]?.content?.[0]?.text || 
                   issue.fields.description || 
                   "Imported from Jira Cloud Ticket.";

      return {
        id: `jira-${issue.id}`,
        key: issue.key,
        title: `[${issue.key}] ${issue.fields.summary}`,
        description: desc,
        priority,
        storyPoints,
        status,
        url: `https://${cleanDomain}/browse/${issue.key}`
      };
    });

    return res.json({
      success: true,
      simulated: false,
      issues
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to query Jira: ${err.message}`
    });
  }
});

export default router;
