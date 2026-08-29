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

## Deployment target

Rainbow Butterflies is intended to run on Silas's Unraid host through the same registry-first deployment pattern already used by Kind Robots:

- GitHub Actions builds the production container and publishes it to **GHCR** (`ghcr.io/silasfelinus/rainbowbutterflies`).
- Publish `latest` from `main` plus immutable `sha-<commit>` rollback tags.
- Target `linux/amd64` and Node 24 unless the application itself creates a documented reason to differ.
- The application listens on container port `3000` and joins the existing Unraid Docker network **`cafepurr`**.
- **Traefik** is the HTTPS reverse proxy in front of the container and routes the canonical `rainbowbutterflies.org` host to it.
- Normal updates should be image pulls/recreates from GHCR, not `git pull` plus a local production build on Alexandria.
- Keep runtime secrets out of the image. Use Docker/Unraid environment configuration or a mounted secret/env file only when the application actually needs one.
- Do not invent Traefik entrypoint or certificate-resolver names; those are installation-specific.

Building and publishing a container artifact is distinct from activating the public site. Production DNS, final Traefik/public routing activation, production secrets, and any irreversible GHCR visibility change remain explicit human-gated actions under Conductor.

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

The agent-commons architecture is specified and implementation has begun. Follow the current Conductor roadmap build spine rather than scaffolding parallel systems merely to make this repository look busy.
