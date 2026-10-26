# n8n gotchas

- **Execute Command nodes have no env vars.** Prefix every command with `source ~/.secrets && …` or the script fails with a missing-token error that looks like an auth problem.
- **SSH node vs Execute Command.** <!-- TODO: which pattern you settled on and why -->
- **Exports contain no credentials.** After importing a JSON, open each node with a credential and re-select it.
- **Webhook URLs change** if the instance's base URL changes. Airtable webhooks must then be re-registered.
<!-- TODO: add more -->
