export type ProviderSetupStage = {
  label: string
  detail: string
}

export type ProviderGuide = {
  id: string
  name: string
  badge: string
  automation: string
  intro: string
  visualPath: ProviderSetupStage[]
  steps: string[]
  warning: string
  sourceLabel: string
  source: string
  extraSourceLabel: string
  extraSource: string
}

export const checkInExample = `curl https://kindrobots.org/api/v1/agent/check-in \\
  -X POST \\
  -H "Authorization: Bearer $KIND_ROBOTS_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "working",
    "summary": "Checked the current task, made progress, and found no blocker."
  }'`

export const providers: ProviderGuide[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    badge: 'Full MCP writes verified on supported workspaces',
    automation: 'Custom MCP app for direct check-in; Scheduled remains a separate boundary',
    intro:
      'OpenAI now documents full custom MCP apps with write actions for ChatGPT Business, Enterprise, and Edu on the web. OpenAI also documents Scheduled using supported apps, but does not explicitly promise that a custom full-MCP app is available for unattended Scheduled execution, so this guide keeps those two capabilities separate.',
    visualPath: [
      { label: 'Workspace', detail: 'Enable developer mode / custom MCP apps' },
      { label: 'Connect', detail: 'Point the app at Rainbow’s public MCP URL' },
      { label: 'Secret', detail: 'Authenticate in app configuration, never the prompt' },
      { label: 'Verify', detail: 'Call identity, then one check-in' },
      { label: 'Schedule', detail: 'Keep Scheduled and custom-MCP delivery separate for now' },
    ],
    steps: [
      'Create or select your Rainbow AgentProfile. Grant agent:checkin; add profile:read only if you also want the identity tool.',
      'On a supported workspace, have an admin or authorized developer create a custom MCP app pointed at https://kindrobots.org/api/v1/mcp and complete authentication in the app configuration rather than in chat instructions.',
      'Keep the app narrowed to Rainbow’s two tools: rainbow_agent_identity and rainbow_check_in. Use the identity tool first when profile:read is present, then test one check-in.',
      'For ChatGPT Scheduled, keep the AgentProfile credential out of the task instructions. Until OpenAI explicitly documents custom full-MCP apps as an unattended Scheduled target, use Scheduled for the recurring reasoning and a separately reviewed secret-bearing delivery path for the heartbeat.',
    ],
    warning:
      'Full MCP write apps are currently a Business, Enterprise, and Edu feature, not a generic promise for every ChatGPT plan. Agent mode also does not use custom apps. Never paste the AgentProfile key into a Scheduled task, shared task link, project instruction, or chat.',
    sourceLabel: 'OpenAI: Developer mode and MCP apps in ChatGPT',
    source: 'https://help.openai.com/en/articles/12584461',
    extraSourceLabel: 'OpenAI: Scheduled tasks in ChatGPT',
    extraSource: 'https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt',
  },
  {
    id: 'claude',
    name: 'Claude',
    badge: 'Fully unattended MCP path verified',
    automation: 'Managed Agents + Rainbow MCP + static-bearer vault + schedule',
    intro:
      'Anthropic Managed Agents can connect directly to a remote MCP server, match that server URL to a Vault credential, and run the agent from a scheduled deployment. This is now a direct path to Rainbow’s real MCP endpoint rather than a generic HTTP-helper workaround.',
    visualPath: [
      { label: 'Agent', detail: 'Declare Rainbow as a remote MCP server' },
      { label: 'Vault', detail: 'Store the scoped key as static_bearer' },
      { label: 'Session', detail: 'Attach the vault to the agent run' },
      { label: 'Verify', detail: 'Test identity and one heartbeat' },
      { label: 'Deploy', detail: 'Add the cron schedule after the manual run is clean' },
    ],
    steps: [
      'Create or select your Rainbow AgentProfile. Grant agent:checkin; add profile:read if the agent should call rainbow_agent_identity too.',
      'Declare https://kindrobots.org/api/v1/mcp as the Managed Agent’s remote MCP server and add its MCP toolset.',
      'Store the AgentProfile key in an Anthropic Vault as a static_bearer credential whose mcp_server_url matches the Rainbow MCP endpoint. Attach that vault when sessions run.',
      'Test the agent manually with rainbow_agent_identity when available and rainbow_check_in. The check-in returns the same queued human notes and resolved attention requests as REST.',
      'Create a scheduled deployment only after the manual run is reliable. Keep the deployment’s MCP tool permissions limited to the two Rainbow tools.',
    ],
    warning:
      'Do not put the AgentProfile key in the reusable agent definition or prompt. Managed Agents separates the MCP server declaration from session authentication specifically so the secret can remain in the Vault.',
    sourceLabel: 'Anthropic: Managed Agents MCP connector',
    source: 'https://platform.claude.com/docs/en/managed-agents/mcp-connector',
    extraSourceLabel: 'Anthropic: Scheduled deployments',
    extraSource: 'https://platform.claude.com/docs/en/managed-agents/scheduled-deployments',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    badge: 'Remote MCP client verified',
    automation: 'Gemini CLI → Rainbow MCP; consumer scheduler remains separate',
    intro:
      'Gemini CLI documents remote HTTP MCP servers, custom HTTP headers, tool allowlists, and confirmation controls. Gemini Apps separately supports recurring Scheduled actions, but Google does not document its consumer scheduler as a generic bearer-authenticated MCP runner.',
    visualPath: [
      { label: 'CLI', detail: 'Add Rainbow as an HTTP MCP server' },
      { label: 'Secret', detail: 'Supply Authorization from trusted local handling' },
      { label: 'Allowlist', detail: 'Include only Rainbow’s two MCP tools' },
      { label: 'Verify', detail: 'Use /mcp and run one heartbeat' },
      { label: 'Schedule', detail: 'Treat Gemini Apps Scheduled as a separate surface' },
    ],
    steps: [
      'Create or select your Rainbow AgentProfile. Grant agent:checkin; add profile:read only if you need rainbow_agent_identity.',
      'Configure https://kindrobots.org/api/v1/mcp as an HTTP MCP server in Gemini CLI and supply the Authorization header from trusted local secret handling. Do not commit an expanded credential into project settings.',
      'Use includeTools to allow only rainbow_agent_identity and rainbow_check_in, and leave trust disabled until you have verified the server and tool behavior.',
      'Run one identity check when permitted and one heartbeat. The MCP heartbeat uses the same status vocabulary, 5,000-character summary cap, rate limit, and two-way human-note delivery as REST.',
      'If you also use Gemini Apps Scheduled actions, treat the consumer scheduler and the secret-bearing CLI/MCP runtime as separate boundaries unless Google documents a supported connection joining them.',
    ],
    warning:
      'Scheduled actions are real and Gemini CLI MCP is real. Arbitrary bearer-authenticated MCP execution from the Gemini Apps scheduler is not verified here, so do not collapse those two products into an invented feature.',
    sourceLabel: 'Google: MCP servers with Gemini CLI',
    source: 'https://geminicli.com/docs/tools/mcp-server/',
    extraSourceLabel: 'Google: Schedule actions in Gemini Apps',
    extraSource: 'https://support.google.com/gemini/answer/16316416?hl=en',
  },
  {
    id: 'grok',
    name: 'Grok',
    badge: 'Custom remote MCP connectors verified',
    automation: 'Rainbow MCP connector + Grok Bot routine, when connector auth fits',
    intro:
      'xAI documents custom MCP connectors that take a public MCP URL, perform required authentication, and discover the server’s tools. Grok Bot routines can then repeat a reliable workflow. Rainbow now provides that narrow public MCP URL directly.',
    visualPath: [
      { label: 'Connector', detail: 'Choose Custom and enter Rainbow’s MCP URL' },
      { label: 'Auth', detail: 'Complete connector authentication if bearer fits' },
      { label: 'Verify', detail: 'Test the two discovered Rainbow tools' },
      { label: 'Skill', detail: 'Save the reliable heartbeat workflow' },
      { label: 'Routine', detail: 'Schedule it and inspect run history' },
    ],
    steps: [
      'Create or select your Rainbow AgentProfile. Grant agent:checkin; add profile:read only if you want the identity tool.',
      'Add https://kindrobots.org/api/v1/mcp as a custom Grok MCP connector. Rainbow exposes only rainbow_agent_identity and rainbow_check_in on this bridge.',
      'Complete authentication in the connector setup if your Grok account’s custom-connector flow can send the AgentProfile bearer credential. If that auth shape is unavailable, stop there and use a separately reviewed secret-bearing shim rather than placing the key in Bot instructions.',
      'Test one normal Bot task before automating it. Then save the reliable process as a skill and create a routine on the cadence you want.',
      'Review routine history and keep consequential actions behind approval. A heartbeat reports state and receives liaison notes; it does not widen the Bot’s permissions.',
    ],
    warning:
      'xAI documents required authentication for custom MCP connectors but does not make every credential shape a universal promise. The AgentProfile key belongs in connector authentication or a reviewed secret boundary, never in a Bot prompt, URL, or shared computer state.',
    sourceLabel: 'xAI: Custom MCP connectors',
    source: 'https://docs.x.ai/grok/connectors',
    extraSourceLabel: 'xAI: Skills and routines',
    extraSource: 'https://docs.x.ai/grok-bot/skills-routines-and-automations',
  },
]
