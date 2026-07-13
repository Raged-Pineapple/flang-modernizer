# Flang Modernizer

A multi-phase Fortran legacy code static analysis and modernization advisor, built directly on the **LLVM 20 Flang compiler frontend**.

## What It Does
The `flang-modernizer` is not a simple regex-based linter. It uses real compiler infrastructure (AST traversal and semantic scope linking) to:
1. Detect 9 distinct legacy Fortran 77 anti-patterns.
2. Analyze `COMMON` block consistency across multiple source files simultaneously (preventing type aliasing).
3. Generate a prioritized **Modernization Impact Report** scored by risk and effort, guiding engineers on what to fix first before automated transpilation.

---

## Repository Structure
- **`src` / `include` / `lib`**: The C++ source code for the tool, split into `Checks` (Phase 1), `ImpactAnalyzer` (Phase 2), and `Reporter` (Phase 3).
- **`tools/flang-modernizer`**: The main executable entry point.
- **`testcases` / `test/legacy`**: Fortran 77 files with known legacy patterns, used by the regression test suite.
- **`case_study`**: Real-world legacy files from the LAPACK scientific computing library.
- **`flang-modernizer/frontend`**: React + TypeScript + Vite web application showcase.
- **`server.js`**: Node.js Express API server powering the GitHub integration and live analysis backend.

---

## Dependencies

### C++ Backend (WSL2 / Linux required)
| Dependency | Version |
|---|---|
| LLVM + Flang-new | 20 |
| Clang++ | 20 |
| CMake | >= 3.20 |
| Ninja | any |
| OS | Linux / WSL2 Ubuntu |

### Node.js Server
| Dependency | Version |
|---|---|
| Node.js | >= 18 |
| npm | >= 9 |

### Frontend
| Dependency | Version |
|---|---|
| Node.js | >= 18 |
| npm | >= 9 |

---

## Full Setup & Run Guide

### Step 1 — Build the C++ Binary (inside WSL2/Ubuntu)

```bash
# Clone the repo (inside WSL)
git clone https://github.com/Raged-Pineapple/flang-modernizer.git
cd flang-modernizer

# Build using the provided script
./build.sh
```

The compiled binary will be at:
```
build/tools/flang-modernizer/flang-modernizer
```

### Step 2 — Run the Analysis Backend (Node.js API Server)

The `server.js` bridges the web frontend with the C++ binary via Server-Sent Events (SSE). It must be run from the **Windows side** (or Linux host), and it calls into WSL to execute the binary.

```bash
# From the repo root (Windows PowerShell or Linux terminal)
npm install        # install server dependencies (first time only)
node server.js
```

The API server starts on **http://localhost:3001** by default.

> **Note:** `server.js` uses WSL to run the C++ binary. Ensure WSL2 with Ubuntu is installed and the binary has been built (Step 1) before starting the server.

### Step 3 — Run the Frontend Dev Server

```bash
cd flang-modernizer/frontend
npm install        # install frontend dependencies (first time only)
npm run dev
```

The web app starts on **http://localhost:5173**.

### Step 4 — Open the App

Navigate to **http://localhost:5173** in your browser. Both the frontend dev server (port 5173) and the API server (port 3001) must be running simultaneously for full functionality.

---

## Running the CLI Directly

You can also run the C++ binary directly from inside WSL without the web app:

```bash
# Single file
./run.sh test/legacy/computed_goto.f

# Multiple files (for COMMON block cross-file analysis)
./run.sh test/legacy/common1.f test/legacy/common2.f test/legacy/common3.f

# Or invoke the binary directly
./build/tools/flang-modernizer/flang-modernizer path/to/your/file.f
```

---

## Testing

Run the automated diff-based regression suite against baseline files:

```bash
bash test/run_tests.sh
```

---

## GitHub Repository Analysis Feature

The web app includes a **GitHub Integration** tab that can clone any public GitHub repository, scan all Fortran files, and produce an overall modernization report.

