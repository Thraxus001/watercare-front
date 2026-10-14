# WaterCare frontend (React + TypeScript + Vite)

```bash
cp .env.example .env     # VITE_API_URL = where the FastAPI backend runs
npm install
npm run dev              # http://localhost:5173
npm run build            # type-checks and builds to dist/
```
The backend must allow this origin in its `CORS_ORIGINS` (default already includes http://localhost:5173).

Log in with the first admin from the backend's `.env`, then:
1. **Checklists** → add a machine type and its checks (radio / checkboxes, operation / maintenance).
2. **Machines** → add machines of that type.
3. **Users** → create accounts and tick what each person may do.
4. Technicians open a machine → **New checkup**. Everyone with access sees the result under the machine and in **Checkups**.

## Styling
Tailwind CSS v4 (via `@tailwindcss/vite`, no config file needed).
* Brand colours live in `src/styles.css` under `@theme` (`--color-brand`, `--color-brand-dark`, `--color-brand-light`) – change them there and the whole app follows (`bg-brand`, `text-brand`, …).
* Shared building blocks (`Button`, `Card`, `Field`, `Badge`, `inputCls`, `thCls`, …) are in `src/ui.tsx`; pages are plain Tailwind utility classes.
