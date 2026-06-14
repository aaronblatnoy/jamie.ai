# lifecycle/ — the to-do → done home

One place for work as it moves through its lifecycle.

```
lifecycle/
├── pending/          NOT yet executed (to-do)
│   ├── workflows/    staged runnable workflow specs
│   │                 — tell Claude "run the <name>"; it appears in /workflows
│   └── plans/        pending phase / buildout plans, awaiting a build session
└── archive/          DONE / frozen — executed plans + audit reports. Treat as immutable.
    ├── plans/
    └── audits/
```

**Lifecycle:** a plan starts in `pending/plans/`. A staged workflow starts in `pending/workflows/`.
Once executed/built, its plan moves to `archive/plans/` (and any run report to `archive/audits/`).

**pending/ = to-do. archive/ = done.**
