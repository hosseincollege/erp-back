# ERP Backend Agent Instructions

- This repository is the ERP backend only. Treat Rahyar as a separate product and do not sync ERP backend changes unless cross-product work is explicitly requested.
- ERP must not expose or include Rahcom. Remove ERP Rahcom controllers, providers, routes, and module setup when carrying out the product split, preserving unrelated modules and relational integrity.
- Keep ERP API configuration, deployment settings, secrets, database, and migration history specific to ERP. Never point them at Rahyar resources.
- Inspect Git status and diffs before editing and preserve unrelated work. Do not run database migrations or delete persisted records unless explicitly requested.
- The user will move project folders. Do not move or rename directories.
