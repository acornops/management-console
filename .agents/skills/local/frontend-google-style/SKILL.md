---
name: acornops-frontend-google-style
description: Apply Google TypeScript/JavaScript style guidance to the React frontend and keep components, hooks, and service modules readable and consistent. Use when editing UI components, hooks, routing logic, or API integration modules.
---

# Inputs

- changed files in `src/pages`, `src/components`, `src/features`, `src/hooks`, and `src/services`
- route and API integration context
- existing TypeScript configuration

# Procedure

1. Use clear, intention-revealing names for components, hooks, and state variables.
2. Keep components focused and extract repeated logic into hooks or utility modules.
3. Maintain predictable data flow and avoid implicit side effects in rendering paths.
4. Keep API integration and UI presentation concerns separated.
5. Run frontend type/style validation commands.

# Outputs

- frontend style review notes
- readability and structure improvements
- check results (`npm run lint`, `npm run build`)
