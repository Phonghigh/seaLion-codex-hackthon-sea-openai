# Frontend base

Two independent Next.js App Router applications share UI primitives, Zod schemas,
and deterministic fixture logic. This phase uses the Sites local-only workflow
and the repository's Impeccable design guidance.

## Run

Use Node.js 20.9+ and pnpm 10.28.2 (pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

- Customer: <http://127.0.0.1:3000>
- Customer Service: <http://127.0.0.1:3001>
- CS scenario controls: <http://127.0.0.1:3001/?demo=1>

Run one app with `pnpm dev:customer` or `pnpm dev:cs`. No environment values,
API credentials, database, or external services are required. Both apps start
with the returning-customer fixture. Refresh restores it.

## Scope

The user's implementation instruction excludes API discovery and integration.
Accordingly, the shared HTTP fixture service, cross-site synchronization and API
client described in the earlier plan are deferred. Each browser page owns its
own in-memory state. Sending from Customer does not update CS, and approving in
CS does not send anything to Customer. UI labels disclose this limitation.

Customer supports local messages, sample attachment selection/removal/preview,
new conversations, prior conversations and reset. CS supports inbox filtering,
explicit case linking, first-case creation, history and evidence, source-labelled
facts, changed shipment status, an editable reply with approval/rejection, and a
separate escalation approval. Demo controls load first contact, advance shipment
status, load Demo 2, simulate the second attachment and reset. P2/P3 are deferred.
Photos have not been supplied: attachment tiles are labelled sample references,
and their previews explicitly say that no actual image was uploaded or verified.

## Try the flow

1. Open CS with `?demo=1`. Link CONV2 to CS001.
2. Review the changed parcel status and the single missing question. Use the
   suggested reply, edit it if desired, then approve and send.
3. Simulate “Parcel arrived without the cap”. Both evidence references appear.
4. Approve escalation. The case becomes Waiting on ops and records OPS001.
5. Use the updated suggested reply and approve it separately.
6. Use First contact to try case creation; Reset clears the local CS fixture.

Suggestions are deterministic scenario fixtures, not language-model output.
Free-form messages are stored but do not receive semantic interpretation.

## Structure

| Location | Responsibility |
| --- | --- |
| `apps/customer/app` | Customer root route, metadata and layout |
| `apps/customer/components` | Chat, composer, history and evidence preview |
| `apps/customer-service/app` | CS root route and optional demo controls flag |
| `apps/customer-service/components` | Inbox/thread workspace and case panel |
| `packages/ui` | Shared tokens, official shadcn components, cobalt/navy tokens and connected-path brand assets |
| `packages/contracts` | Zod domain and local-command schemas |
| `packages/demo` | Pure fixture transitions, suggestions and async in-memory React boundary |

## Build and validation

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Each app builds independently with `pnpm --filter @seapilot/customer build` or
`pnpm --filter @seapilot/customer-service build`. Production builds explicitly use
Next.js Webpack: Turbopack retained a sandbox-denied CSS worker failure during
verification. Dev uses the normal Next.js builder. There is no external font fetch.

For production preview, run `pnpm --filter @seapilot/customer start` and
`pnpm --filter @seapilot/customer-service start` after building. Keep two separate
deployment projects rooted at the respective app directories with workspace
packages available. No hosting project was registered and nothing was deployed.

Before connecting a backend, agree customer-safe reads, conversation creation,
message/evidence writes, case matching/linking, versioned suggestions, approval
and escalation persistence, authorization, and reset/clock semantics. No endpoints
were probed or inferred in this phase.

See [validation and review results](FRONTEND-QA.md) for completed checks and
remaining browser/integration verification.

The component migration and original hackathon-inspired identity are documented
in [BRANDING.md](BRANDING.md). All app controls use shared shadcn components; native
HTML remains for semantic document structure.
