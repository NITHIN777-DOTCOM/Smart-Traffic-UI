/**
 * Regenerates src/data/mock/ppo_timeline.json, the ~10-minute PPO decision
 * timeline replayed by the mock data source.
 *
 *   node scripts/gen-ppo-timeline.ts      (Node 23.6+ runs .ts directly)
 */
import { writeFileSync } from 'node:fs'
import { adaptivePolicy, CLIP_S, CLIP_SEED, makeArrivals, simulate } from '../src/data/mock/sim.ts'

const sim = simulate(adaptivePolicy(), makeArrivals(CLIP_S, CLIP_SEED), CLIP_S, { seed: CLIP_SEED })
const out = new URL('../src/data/mock/ppo_timeline.json', import.meta.url)
writeFileSync(out, JSON.stringify(sim.decisions, null, 1) + '\n')
console.log(`wrote ${sim.decisions.length} decisions`)
