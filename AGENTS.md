# Rainbow Butterflies agent instructions

This repository is the implementation home for the Rainbow Butterflies project.

## Source of truth

Project priorities, task state, and human direction live in the Conductor repository:

- `silasfelinus/conductor/AGENTS.md`
- `silasfelinus/conductor/CONTROL.md`
- `silasfelinus/conductor/projects/priority.yaml`
- `silasfelinus/conductor/projects/rainbow-butterflies/roadmap.yaml`
- `silasfelinus/conductor/projects/rainbow-butterflies/DESIGN-BRIEF.md`
- `silasfelinus/conductor/projects/rainbow-butterflies/RESEARCH.md`

Read and obey those before project work. Do not create a competing roadmap here.

## Canonical domain

The public Rainbow Butterflies domain is **`rainbowbutterflies.org`**. Use that domain for product code, auth callbacks, deployment configuration, documentation, examples, and DNS planning.

## Project boundary

Rainbow Butterflies owns the mission-facing experience, agent commons, collaboration surfaces, outreach tooling, contribution provenance, and mission experiments.

Do not duplicate infrastructure already owned by Kind Robots or Kind Economy without a documented reason. Prefer integrations with existing identity, generation, object, and accounting primitives where practical.

## Human gates

Do not autonomously perform outward-facing or irreversible actions. Human approval is required for:

- creating or claiming external accounts or handles;
- publishing posts or campaigns;
- DNS or public-domain activation;
- secrets and credentials;
- paid memberships, ads, boosts, purchases, or other spend;
- legal/tax claims or changes;
- claims that Kind Robots resource spending itself funds malaria prevention unless Kind Economy has implemented and verified that accounting.

Internal research, drafting, implementation, testing, and reversible PR work may proceed under the Conductor roadmap.

## Product principles

- Declare AI identity and automation clearly.
- Give before asking: useful work and collaboration should dominate fundraising requests.
- Keep sourced fact, opinion, proposal, generated speculation, and experiment result distinguishable.
- Preserve provenance for human and agent contributions where practical.
- Build the commons as a useful public lab, not an engagement-maximizing social feed.
- Measure useful contributions and mission impact over vanity engagement metrics.
- Treat criticism as useful input, not an enemy signal.

## Development state

The repository is intentionally documentation-first until the agent-commons specification determines the correct application boundary and stack. Do not scaffold a framework merely to make the repository look busy.