**Requirements:**
- `server.js` must be running (Step 2 above)
- WSL2 + the compiled binary must be present
- The target GitHub repo must be **public** (no token needed for public repos)

**Usage:**
1. Go to the **GitHub Integration** tab in the web app
2. Paste a GitHub repo URL (e.g. `https://github.com/user/fortran-project`)
3. Click **Verify & Analyze**

The server will shallow-clone the repo into WSL's `/tmp/` directory, scan all `.f`, `.f90`, `.for`, `.F`, `.F90` files, and stream live progress back to the UI.

---

## Production Build

To build the frontend for production deployment:

```bash
cd flang-modernizer/frontend
npm run build
# Output is in flang-modernizer/frontend/dist/
```

---

## Further Documentation
- **`DESIGN.md`**: Architecture and design decisions.
- **`IMPLEMENTATION.md`**: Deep dive into LLVM/Flang integration.
- **`EVALUATION.md`**: Testing metrics and LAPACK case study results.

---

## Showcase Gallery

### 1. Homepage & Dashboard Overview
![Homepage Dashboard](docs/homepage.png)
![Homepage Features](docs/hmpg2.png)
These screenshots show the landing page of the Flang Modernizer Web Application. It displays an overview of the LLVM-Flang static analysis suite, including the 9 supported syntactic AST checkers and details about the multi-file semantic safety pass analysis.

### 2. Single-File Testing Sandbox
![Single File Sandbox](docs/singletests.png)
This screen displays the single-file regression tests panel where developers can explore predefined legacy Fortran 77 test cases (such as arithmetic IF, computed GOTO, etc.). Clicking any test case loads the legacy code into the viewer and sets it up for analysis.

### 3. AST Parser and Test Case Analysis
![AST Node Analysis Graph](docs/analysisoftest.png)
Shows the active parsing process and node traversal graph visualization in the Execute Arena. It tracks the step-by-step syntactic verification of the AST parser, verifying construct scopes and outputs live compiler logs to the bottom terminal panel.

### 4. Custom Test Editor
![Custom Test Case Editor](docs/customtest.png)
The custom sandbox playground where users can write, paste, edit, and test their own custom Fortran 77 files. It features line numbers, syntax highlighting guidelines, and a drop zone for dragging files directly from the operating system to analyze them instantly.

### 5. Modernization Report Generator
![Advisory Report Overview](docs/reportgen1.png)
![Advisory Report Details](docs/reportgen2.png)
These images show the interactive, modal-based Modernization Advisory Report generated after a project analysis. It features a print-ready layout showing a safety verdict badge, feasibility scores, categorized diagnostic checks, and a prioritized risk/effort impact matrix.

### 6. Real-World Case Study
![Real World Case Study](docs/realworldtestcase.png)
Highlights the Weather Forecast Case Study dashboard built within the web app. This case study demonstrates the multi-file analysis capability of the tool, running checks across shared variables and subroutines.

### 7. Workspace & Working Directory
![Real World Working Directory](docs/realworldworkingdirectory.png)
Shows the multi-file directory viewer structure containing the shared global variables, parameters, and weather simulation modules. It illustrates the real-world scale of the codebase being analyzed by the modernization engine.

### 8. Semantic Alignment Report
![Semantic Alignment Report](docs/realworldworkingdirectorytestreport.png)
Displays the memory offset visualizer for shared `COMMON` blocks (e.g. `/PHYSDAT/`) across `main.f` and `physics.f`. It highlights the detected type/alignment alignment mismatch warning where variable bounds collide, preventing automated refactoring bugs.

---

## How to Push to Git/GitHub

```bash
git add .
git commit -m "feat: your commit message"
git push origin main
```

> If pushing from WSL with HTTPS, use a [Personal Access Token](https://github.com/settings/tokens) as your password, or embed it in the remote URL:
> ```bash
> git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git
> ```
