# Management Console Tech Debt Tracker

| Item | Impact | Next Action | Status |
| --- | --- | --- | --- |
| Initial route bundle size | Low | Locales and utility dependencies are split from the entry; retain the enforced 350 KiB per-chunk budget | Resolved |
| Missing trace-state fixtures | Medium | Add golden fixtures for complex run-event sequences and tool traces | Open |
| CI runtime median | Low | Record two additional representative successful CI runs to evaluate the below-10-minute median; the completed optimization plan records one 6m00s run | Open |
