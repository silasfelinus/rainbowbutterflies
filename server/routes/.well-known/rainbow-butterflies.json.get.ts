import { defineEventHandler } from 'h3'
import { rainbowAgentDiscovery } from '~~/utils/agentDiscovery'

export default defineEventHandler(() => rainbowAgentDiscovery)
