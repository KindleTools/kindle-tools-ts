Project Pruning & Simplification Plan
1. Analysis of Current State
The project kindle-tools-ts has evolved from a simple parser into a complex, "framework-like" architecture. While the code quality is high (clean architecture, strict types, comprehensive tooling), it suffers from Over-Engineering for its core purpose: a versatile NPM library.

Key Findings:

Architecture: Uses a heavy implementation of Domain-Driven Design (DDD) and Hexagonal Architecture (ports, adapters, domain, core, importers, exporters, utils, 
config
, etc.). This adds massive cognitive load for maintenance.
Plugin System: Contains a full-blown plugin engine with auto-discovery (plugins/discovery.ts), registry, and lifecycle hooks. This is excessive for a library that likely only needs a simple Strategy pattern.
Configuration: Includes cosmiconfig to load its own config from disk. As a library, it should simply accept an options object from the consumer.
Workbench: tests/workbench is a full Vite + React/Vanilla web app inside the repo.
Dependencies: Heavy dev-stack (Dual linting Biome + ESLint, strict separation of build targets).
2. Pruning Proposal (The "Slash" List)
To transform this into a "professional, sustainable, and finished" library, I propose the following reductions:

🛑 Remove
Plugin Auto-Discovery & Registry (src/plugins/)

Why: Libraries shouldn't scan node_modules.
Replacement: Allow users to pass custom Importer/Exporter classes/functions directly in the config.
Action: Delete src/plugins. Keep simple interfaces.
Internal Config Loading (src/config/)

Why: A library shouldn't decide how config is loaded from disk. That's the application's job.
Replacement: Export ParseOptions and ExportOptions interfaces.
Action: Delete src/config and cosmiconfig dependency.
Complex Error Logger Injection (src/errors/logger.ts)

Why: Overkill.
Replacement: Accept an optional logger object (debug, info, warn, error) in the options or emit events.
Tests Workbench (tests/workbench)

Why: Adds 30MB+ of node_modules and complexity.
Action: Move to a separate examples/web-app folder or a separate repo kindle-tools-web-demo. Remove from core tsconfig and metrics.
📉 Simplify
Architecture Flattening

Current: src/core, src/domain, src/ports, src/importers/core, src/exporters/core.
Proposed:
src/index.ts (Entry)
src/parser/ (The core parsing logic)
src/formats/ (Importers/Exporters)
src/types/
src/utils/
Action: Merge domain + core into lib or just root. Remove ports.
Linting Stack

Current: Biome AND ESLint.
Proposed: Stick to Biome for speed and simplicity. If ESLint is needed for specific rules (like neverthrow), evaluate if they are critical or if Biome Plugins can handle it (or just accept the tradeoff).
3. Implementation Steps
Phase 1: Pruning (Delete Code)
Uninstall cosmiconfig, iarna/toml, fastest-levenshtein.
Delete src/plugins, src/config.
Remove tests/workbench (or verify if we want to keep it as a simple "example").
Phase 2: Refactoring (Simplify)
Refactor processClippings to accept a simple options object.
Convert importers and exporters to simple functions or minimal classes without "Ports and Adapters" boilerplate.
Flatten folder structure.
Phase 3: Final Polish
Update README.md to reflect the strictly "Library" focus.
Ensure package.json exports are clean.
Finalize ROADMAP.md by marking "Grand Architecture" items as "Cancelled (Simplification)".



---


Project Analysis & Recommendations
1. Executive Summary
The project kindle-tools-ts has successfully achieved its functional goals (parsing, merging, exporting) but has adopted an architectural complexity disproportionate to its scope. What started as a library has evolved into a "framework" for clipping management.

Core Diagnosis:

