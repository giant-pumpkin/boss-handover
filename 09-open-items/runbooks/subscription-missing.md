# Subscription not created after a job

Walk the lifecycle in [07-business-logic/subscription-lifecycle.md](../../07-business-logic/subscription-lifecycle.md):

1. Serial typed on the job (`fldIeKaFA33hZdtBG`)? Exactly as on the unit, no spaces.
2. `sync` ticked (`fldhTpGWsywbFFSU7`)? Automation `wflsW0LoP8zU6XBzv` run history shows it.
3. Unit with that serial exists in Inventory view `viwpizVY6u1Z6C4He`? If not, create it, untick and re-tick `sync`.
4. Job type maps to one of the four Inventory automations? Check run history of `wfl1YUiIjdVT3b66E` etc.
5. `subscription contract add new` set → `wflzWWNSCGdhtHrbv` ran?
