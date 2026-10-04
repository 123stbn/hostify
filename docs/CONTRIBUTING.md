# Contributing to Hostify

Thank you for your interest in contributing to **Hostify**! Hostify is an open-source project dedicated to making personal music streaming seamless, self-hosted, and high-fidelity.

---

## 1. Code of Conduct & Guidelines

To ensure consistency across the project, please follow these core principles:

1. **Mandatory Package Manager**: Always use **`pnpm`** (`pnpm install`, `pnpm run dev`, `pnpm build`, `pnpm test`). Never use `npm` or `yarn`.
2. **Language Policy**:
   - **All code comments, docstrings, variable names, and commit messages must be in English.**
   - User-facing UI strings must use the internationalization system (`app/src/i18n.tsx`) supporting both English (`en`) and Spanish (`es`).
3. **Architecture Principles**:
   - Respect the storage segregation architecture (`personal/`, `explo/`, `slskd/`, `torrents/`).
   - Keep temporary files outside Navidrome's library scan path.
   - Interact with Docker services exclusively via the Docker Engine API or Docker Compose.

---

## 2. Development Setup

### 2.1 Prerequisites
- **Node.js**: v20+ LTS
- **pnpm**: v9+ (`npm install -g pnpm` or `brew install pnpm`)
- **Docker & Docker Compose**:
  - **macOS**: Docker Desktop or Colima (`colima start`)
  - **Linux**: Docker Engine (`systemctl start docker`)
  - **Windows**: Docker Desktop (with WSL2 backend)

### 2.2 Local Frontend & Backend Development
To develop Hostify with Hot Module Replacement (HMR) without having to rebuild the container on every change:

1. Clone your fork of the repository:
   ```bash
   git clone https://github.com/<your-username>/hostify.git
   cd hostify
   ```

2. Start the satellite Docker containers:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
   ```

3. Navigate to the `app` directory and install dependencies:
   ```bash
   cd app
   pnpm install
   ```

4. Launch the integrated development server:
   ```bash
   pnpm run dev
   ```

5. Open your browser at **`http://localhost:3500`**. Changes to React components or Express backend routes will reload automatically.

---

## 3. Repository Structure

```text
hostify/
├── app/
│   ├── server/             # Express 4 API Gateway & Docker Engine Orchestrator
│   │   ├── routes/         # Modular route controllers & reverse proxies
│   │   ├── services/       # Subsonic client, Compose, Storage, Network services
│   │   └── utils/          # Helpers (environment parser, logger)
│   ├── src/                # React 18 frontend (Vite SPA)
│   │   ├── components/     # UI components (Dashboard, SetupWizard, Player, Modals)
│   │   ├── i18n.tsx        # Internationalization dictionary (en / es)
│   │   └── index.css       # Hi-Fi Obsidian design system & animations
│   ├── templates/          # Embedded docker-compose templates for packaging
│   └── package.json        # Node.js dependencies (managed via pnpm)
├── docker/                 # Additional service configuration templates
├── docs/                   # Technical architecture and documentation
├── install.sh              # Cross-platform installer for Linux / macOS
├── install.ps1             # PowerShell installer for Windows
├── docker-compose.yml      # Base production container topology
└── docker-compose.override.yml # Local development host-port exposure
```

---

## 4. Testing & Verification

Before submitting a Pull Request, run the automated test suite and verify code quality:

```bash
cd app

# Run unit and integration tests
pnpm test

# Type-check TypeScript files
pnpm run build
```

---

## 5. Pull Request Workflow

1. Fork the repository and create a new feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Commit your changes with descriptive, English commit messages:
   ```bash
   git commit -m "feat(player): add gapless playback state indicator"
   ```
3. Push to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```
4. Open a Pull Request against the `main` branch of `123stbn/hostify`.
5. Clearly describe the motivation, changes made, and steps taken to test your code.
