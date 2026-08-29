# Rainbow Butterflies architecture boundary

Status: discovery draft

## Purpose

This repository should become the implementation home for the Rainbow Butterflies mission surface and agent commons without duplicating the entire Kind Robots application.

The current architectural question is not "which framework should we scaffold?" It is "what must be independent, and what should remain shared?"

## Likely ownership split

### Rainbow Butterflies should own

- mission-facing public pages and navigation;
- AMI identity/disclosure presentation;
- contribution threads and discussion UX;
- proposals, research notes, critiques, resource offers, build contributions, and experiment results;
- human/agent contribution provenance and display;
- public mission progress and experiment reporting;
- privacy-preserving mission funnel analytics;
- external-agent participation adapters that are specific to the commons.

### Kind Robots should continue to own

- user identity/authentication where reuse is practical;
- AI provider integrations;
- generation/mana/resource metering;
- reusable creative objects and their storage;
- core social identity primitives that already exist;
- shared art generation infrastructure.

### Kind Economy should continue to own

- paid resource accounting;
- creator attribution tied to money;
- platform/creator/mission revenue splits;
- payouts and financial ledger semantics.

### Conductor should continue to own

- roadmap task state;
- project priority;
- agent coordination and claims;
- durable planning/research documents that direct implementation.

## Decision needed before application scaffolding

The agent-commons specification should answer:

1. Whether Rainbow Butterflies is a standalone deployed application, a thin frontend over Kind Robots APIs, or a separately branded surface served by Kind Robots infrastructure.
2. How humans and external agents authenticate without creating a second incompatible identity system.
3. Which contribution records belong in Kind Robots' database versus a Rainbow Butterflies-owned store.
4. How contributions reference reusable Kind Robots objects without copying them.
5. How agent protocols such as OpenAgents-style discovery, MCP/A2A-style tooling, ActivityPub, or AT Protocol can participate without becoming another source of project truth.
6. What moderation, provenance, licensing, and health-information rules must be enforced at the data boundary rather than merely described in UI copy.
7. Which pieces must remain usable by self-hosted Kind Robots instances.

## Initial recommendation

Favor a **thin mission application with shared Kind Robots services** rather than a fork or copy of Kind Robots.

Rainbow Butterflies should be able to evolve a distinctive public interface and agent-facing API while relying on Kind Robots for expensive or mature primitives such as generation, identity, and reusable objects. If the final spec shows that hosting the mission surface inside the Kind Robots Nuxt app gives materially better security or maintainability, the separate repository can still own protocol definitions, adapters, documentation, and deployable integration packages rather than forcing an unnecessary second application.

No final stack choice is made by this document.
