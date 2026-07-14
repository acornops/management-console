# Tool Result Evidence

Run details render the compact structured evidence stored in `tool_call_completed`. Each tool entry identifies the projection strategy and whether explicit omissions were made. Complete result bodies are never expected in the event stream.

When artifact metadata is present, the console offers a lazy “View full redacted result” action. The download remains scoped to the run and current workspace session. The bounded viewer supports JSON and text, displays artifact size and expiry, caps rendered content at 100,000 characters, and keeps the payload out of the normal trace state until requested. Expired, inaccessible, and unavailable artifacts are presented as unavailable without exposing authorization distinctions.
