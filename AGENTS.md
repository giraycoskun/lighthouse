# Agent Instructions

## Local development services

Assume the user owns and manages any local development services that are already
running. Before starting a server, inspect the expected ports and reuse the
user's existing service when it is available. Do not start duplicate or
long-lived background services unless the task requires an isolated instance.

If an isolated service is required for testing, run it on a distinct port with
clearly temporary data, keep track of the process, and stop it before handing
the task back to the user. Never stop or restart a service that the user
started. In the final response, mention any temporary services started and
confirm that they were shut down.
