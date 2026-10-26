# Workable

Observed 2026-10-26. Not an operations tool; it is HR, and my only touchpoint is an API pull.

| | |
| --- | --- |
| What we use it for | HR: employee directory, work calendar, files |
| URL | https://giant-pumpkin.workable.com |
| My access | employee level only (settings and integration pages return "not allowed" / 404) |
| Admin | <!-- TODO: HR / Seb --> |
| Plan / billing | not visible to me |

## Where it is wired in

- Airtable automation `wflUXV7YjUelVSGPk` "GET Request for Employees List from Workable" in the Data base pulls the employee list on the 1st of each month into `Employees` / `Terminated Employees` with a Workable API token. <!-- TODO: whose token, stored in the automation script -->
- The one-off script in [08-audits-and-analyses/workable-employees](../08-audits-and-analyses/workable-employees/) did the same by hand.
- The Data base's `Employees - Assign time segment` automation derives reporting periods from it.

## What breaks if it is cancelled

Headcount fields in the Data base stop updating; nothing operational.