Over-Engineering: The adoption of Hexagonal Architecture (Ports & Adapters), DDD (Domain Driven Design), and a runtime Plugin System is excessive for a library that primarily transforms text files.
Scope Creep: Features like "re-importing" (JSON/CSV importers), complex templating engines, and event-driven architecture have expanded the codebase significantly.
Maintainability Paradox: While intended to make the code maintainable, the deep nesting and fragmented logic (src/core, src/domain, src/ports, src/adapters) make it harder to navigate and "finish."
2. Detailed Technical Analysis
A. Architecture & Folder Structure
The current structure mimics a large-scale enterprise application:

src/
├── core/       # Business logic (Processor)
├── domain/     # DDD Entities (Clipping, Rules) - Good to keep, but can be simplified
├── ports/      # Interfaces (Hexagonal Arch) - Unnecessary abstraction layer
├── adapters/   # Implementations - Unnecessary separation
├── plugins/    # Runtime Registry - Overkill
└── ...
Critique: Separating "ports" (interfaces) from "exporters" (implementations) adds file hops without adding value for a library where implementations are likely bundled together.

B. The Plugin System
The PluginRegistry (src/plugins/registry.ts) includes:

Runtime registration with validation.
Event emitters (on, emit) for plugin lifecycle.
Singleton management with lazy loading.
Critique: Unless there is a concrete use case for 3rd party runtime plugins (e.g., users loading a separate NPM package to add a format), this is dead weight. If all plugins are internal (built-in exporters), a simple Factory pattern or just exporting the classes is sufficient.

C. Dependencies
Essential: date-fns, jszip, zod (if meaningful validation is needed).
Questionable:
handlebars: Adds weight. If only used for simple substitutions, could be replaced by a lighter interpolator. If users need full logic in templates, keep it.
cosmiconfig: Good for CLIs, but if this is primarily a library, standard options handling might suffice.
fastest-levenshtein: Used for fuzzy matching. Justified if that feature is critical.
neverthrow: Functional error handling. A stylistic choice, adds cognitive load to those unfamiliar with Result patterns in TS, but safe.
D. Features
Importers (JSON/CSV): The ability to re-import exported data seems to be a niche edge case. Unless users are using this tool as a database (export -> edit -> import -> export), this cycle adds complexity.
Workbench (GUI): Excellent for development/testing (tests/workbench). Should remain strict dev-tooling.
3. Recommendations for "Pruning"
To return to a "versatile, universal, and professional NPM package" without the "monster" overhead:

Phase 1: Structural Simplification (High Impact, Low Risk)
Collapse Hexagonal Layers:
Delete src/ports and src/adapters.
Move interfaces directly next to their implementations or in a shared types folder.
Example: Exporter interface goes into src/exporters/types.ts.
Flatten src/domain:
Keep distinct logic like parsing and rules, but avoid deep nesting if possible.
Phase 2: System De-bloating (Medium Impact)
Remove Runtime Plugin Registry:
Replace PluginRegistry with a static map of built-in exporters.
Allow users to pass a custom Exporter class instance if they really need to extend it, rather than "registering" it by string name.
Benefit: Removes complex event/lifecycle code.
Simplify entry points:
Ensure src/index.ts exports the main functions (parse, process, export) directly.
Phase 3: Feature Re-evaluation (Strategic)
Evaluate "Importers":
Consider moving JsonImporter/CsvImporter to a separate addons directory or deprecating them if telemetry/feedback suggests low usage.
Config Loader:
If the CLI is gone (as per Roadmap "CLI: Eliminada"), cosmiconfig might be unnecessary for the library usage unless you expect the library to auto-read config files when used programmatically (which is rare; usually library consumers pass options object).
4. Proposed "Finished" State
A "finished" state would look like:

Core: A robust, single-import Parser & Processor.
Exporters: A standard set of classes (ObsidianExporter, JsonExporter).
Usage:
import { parse, ObsidianExporter } from 'kindle-tools-ts';
const data = parse(fileContent);
const exporter = new ObsidianExporter();
await exporter.export(data);
No Registry, No Events, No complex "Ports". Just pure functions and classes.
