# Project-Specific Architecture & Rules

## 1. Modular Folder Structure
* Maintain a modular and feature-driven folder structure.
* Separate global/generic UI building blocks (`./src/components/ui`) from feature-specific logic.
* Group components, hooks, and local state by feature (e.g., inside `./src/features/[feature-name]`) to encapsulate logic and maintain scalability.

## 2. UI Components & shadcn/ui
* **Location:** `./src/components/ui`
* Always check for and utilize existing shadcn/ui components before creating new custom components.
* Prefer utilizing existing hooks from the shadcn ecosystem (e.g., `use-toast`, `use-form`) for standard UI behaviors.
* When extending or overriding shadcn component styles, always use the `cn()` utility to prevent Tailwind class conflicts.

## 3. Server Actions & Caching
* Use Server Actions for both data fetching (`get`) and data mutations (`mutate`).
* **Caching for 'get' actions:** Implement caching for data-fetching Server Actions using Next.js caching mechanisms (such as `unstable_cache` with tags).
* **Centralized Cache Keys:** All cache keys and tags MUST be defined in `./src/constants/cache-key.ts`. Never hardcode cache key strings inside actions. This ensures easy invalidation (e.g., via `revalidateTag`) from a single source of truth.

## 4. Environment Variables & Constants
* **Location:** `./src/constants/index.ts`
* NEVER access `process.env.YOUR_VARIABLE` directly inside UI components, hooks, or business logic. 
* All environment variables and global constants MUST be recalled, validated, and exported from `./src/constants/index.ts`.

## 5. State Management
* **Tool:** React Context.
* Use React Context for shared or global state management within features or the application.
* Isolate context providers to the lowest possible component tree level to prevent unnecessary re-renders.

## 6. Styling (Tailwind CSS v4)
* Use Tailwind CSS v4 standard utility classes and rely on the CSS-first configuration approach.
* Respect the CSS variables defined by the shadcn/ui setup for theming and color consistency.

## 7. Database & ORM (Prisma)
* Ensure the Prisma Client is instantiated using a singleton pattern in a dedicated utility file to prevent exhausting database connections during development hot-reloads.

## 8. Verification & General Guidelines
* **TypeScript:** Use strict typing. Do not use `any`.
* **Build Verification:** Always run `npm run build` after making structural changes or modifying server actions/caching logic to verify the build integrity and catch errors early.