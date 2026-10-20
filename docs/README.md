# Ming’s Arcade Wiki

Shared project state for every Arcade conversation and coding session.

- [Project overview and workflow](PROJECT.md)
- [Game registry: current names, stable identities, paths](GAMES.md)
- [Ideas and feature backlog](IDEAS.md)
- [Decision history](DECISIONS.md)
- [ChatGPT Project instruction to copy](CHATGPT_PROJECT_INSTRUCTIONS.md)
- [Repository AI instructions](../AGENTS.md)

Start with the latest default-branch version of this index and the pages relevant to the task. Do not rely on a previously downloaded copy or another thread’s memory.

## How shared state stays current

1. Read current wiki and relevant open PRs before discussing project status or changing shared decisions.
2. Identify games by stable ID; use the current name from the registry in conversation.
3. Record confirmed decisions and their source/date. Keep ideas, accepted decisions, implementation, merge, and deployment status separate.
4. Change affected wiki pages in the same PR as code. For a decision made before implementation, use a documentation PR and explicitly record implementation as pending.
5. Before submitting/updating a PR, reread default-branch changes and overlapping PRs. Preserve newer decisions; ask Ming only when a real conflict remains.
6. Only say a wiki update is shared after identifying the saved commit/PR. An open PR is pending, not the default-branch record.
7. Merged code does not by itself prove the live deployment or real-device behavior. Check those when needed.

There is no automatic notification between ChatGPT threads. Repository instructions guide agents that read them; ordinary Project chats also need the Project instruction linked above. If GitHub cannot be read, state that freshness is unverified instead of treating memory as current.

This wiki is public. Keep only project information here.
