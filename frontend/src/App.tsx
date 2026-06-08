import { useState, useEffect } from 'react';

// Custom icons using inline SVG components
const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// High-fidelity mock test cases with actual code and modernized results
const testCases: Record<string, {
  name: string;
  desc: string;
  type: string;
  verdict: 'safe' | 'review' | 'unsafe';
  diagnostics: string[];
  tableData: { check: string; risk: 'safe' | 'caution' | 'unsafe'; effort: string; files: number; score: number }[];
  code: string;
  modernized: string;
}> = {
  arith_if: {
    name: "arith_if.f",
    desc: "Checks obsolete 3-way branching arithmetic IF statements.",
    type: "Single File",
    verdict: "safe",
    diagnostics: [
      "line 4: [modernize-avoid-arithmetic-if] Arithmetic IF is deleted in Fortran 2018; replace with IF-THEN-ELSE",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 },
      { check: "Arithmetic IF", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 }
    ],
    code: `      PROGRAM TEST
      REAL X
      X = -1.0
      IF (X) 10, 20, 30
 10   WRITE(*,*) 'NEGATIVE'
      GOTO 40
 20   WRITE(*,*) 'ZERO'
      GOTO 40
 30   WRITE(*,*) 'POSITIVE'
 40   STOP
      END`,
    modernized: `program test
  implicit none
  real :: x
  x = -1.0
  if (x < 0.0) then
    write(*,*) 'NEGATIVE'
  else if (x == 0.0) then
    write(*,*) 'ZERO'
  else
    write(*,*) 'POSITIVE'
  end if
end program test`
  },
  computed_goto: {
    name: "computed_goto.f",
    desc: "Checks deprecated label-based Computed GOTO routines.",
    type: "Single File",
    verdict: "safe",
    diagnostics: [
      "line 4: [modernize-avoid-computed-goto] Computed GOTO is deleted in Fortran 95; replace with SELECT CASE",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 },
      { check: "Computed GOTO", risk: "safe", effort: "MODERATE", files: 1, score: 2 }
    ],
    code: `      PROGRAM TEST
      INTEGER N
      N = 2
      GOTO (10, 20, 30), N
 10   WRITE(*,*) 'ONE'
      STOP
 20   WRITE(*,*) 'TWO'
      STOP
 30   WRITE(*,*) 'THREE'
      STOP
      END`,
    modernized: `program test
  implicit none
  integer :: n
  n = 2
  select case (n)
    case (1)
      write(*,*) 'ONE'
    case (2)
      write(*,*) 'TWO'
    case (3)
      write(*,*) 'THREE'
    case default
      ! Handle out of bounds
  end select
end program test`
  },
  equivalence: {
    name: "equivalence.f",
    desc: "Identifies unsafe memory aliasing (EQUIVALENCE).",
    type: "Single File",
    verdict: "review",
    diagnostics: [
      "line 4: [modernize-avoid-equivalence] EQUIVALENCE creates unsafe aliasing; replace with explicit variables",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 },
      { check: "EQUIVALENCE", risk: "caution", effort: "MODERATE", files: 1, score: 4 }
    ],
    code: `      PROGRAM TEST
      REAL A
      INTEGER B
      EQUIVALENCE (A, B)
      A = 3.14
      WRITE(*,*) B
      STOP
      END`,
    modernized: `program test
  implicit none
  real :: a
  integer :: b
  a = 3.14
  ! Replaced implicit type punning with modern standard TRANSFER function
  b = transfer(a, b)
  write(*,*) b
end program test`
  },
  implicit_typing: {
    name: "implicit_typing.f",
    desc: "Detects absent explicit variable scoping declarations.",
    type: "Single File",
    verdict: "review",
    diagnostics: [
      "line 2: [modernize-require-implicit-none] Explicit IMPLICIT typing found; add IMPLICIT NONE and declare all variables",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 },
      { check: "Implicit Typing", risk: "caution", effort: "MODERATE", files: 1, score: 4 }
    ],
    code: `      PROGRAM TEST
      IMPLICIT REAL (A-H, O-Z)
      X = 3.14
      WRITE(*,*) X
      STOP
      END`,
    modernized: `program test
  implicit none
  real :: x
  x = 3.14
  write(*,*) x
end program test`
  },
  stmt_function: {
    name: "stmt_function.f",
    desc: "Finds single-line local statement functions.",
    type: "Single File",
    verdict: "safe",
    diagnostics: [
      "line 3: [modernize-avoid-stmt-function] Statement functions are deleted in Fortran 95; move to CONTAINS section",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 },
      { check: "Statement Function", risk: "safe", effort: "TRIVIAL", files: 1, score: 2 }
    ],
    code: `      PROGRAM TEST
      REAL X, SQUARE
      SQUARE(X) = X * X
      WRITE(*,*) SQUARE(4.0)
      STOP
      END`,
    modernized: `program test
  implicit none
  write(*,*) square(4.0)
contains
  pure real function square(x)
    real, intent(in) :: x
    square = x * x
  end function square
end program test`
  },
  assumed_size: {
    name: "assumed_size.f",
    desc: "Flags dummy arrays preventing runtime safety checks.",
    type: "Single File",
    verdict: "review",
    diagnostics: [
      "line 3: [modernize-avoid-assumed-size] Assumed-size dummy(*) prevents optimization; use explicit or assumed-shape",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 },
      { check: "Assumed-size Array", risk: "caution", effort: "MODERATE", files: 1, score: 4 }
    ],
    code: `      SUBROUTINE PROC(A, N)
      INTEGER N
      REAL A(*)
      INTEGER I
      DO I = 1, N
        WRITE(*,*) A(I)
      END DO
      RETURN
      END`,
    modernized: `subroutine proc(a)
  ! Modernized to use standard assumed-shape array wrapper (requires interface/module)
  real, intent(in) :: a(:)
  integer :: i
  do i = 1, size(a)
    write(*,*) a(i)
  end do
end subroutine proc`
  },
  entry_stmt: {
    name: "entry_stmt.f",
    desc: "Flags ENTRY statements blocking clean modular flows.",
    type: "Single File",
    verdict: "review",
    diagnostics: [
      "line 5: [modernize-avoid-entry] ENTRY statements are deleted in Fortran 2018; refactor into separate subprograms",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 },
      { check: "ENTRY Statement", risk: "caution", effort: "COMPLEX", files: 1, score: 6 }
    ],
    code: `      SUBROUTINE INIT(X)
      REAL X
      X = 0.0
      RETURN
      ENTRY RESET(X)
      X = -1.0
      RETURN
      END`,
    modernized: `! ENTRY points refactored into distinct procedures in a module
module procedures_mod
  implicit none
contains
  subroutine init_val(x)
    real, intent(out) :: x
    x = 0.0
  end subroutine init_val

  subroutine reset_val(x)
    real, intent(out) :: x
    x = -1.0
  end subroutine reset_val
end module procedures_mod`
  },
  common_block: {
    name: "common_block.f",
    desc: "Checks single-file global COMMON declarations.",
    type: "Single File",
    verdict: "safe",
    diagnostics: [
      "line 3: [modernize-avoid-common-block] COMMON blocks prevent encapsulation; replace with MODULE variables",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 1, score: 1 },
      { check: "COMMON block", risk: "safe", effort: "MODERATE", files: 1, score: 2 }
    ],
    code: `      PROGRAM TEST
      REAL X, Y
      COMMON /PHYSDAT/ X, Y
      X = 1.0
      Y = 2.0
      WRITE(*,*) X, Y
      STOP
      END`,
    modernized: `module physdat_mod
  implicit none
  real :: x, y
end module physdat_mod

program test
  use physdat_mod
  implicit none
  x = 1.0
  y = 2.0
  write(*,*) x, y
end program test`
  },
  multi_common: {
    name: "multi_common (common1.f + common2.f + common3.f)",
    desc: "Performs cross-file layout type verification on blocks.",
    type: "Multiple Files",
    verdict: "unsafe",
    diagnostics: [
      "line 3 (common1.f): [modernize-avoid-common-block] COMMON blocks prevent encapsulation",
      "line 3 (common2.f): [modernize-avoid-common-block] COMMON blocks prevent encapsulation",
      "line 3 (common3.f): [modernize-avoid-common-block] COMMON blocks prevent encapsulation",
      "*** WARNING: Inconsistent declarations! Type signature mismatch: common1.f [REAL|REAL] vs common3.f [INTEGER|INTEGER]"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 3, score: 3 },
      { check: "COMMON Block /PHYSDAT/", risk: "unsafe", effort: "COMPLEX", files: 3, score: 27 }
    ],
    code: `! === common1.f ===
      SUBROUTINE SUB1
      REAL X, Y
      COMMON /PHYSDAT/ X, Y
      X = 100.0
      END

! === common2.f ===
      SUBROUTINE SUB2
      REAL A, B
      COMMON /PHYSDAT/ A, B
      WRITE(*,*) A, B
      END

! === common3.f ===
      PROGRAM MAIN
      INTEGER I, J
      COMMON /PHYSDAT/ I, J
      I = 1
      CALL SUB1
      CALL SUB2
      END`,
    modernized: `! WARNING: Inconsistent declarations detected across translation units.
! common1.f defines COMMON /PHYSDAT/ with (REAL, REAL).
! common3.f defines COMMON /PHYSDAT/ with (INTEGER, INTEGER).
! Automated refactoring to MODULE variables is unsafe.
! Please align variable types at the corresponding memory offsets first.`
  },
  lapack_demo: {
    name: "LAPACK Case Study",
    desc: "Integration analysis on production linear algebra routines.",
    type: "Real World Case",
    verdict: "review",
    diagnostics: [
      "line 43: [modernize-avoid-assumed-size] Assumed-size dummy(*) prevents optimization; use explicit or assumed-shape",
      "line 1: [modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form"
    ],
    tableData: [
      { check: "Fixed-form", risk: "safe", effort: "TRIVIAL", files: 3, score: 3 },
      { check: "Assumed-size arrays", risk: "caution", effort: "MODERATE", files: 3, score: 12 }
    ],
    code: `! Excerpt from LAPACK DGETRF (F77)
      SUBROUTINE DGETRF( M, N, A, LDA, IPIV, INFO )
      INTEGER            INFO, LDA, M, N
      INTEGER            IPIV( * )
      DOUBLE PRECISION   A( LDA, * )
      
      IF( M.LT.0 ) THEN
         INFO = -1
      ELSE IF( N.LT.0 ) THEN
         INFO = -2
      END IF
      IF( INFO.NE.0 ) THEN
         CALL XERBLA( 'DGETRF', -INFO )
         RETURN
      END IF`,
    modernized: `subroutine dgetrf(a, ipiv, info)
  ! Modernized interface using assumed-shape arrays
  double precision, intent(inout) :: a(:, :)
  integer, intent(out) :: ipiv(:)
  integer, intent(out) :: info
  
  ! Bounds and dimensions are extracted automatically from the array shapes
  integer :: m, n
  m = size(a, 1)
  n = size(a, 2)
  ...`
  }
};

type TerminalLine = { text: string; type: 'info' | 'success' | 'warn' | 'error' | 'cmd' | 'muted' };

interface CustomFile {
  id: string;
  name: string;
  code: string;
}

const defaultCustomFiles: Record<string, CustomFile> = {
  'custom_1': {
    id: 'custom_1',
    name: 'arithmetic_branch.f',
    code: `! Custom Fortran 77 program checking Arithmetic IF
      PROGRAM ARITH
      REAL VAL
      VAL = -2.5
      IF (VAL) 10, 20, 30
 10   WRITE(*,*) 'VAL IS NEGATIVE'
      GOTO 40
 20   WRITE(*,*) 'VAL IS ZERO'
      GOTO 40
 30   WRITE(*,*) 'VAL IS POSITIVE'
 40   STOP
      END`
  },
  'custom_2': {
    id: 'custom_2',
    name: 'common_mismatch.f',
    code: `! Custom program with global COMMON memory block
      PROGRAM COMM_TEST
      REAL X, Y, Z
      COMMON /SHARED_MEM/ X, Y, Z
      X = 10.0
      Y = 20.0
      Z = 30.0
      WRITE(*,*) X, Y, Z
      STOP
      END`
  }
};

const analyzeCustomCode = (name: string, code: string) => {
  const diagnostics: TerminalLine[] = [];
  const lines = code.split('\n');

  // Check for fixed-form comments (e.g., lines starting with 'C' or '*' in column 1)
  let fixedForm = false;
  for (const line of lines) {
    if (/^[C\*]/i.test(line)) {
      fixedForm = true;
      break;
    }
  }
  if (fixedForm) {
    diagnostics.push({ text: `  ✗ ${name}:1 [modernize-avoid-fixed-form] Fixed-form layout detected`, type: 'warn' });
  }

  // Check for Arithmetic IF
  if (/\bif\s*\([^)]*\)\s*\d+\s*,\s*\d+\s*,\s*\d+/i.test(code)) {
    diagnostics.push({ text: `  ✗ ${name}:4 [modernize-avoid-arithmetic-if] Arithmetic IF deleted in F2018; replace with IF-THEN-ELSE`, type: 'error' });
  }

  // Check for GOTO
  if (/\bgoto\s*\([^)]*\)\s*,\s*\w+/i.test(code) || /\bgoto\s*\([^)]*\)\s*\w+/i.test(code)) {
    diagnostics.push({ text: `  ✗ ${name}:5 [modernize-avoid-computed-goto] Computed GOTO is deprecated; replace with SELECT CASE`, type: 'error' });
  }

  // Check for COMMON
  if (/\bcommon\b/i.test(code)) {
    diagnostics.push({ text: `  ✗ ${name}:3 [modernize-avoid-common-block] COMMON blocks prevent encapsulation`, type: 'error' });
  }

  // Check for EQUIVALENCE
  if (/\bequivalence\b/i.test(code)) {
    diagnostics.push({ text: `  ✗ ${name}:3 [modernize-avoid-equivalence] EQUIVALENCE creates unsafe aliasing`, type: 'error' });
  }

  // Check for IMPLICIT typing
  if (/\bimplicit\s+([a-z]+)/i.test(code) && !/\bimplicit\s+none\b/i.test(code)) {
    diagnostics.push({ text: `  ✗ ${name}:2 [modernize-require-implicit-none] IMPLICIT typing found; add IMPLICIT NONE`, type: 'warn' });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({ text: `  ✓ ${name}: No obsolete legacy constructs found. Code is modern standard-compliant!`, type: 'success' });
  }

  return diagnostics;
};

// ─── Report Data Types ────────────────────────────────────────────
interface ReportDiagnostic {
  file: string;
  line: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
}

interface ReportImpactRow {
  check: string;
  risk: 'safe' | 'caution' | 'unsafe';
  effort: string;
  files: number;
  score: number;
}

interface ReportData {
  title: string;
  files: string[];
  timestamp: string;
  verdict: 'safe' | 'review' | 'unsafe';
  feasibilityScore: number;
  phase: string;
  diagnostics: ReportDiagnostic[];
  impactTable: ReportImpactRow[];
  summary: string;
  recommendation: string;
}

// Build a structured report from the current analysis context
const buildReport = (
  files: string[],
  testKey: string,
  customFilesMap: Record<string, CustomFile>
): ReportData => {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  const isWeatherSim = testKey === 'weather' || (files.includes('main.f') && files.includes('physics.f'));

  if (isWeatherSim) {
    return {
      title: 'Regional Atmospheric Simulation — Modernization Feasibility Report',
      files,
      timestamp: ts,
      verdict: 'unsafe',
      feasibilityScore: 48,
      phase: 'Multi-File Cross-Semantic Analysis',
      diagnostics: [
        { file: 'main.f', line: '20', rule: 'modernize-avoid-arithmetic-if', message: 'Arithmetic IF deleted in Fortran 2018; replace with IF-THEN-ELSE', severity: 'error' },
        { file: 'physics.f', line: '24', rule: 'modernize-avoid-arithmetic-if', message: 'Arithmetic IF deleted in Fortran 2018; replace with IF-THEN-ELSE', severity: 'error' },
        { file: 'grid_setup.f', line: '12', rule: 'modernize-avoid-entry', message: 'ENTRY statement INITGRID is obsolete in Fortran 2018', severity: 'error' },
        { file: 'main.f', line: '5', rule: 'modernize-require-implicit-none', message: 'IMPLICIT typing found; add IMPLICIT NONE and declare all variables explicitly', severity: 'warning' },
        { file: 'physics.f', line: '8', rule: 'modernize-avoid-common-block', message: 'COMMON /PHYSDAT/ layout mismatch vs main.f — offset collision detected!', severity: 'error' },
      ],
      impactTable: [
        { check: 'Arithmetic IF Statements', risk: 'unsafe', effort: 'MODERATE', files: 2, score: 8 },
        { check: 'ENTRY Procedure Points', risk: 'caution', effort: 'COMPLEX', files: 1, score: 6 },
        { check: 'COMMON Block /PHYSDAT/ Mismatch', risk: 'unsafe', effort: 'COMPLEX', files: 2, score: 27 },
        { check: 'IMPLICIT Typing (no IMPLICIT NONE)', risk: 'caution', effort: 'MODERATE', files: 3, score: 9 },
      ],
      summary: 'A fatal COMMON block memory layout mismatch was detected between main.f and physics.f. The /PHYSDAT/ block declares variables in different orders — INTEGER, INTEGER, REAL, REAL in main.f vs REAL, REAL, INTEGER, INTEGER in physics.f — causing type-aliased byte offset collisions. Automatic modernization has been blocked.',
      recommendation: 'Before converting COMMON blocks to Fortran 90 MODULE variables, manually realign the /PHYSDAT/ variable declarations in physics.f to match the integer-first layout in main.f. Then convert all Arithmetic IF constructs to IF-THEN-ELSE, split ENTRY points into separate subroutines, and add IMPLICIT NONE to all program units.',
    };
  }

  // Available test case report
  if (testCases[testKey]) {
    const tc = testCases[testKey];
    const isMulti = testKey === 'multi_common';
    return {
      title: `Flang Modernizer — Analysis Report: ${tc.name}`,
      files,
      timestamp: ts,
      verdict: tc.verdict,
      feasibilityScore: tc.verdict === 'safe' ? 95 : tc.verdict === 'review' ? 68 : 32,
      phase: isMulti ? 'Cross-File Semantic Analysis' : 'Single-File AST Analysis',
      diagnostics: tc.diagnostics.map((d, i) => {
        const lineMatch = d.match(/line (\d+)/);
        const ruleMatch = d.match(/\[(.*?)\]/);
        const severity: 'error' | 'warning' = d.includes('WARN') || d.toLowerCase().includes('warning') ? 'warning' : 'error';
        return {
          file: files[0] || tc.name,
          line: lineMatch ? lineMatch[1] : String(i + 1),
          rule: ruleMatch ? ruleMatch[1] : 'modernize-check',
          message: d.replace(/^line \d+: \[.*?\] /, ''),
          severity,
        };
      }),
      impactTable: tc.tableData.map(r => ({ ...r })),
      summary: tc.desc,
      recommendation: tc.verdict === 'unsafe'
        ? 'Automated refactoring is blocked. Manually resolve all inconsistent COMMON block declarations across translation units before applying transformations.'
        : tc.verdict === 'review'
          ? 'Manual review required before applying automated transformations. Resolve flagged constructs one by one.'
          : 'All detected issues are safe to automatically refactor. Run the modernizer with --apply-fixes to transform the source code.',
    };
  }

  // Custom file report
  const customDiags: ReportDiagnostic[] = [];
  files.forEach(fname => {
    const cf = Object.values(customFilesMap).find(c => c.name === fname);
    if (cf) {
      const lines = analyzeCustomCode(cf.name, cf.code);
      lines.forEach(l => {
        const ruleMatch = l.text.match(/\[(.*?)\]/);
        const lineMatch = l.text.match(/:(\d+)/);
        customDiags.push({
          file: cf.name,
          line: lineMatch ? lineMatch[1] : '?',
          rule: ruleMatch ? ruleMatch[1] : 'custom-check',
          message: l.text.replace(/^.*?\[.*?\]\s*/, '').replace(/^[✗✓]\s*/, ''),
          severity: l.type === 'error' ? 'error' : l.type === 'warn' ? 'warning' : 'success',
        });
      });
    }
  });

  const hasIssues = customDiags.some(d => d.severity === 'error' || d.severity === 'warning');
  return {
    title: `Flang Modernizer — Custom Code Analysis Report`,
    files,
    timestamp: ts,
    verdict: hasIssues ? 'review' : 'safe',
    feasibilityScore: hasIssues ? 65 : 98,
    phase: 'Custom Code AST Analysis',
    diagnostics: customDiags,
    impactTable: [],
    summary: `Custom Fortran code analyzed for ${files.length} file(s). ${customDiags.length} issue(s) detected.`,
    recommendation: hasIssues
      ? 'Review and fix the flagged legacy constructs. Once resolved, the code will be ready for automated modernization.'
      : 'No legacy issues detected. Your code is modern Fortran standard-compliant.',
  };
};

export default function App() {
  const [page, setPage] = useState<'home' | 'tests' | 'weather'>('home');
  const [testTab, setTestTab] = useState<'available' | 'custom'>('available');
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);

  // Sync body padding when terminal is collapsed/expanded
  useEffect(() => {
    document.body.style.paddingBottom = isTerminalCollapsed ? '60px' : '260px';
  }, [isTerminalCollapsed]);
  const [selectedTest, setSelectedTest] = useState<string>('arith_if');
  const [hoveredTest, setHoveredTest] = useState<string>('arith_if');

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);

  // Overlay Animation States
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayStep, setOverlayStep] = useState<number>(0);
  const [activeNode, setActiveNode] = useState<string>(''); // 'prog', 'main', 'stmt', 'pat'
  const [progressVal, setProgressVal] = useState(0);

  // Terminal state
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { text: 'Flang Modernizer v1.0.0 — LLVM Flang Static Analysis Engine', type: 'muted' },
    { text: 'Ready. Drag test files or OS files into the Execute Arena to begin.', type: 'muted' },
  ]);
  const [terminalSession, setTerminalSession] = useState(1);
  const terminalRef = { current: null as HTMLDivElement | null };

  // Custom Test Case States
  const [customFiles, setCustomFiles] = useState<Record<string, CustomFile>>(() => {
    const stored = localStorage.getItem('flang_modernizer_custom_files');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return defaultCustomFiles;
  });

  const [selectedCustomId, setSelectedCustomId] = useState<string>(() => {
    const keys = Object.keys(customFiles);
    return keys.length > 0 ? keys[0] : '';
  });

  const [checkedCustomIds, setCheckedCustomIds] = useState<Record<string, boolean>>({});
  const [newFileName, setNewFileName] = useState('');
  const [editingCode, setEditingCode] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Sync editingCode when active custom file changes
  useEffect(() => {
    if (selectedCustomId && customFiles[selectedCustomId]) {
      setEditingCode(customFiles[selectedCustomId].code);
    } else {
      setEditingCode('');
    }
    setSaveStatus('');
  }, [selectedCustomId, customFiles]);

  const selectCustomFile = (id: string) => {
    setSelectedCustomId(id);
    setSaveStatus('');
  };

  const handleCreateCustomFile = () => {
    const cleanName = newFileName.trim();
    if (!cleanName) return;

    const formattedName = /\.(f|f90|for)$/i.test(cleanName) ? cleanName : `${cleanName}.f`;

    // Check if filename already exists
    const duplicate = Object.values(customFiles).find(f => f.name.toLowerCase() === formattedName.toLowerCase());
    if (duplicate) {
      alert(`File with name ${formattedName} already exists!`);
      return;
    }

    const newId = `custom_${Date.now()}`;
    const newFile: CustomFile = {
      id: newId,
      name: formattedName,
      code: `! Program ${formattedName.toUpperCase().replace(/\./g, '_')}
      PROGRAM ${formattedName.toUpperCase().split('.')[0]}
! Write your legacy Fortran code here
      
      END`
    };

    const updated = { ...customFiles, [newId]: newFile };
    setCustomFiles(updated);
    localStorage.setItem('flang_modernizer_custom_files', JSON.stringify(updated));
    setSelectedCustomId(newId);
    setNewFileName('');
  };

  const handleDeleteCustomFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...customFiles };
    delete updated[id];
    setCustomFiles(updated);
    localStorage.setItem('flang_modernizer_custom_files', JSON.stringify(updated));

    // Clear checked state
    const updatedChecked = { ...checkedCustomIds };
    delete updatedChecked[id];
    setCheckedCustomIds(updatedChecked);

    if (selectedCustomId === id) {
      const remainingKeys = Object.keys(updated);
      if (remainingKeys.length > 0) {
        setSelectedCustomId(remainingKeys[0]);
      } else {
        setSelectedCustomId('');
      }
    }
  };

  const handleSaveCustomFile = () => {
    if (!selectedCustomId || !customFiles[selectedCustomId]) return;

    const updatedFile = { ...customFiles[selectedCustomId], code: editingCode };
    const updated = { ...customFiles, [selectedCustomId]: updatedFile };
    setCustomFiles(updated);
    localStorage.setItem('flang_modernizer_custom_files', JSON.stringify(updated));
    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus('');
    }, 3000);
  };

  const toggleCheckedCustom = (id: string) => {
    setCheckedCustomIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const runSelectedCustomFiles = () => {
    const selectedNames = Object.entries(checkedCustomIds)
      .filter(([_, checked]) => checked)
      .map(([id, _]) => customFiles[id]?.name)
      .filter(Boolean);
    if (selectedNames.length > 0) {
      setDroppedFiles(selectedNames);
      triggerOverlayAnimation(selectedNames, '');
    }
  };

  // Weather simulation project states & structures
  interface WeatherFile {
    id: string;
    name: string;
    code: string;
    type: 'f' | 'dat' | 'md';
  }

  const defaultWeatherFiles: Record<string, WeatherFile> = {
    'main_f': {
      id: 'main_f',
      name: 'main.f',
      type: 'f',
      code: `C     ===========================================================
C     MAIN.F  --  Regional Atmospheric Simulation Model Driver
C     ===========================================================
      PROGRAM WEATHMAIN
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
C
C     COMMON block defining grid size and thermodynamics constants
C     Signature: INTEGER, INTEGER, REAL, REAL, INTEGER
      COMMON /PHYSDAT/ NX, NY, OMEGA, TOLR, MAXITR
C
      REAL TEMP(128, 128), PRES(128, 128), QVAP(128, 128)
      REAL DT
      DT = 600.0
C
      WRITE(6, '(A)') 'Initializing regional forecasting model...'
      CALL INITGRID(128, 128, 1.5, 1.0E-4)
C
C     Verify CFL conditions using Arithmetic IF
      COURANT = DT * 15.0 / 1000.0
      IF (COURANT - 1.0) 100, 110, 120
 100  CONTINUE
      GOTO 130
 110  WRITE(6, '(A)') 'CFL margin: exactly at boundary'
      GOTO 130
 120  WRITE(6, '(A)') 'CFL warning: model will diverge!'
 130  CONTINUE
C
      DO 200 ISTEP = 1, 100
        CALL ADVTEMP(TEMP, 128, 128, DT)
        CALL ADVPRES(PRES, 128, 128, DT)
        CALL MOISTADJ(QVAP, TEMP, 128, 128)
 200  CONTINUE
C
      END`
    },
    'physics_f': {
      id: 'physics_f',
      name: 'physics.f',
      type: 'f',
      code: `C     ===========================================================
C     PHYSICS.F  --  Advection and saturation adjustments
C     ===========================================================
      SUBROUTINE ADVTEMP(TEMP, MX, MY, DT)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
C
C     COMMON Block with INCONSISTENT variable declarations!
C     This defines (REAL, REAL, INTEGER, INTEGER, INTEGER)
C     causing memory offset alignment mismatch against main.f!
      COMMON /PHYSDAT/ OMEGA, TOLR, NX, NY, MAXITR
C
      REAL TEMP(MX, *)
      DO 10 J = 2, MY
        DO 9 I = 2, MX
          TEMP(I,J) = TEMP(I,J) - DT*15.0*(TEMP(I,J)-TEMP(I-1,J))/1000.0
    9   CONTINUE
   10 CONTINUE
      RETURN
      END
C
      SUBROUTINE MOISTADJ(QVAP, TEMP, MX, MY)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      REAL QVAP(MX, *), TEMP(MX, *)
      QSAT = 0.010
      DO 30 J = 1, MY
        DO 29 I = 1, MX
          EXCESS = QVAP(I,J) - QSAT
C         Arithmetic IF checking moisture
          IF (EXCESS) 35, 36, 37
   35     CONTINUE
          GOTO 38
   36     QVAP(I,J) = QSAT
          GOTO 38
   37     TEMP(I,J) = TEMP(I,J) + EXCESS * 2500.0
          QVAP(I,J) = QSAT
   38     CONTINUE
   29   CONTINUE
   30 CONTINUE
      RETURN
      END`
    },
    'grid_setup_f': {
      id: 'grid_setup_f',
      name: 'grid_setup.f',
      type: 'f',
      code: `C     ===========================================================
C     GRID_SETUP.F  --  Coordinate mesh allocation
C     ===========================================================
      SUBROUTINE GRIDALLOC
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      COMMON /PHYSDAT/ NX, NY, OMEGA, TOLR, MAXITR
C
      NX = 64
      NY = 64
      RETURN
C
C     Multiple procedure entry points (ENTRY statement anti-pattern)
      ENTRY INITGRID(INX, INY, INOMG, INTOL)
      NX = INX
      NY = INY
      OMEGA = INOMG
      TOLR = INTOL
      MAXITR = 1000
      WRITE(6, '(A,I4,A,I4)') 'Grid dimension setup: ', NX, 'x', NY
      RETURN
      END`
    },
    'input_dat': {
      id: 'input_dat',
      name: 'config.dat',
      type: 'dat',
      code: `! Weather Prediction Parameter Configuration Card
NX = 128
NY = 128
OMEGA = 1.5
TOLR = 1.0E-4
MAXITR = 1000
STEPS = 100
DT = 600.0
`
    },
    'readme_md': {
      id: 'readme_md',
      name: 'README.md',
      type: 'md',
      code: `# Regional Atmospheric Simulation Model

This is a legacy numerical weather prediction framework circa 1989.

## Code Architecture
- \`main.f\`: Handles time-stepping and stability validations.
- \`physics.f\`: Solves moisture adjustments and fluid advections.
- \`grid_setup.f\`: Manages boundary offsets and solver dimensions.

## Analysis Notes
This simulation compiles under older FORTRAN 77 specifications.
Static warnings will show multiple entry points, arithmetic branching, and a layout offset mismatch on global COMMON variables.
`
    }
  };

  const [weatherFiles, setWeatherFiles] = useState<Record<string, WeatherFile>>(() => {
    const stored = localStorage.getItem('flang_modernizer_weather_files');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return defaultWeatherFiles;
  });

  const [selectedWeatherFileId, setSelectedWeatherFileId] = useState<string>('main_f');
  const [weatherEditingCode, setWeatherEditingCode] = useState<string>('');
  const [weatherSaveStatus, setWeatherSaveStatus] = useState<string>('');
  const [weatherAnalyzed, setWeatherAnalyzed] = useState<boolean>(false);
  const [showWeatherOffsetDetails, setShowWeatherOffsetDetails] = useState<boolean>(false);

  // Sync editing buffer for weather files
  useEffect(() => {
    if (selectedWeatherFileId && weatherFiles[selectedWeatherFileId]) {
      setWeatherEditingCode(weatherFiles[selectedWeatherFileId].code);
    } else {
      setWeatherEditingCode('');
    }
    setWeatherSaveStatus('');
  }, [selectedWeatherFileId, weatherFiles]);

  const handleSelectWeatherFile = (id: string) => {
    setSelectedWeatherFileId(id);
    setWeatherSaveStatus('');
  };

  const handleSaveWeatherFile = () => {
    if (!selectedWeatherFileId || !weatherFiles[selectedWeatherFileId]) return;

    const updatedFile = { ...weatherFiles[selectedWeatherFileId], code: weatherEditingCode };
    const updated = { ...weatherFiles, [selectedWeatherFileId]: updatedFile };
    setWeatherFiles(updated);
    localStorage.setItem('flang_modernizer_weather_files', JSON.stringify(updated));
    setWeatherSaveStatus('saved');
    setTimeout(() => {
      setWeatherSaveStatus('');
    }, 3000);
  };

  const handleRunWeatherAnalysis = () => {
    const fileNames = Object.values(weatherFiles).map(f => f.name);
    setDroppedFiles(fileNames);
    triggerOverlayAnimation(fileNames, 'weather');
  };

  const appendTerminal = (lines: TerminalLine[]) => {
    setTerminalLines(prev => [...prev, ...lines]);
  };

  const clearTerminal = () => {
    setTerminalLines([
      { text: `Session cleared. Terminal ready.`, type: 'muted' },
    ]);
  };

  const newTerminal = () => {
    const next = terminalSession + 1;
    setTerminalSession(next);
    setTerminalLines([
      { text: `─── New Terminal Session #${next} ───────────────────────────────`, type: 'muted' },
      { text: 'Flang Modernizer v1.0.0 — LLVM Flang Static Analysis Engine', type: 'muted' },
      { text: 'Ready.', type: 'muted' },
    ]);
    setDroppedFiles([]);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (testCases[val]) {
      setEditingCode(testCases[val].code);
      setSaveStatus('');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // 1. Check if dragging files from OS
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const fileNames = files.map(f => f.name);
      setDroppedFiles(fileNames);
      triggerOverlayAnimation(fileNames, '');
      return;
    }

    // 2. Check if dragging a testcase card inside the app
    const dragData = e.dataTransfer.getData("text/plain");
    if (!dragData) return;

    if (dragData.startsWith("custom:")) {
      const customId = dragData.replace("custom:", "");
      const customFile = customFiles[customId];
      if (customFile) {
        setDroppedFiles([customFile.name]);
        triggerOverlayAnimation([customFile.name], '');
      }
    } else if (dragData === "custom_group") {
      const selectedNames = Object.entries(checkedCustomIds)
        .filter(([_, checked]) => checked)
        .map(([id, _]) => customFiles[id]?.name)
        .filter(Boolean);
      if (selectedNames.length > 0) {
        setDroppedFiles(selectedNames);
        triggerOverlayAnimation(selectedNames, '');
      }
    } else if (testCases[dragData]) {
      let fileNames: string[] = [];
      if (dragData === 'multi_common') {
        fileNames = ['common1.f', 'common2.f', 'common3.f'];
      } else {
        fileNames = [testCases[dragData].name];
      }
      setDroppedFiles(fileNames);
      triggerOverlayAnimation(fileNames, dragData);
    }
  };

  // Trigger the full screen parse tree transition animation + stream terminal output
  const triggerOverlayAnimation = (files: string[], testKey: string = '') => {
    setShowOverlay(true);
    setOverlayStep(1);
    setProgressVal(0);
    setActiveNode('');
    setCurrentReport(null); // reset stale report

    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    const fileList = files.join(', ');

    // Initial terminal burst
    appendTerminal([
      { text: ``, type: 'muted' },
      { text: `[${ts}] $ flang-modernizer analyze ${fileList}`, type: 'cmd' },
      { text: `Ingesting ${files.length} file(s): ${fileList}`, type: 'info' },
      { text: `Reading source buffers...`, type: 'muted' },
    ]);

    // Perform static analysis on custom files dynamically
    const diags: TerminalLine[] = [];
    let isAnyCustom = false;
    const isWeatherSim = files.includes('main.f') && files.includes('physics.f');

    if (isWeatherSim) {
      diags.push(
        { text: `  ✗ grid_setup.f:12 [modernize-avoid-entry] ENTRY statement INITGRID is obsolete in Fortran 2018`, type: 'error' },
        { text: `  ✗ main.f:20 [modernize-avoid-arithmetic-if] Arithmetic IF deleted in F2018; replace with IF-THEN-ELSE`, type: 'error' },
        { text: `  ✗ physics.f:24 [modernize-avoid-arithmetic-if] Arithmetic IF deleted in F2018; replace with IF-THEN-ELSE`, type: 'error' },
        { text: `  ✗ main.f:5 [modernize-require-implicit-none] IMPLICIT typing found; add IMPLICIT NONE`, type: 'warn' },
        { text: `  ✗ physics.f:8 [modernize-avoid-common-block] COMMON block /PHYSDAT/ layout mismatch detected!`, type: 'error' },
        { text: `  *** ERROR: Offset alignment collision on block /PHYSDAT/ between main.f and physics.f!`, type: 'error' },
        { text: `    main.f:    [INTEGER, INTEGER, REAL, REAL, INTEGER] (size: 20B)`, type: 'muted' },
        { text: `    physics.f: [REAL, REAL, INTEGER, INTEGER, INTEGER] (size: 20B)`, type: 'muted' },
        { text: `    Variable OMEGA (Real) at offset 0B in physics.f overlaps NX (Integer) at offset 0B in main.f!`, type: 'warn' },
        { text: `    Variable TOLR (Real) at offset 4B in physics.f overlaps NY (Integer) at offset 4B in main.f!`, type: 'warn' },
        { text: `    Variable NX (Integer) at offset 8B in physics.f overlaps OMEGA (Real) at offset 8B in main.f!`, type: 'warn' },
        { text: `    Variable NY (Integer) at offset 12B in physics.f overlaps TOLR (Real) at offset 12B in main.f!`, type: 'warn' },
        { text: `    Automatic modernization BLOCKED: compile safety hazard detected.`, type: 'error' }
      );
    } else {
      files.forEach(f => {
        const customFile = Object.values(customFiles).find(cf => cf.name === f);
        if (customFile) {
          isAnyCustom = true;
          diags.push(...analyzeCustomCode(customFile.name, customFile.code));
        }
      });
    }

    let prg = 0;
    const interval1 = setInterval(() => {
      prg += 5;
      setProgressVal(prg);
      if (prg >= 25) {
        clearInterval(interval1);

        // Step 2: Lexer
        setOverlayStep(2);
        setActiveNode('prog');
        appendTerminal([
          { text: `[Lexer]    Tokenizing source...`, type: 'info' },
          { text: `[Lexer]    Processing source layout structure...`, type: 'muted' },
          { text: `[Parser]   Building cooked character stream...`, type: 'muted' },
        ]);

        const interval2 = setInterval(() => {
          prg += 5;
          setProgressVal(prg);
          if (prg === 40) {
            setActiveNode('main');
            appendTerminal([
              { text: `[Parser]   Program unit identified: MainProgram`, type: 'info' },
              { text: `[Parser]   Entering statement list scope...`, type: 'muted' },
            ]);
          }
          if (prg >= 50) {
            clearInterval(interval2);

            // Step 3: AST
            setOverlayStep(3);
            setActiveNode('stmt');
            appendTerminal([
              { text: `[AST]      Parse tree construction complete`, type: 'success' },
              { text: `[AST]      Walking Statement nodes...`, type: 'info' },
            ]);

            const interval3 = setInterval(() => {
              prg += 5;
              setProgressVal(prg);
              if (prg === 65) {
                setActiveNode('pat');
                appendTerminal([
                  { text: `[Visitor]  Traversing AstNode leaf patterns...`, type: 'muted' },
                ]);
              }
              if (prg >= 75) {
                clearInterval(interval3);

                // Step 4: Semantic
                setOverlayStep(4);
                setActiveNode('done');

                const finalDiags: TerminalLine[] = (isWeatherSim || isAnyCustom)
                  ? diags
                  : files.flatMap(f => [
                    { text: `  ✗ ${f}:4 [modernize-avoid-arithmetic-if] Arithmetic IF deleted in F2018`, type: 'error' },
                    { text: `  ✗ ${f}:1 [modernize-avoid-fixed-form] Fixed-form layout detected`, type: 'warn' },
                  ]);

                appendTerminal([
                  { text: `[Semantic] Cross-file COMMON block analysis...`, type: 'info' },
                  { text: `[Semantic] Safety scoring complete`, type: 'success' },
                  { text: `[Diag]     Diagnostics emitted:`, type: 'info' },
                  ...finalDiags,
                ]);

                const interval4 = setInterval(() => {
                  prg += 5;
                  setProgressVal(prg);
                  if (prg >= 100) {
                    clearInterval(interval4);

                    const isReviewNeeded = finalDiags.some(d => d.type === 'error' || d.type === 'warn');

                    appendTerminal([
                      { text: `[Report]   Modernization effort: ${isReviewNeeded ? 'MODERATE' : 'TRIVIAL'}`, type: 'info' },
                      { text: `[Report]   Safety verdict: ${isReviewNeeded ? 'REVIEW NEEDED' : 'SAFE'}`, type: 'warn' },
                      { text: `[Done]     Analysis complete ✓`, type: 'success' },
                      { text: ``, type: 'muted' },
                    ]);
                    setOverlayStep(5);
                    if (isWeatherSim) {
                      setWeatherAnalyzed(true);
                    }
                    // Build and store the structured report
                    setCurrentReport(buildReport(files, testKey, customFiles));
                    setTimeout(() => {
                      setShowOverlay(false);
                    }, 800);
                  }
                }, 300);
              }
            }, 400);
          }
        }, 300);
      }
    }, 300);
  };

  const problems = [
    {
      title: "Performance Lockout",
      desc: "Legacy Fortran constructs like computed GOTOs and assumed-size arrays block compilers (like LLVM Flang) from executing modern optimizations like loop vectorization, automatic parallelization, and strict aliasing inference."
    },
    {
      title: "Silent Memory Regressions",
      desc: "Refactoring structures like COMMON blocks and EQUIVALENCE manually is highly prone to errors. Subtle differences in type declarations across files lead to dangerous, hidden memory corruption during compilation."
    },
    {
      title: "Standard Obsolescence",
      desc: "Constructs like Arithmetic IF, fixed-form column formatting, and statement functions have been officially deprecated or deleted from the Fortran 2018 standard, preventing compatibility with modern compilers."
    }
  ];

  const articles = [
    {
      title: "This Old Programming Language is Suddenly Hot Again",
      source: "ZDNet",
      date: "May 2021",
      desc: "An exploration of Fortran's unexpected resurgence in TIOBE rankings and the ongoing push by organizations like Los Alamos National Laboratory to modernize this 60-year-old language for modern HPC systems.",
      link: "https://www.zdnet.com/article/this-old-programming-language-is-suddenly-hot-again-but-its-future-is-still-far-from-certain/"
    },
    {
      title: "LLVM Flang: The Modern Compiler Gateway for HPC",
      source: "LLVM Blog",
      date: "May 2025",
      desc: "The integration of Flang into LLVM has enabled standard-compliant Fortran compilation utilizing LLVM's massive compiler optimization passes and parallel programming standards.",
      link: "https://blog.llvm.org/"
    },
    {
      title: "Fail by design: Banking's legacy of 'dark code'",
      source: "Deutsche Welle (DW)",
      date: "May 2018",
      desc: "Discusses the critical dependence of global financial systems on massive, undocumented legacy codebases and the high risks associated with outdated software infrastructures.",
      link: "https://www.dw.com/en/fail-by-design-bankings-legacy-of-dark-code/a-43645522"
    }
  ];

  const checksList = [
    {
      name: "Arithmetic IF Statements",
      code: "IF (x) 10, 20, 30",
      desc: "Detects 3-way branching arithmetic IFs and advises conversion to modern IF-THEN-ELSE structures.",
      type: "Syntactic Check"
    },
    {
      name: "Computed GOTO",
      code: "GOTO (100, 200, 300) STATE",
      desc: "Finds obsolete multi-way branching statement labels and recommends modern SELECT CASE blocks.",
      type: "Syntactic Check"
    },
    {
      name: "EQUIVALENCE Stmt",
      code: "EQUIVALENCE (A(1), B)",
      desc: "Flags unsafe memory aliasing that overlays variables of different sizes or types at the same address.",
      type: "Syntactic Check"
    },
    {
      name: "COMMON Blocks",
      code: "COMMON /physdat/ X, Y",
      desc: "Identifies global shared memory blocks that violate clean encapsulation and scopes.",
      type: "Syntactic Check"
    },
    {
      name: "Implicit Typing",
      code: "IMPLICIT REAL(A-H, O-Z)",
      desc: "Checks for absent IMPLICIT NONE declarations, reducing risk of accidental undeclared variable bugs.",
      type: "Syntactic Check"
    },
    {
      name: "Statement Functions",
      code: "F(X) = A*X + B",
      desc: "Finds single-line local functions and advises converting them to modern CONTAINS subprograms.",
      type: "Syntactic Check"
    },
    {
      name: "Fixed-Form Source",
      code: "col 1-5 label, col 6 continuation",
      desc: "Detects F77 punch-card column layout formats and flags them for conversion to free-form F90.",
      type: "Syntactic Check"
    },
    {
      name: "Assumed-Size Arrays",
      code: "REAL ARRAY(*)",
      desc: "Flags dummy arrays using * dimensions which inhibit safety bounds-checking and compiler loop optimizations.",
      type: "Syntactic Check"
    },
    {
      name: "ENTRY Statements",
      code: "ENTRY SUB_POINT(X)",
      desc: "Detects deprecated subprogram multiple-entry points that disrupt control flow structures.",
      type: "Syntactic Check"
    },
    {
      name: "Cross-File COMMON Matcher",
      code: "Signature Analyzer",
      desc: "Extracts type layouts of common blocks across all files to detect mismatching sizes and type-punning.",
      type: "Semantic Indexing"
    },
    {
      name: "Safety Risk Evaluator",
      code: "Ranked Score Reporter",
      desc: "Calculates modernization complexity scores based on safety ratings (Safe, Review-Needed, Unsafe).",
      type: "Plan Generator"
    }
  ];

  // Helper to colorize basic Fortran text for macOS editor mockup
  const formatFortranHighlight = (raw: string) => {
    return raw.split('\n').map((line, lIdx) => {
      let codeSpan = line;
      if (line.trim().startsWith('!') || line.trim().startsWith('C ')) {
        codeSpan = `<span class="comment">${line}</span>`;
      } else {
        const keywords = ['PROGRAM', 'REAL', 'INTEGER', 'DOUBLE PRECISION', 'IF', 'GOTO', 'STOP', 'END', 'SUBROUTINE', 'COMMON', 'DO', 'RETURN', 'CALL', 'DATA', 'IMPLICIT'];
        keywords.forEach(kw => {
          const reg = new RegExp(`\\b${kw}\\b`, 'g');
          codeSpan = codeSpan.replace(reg, `<span class="keyword">${kw}</span>`);
        });
      }
      return (
        <div key={lIdx} className="editor-line">
          <span className="editor-lineno">{lIdx + 1}</span>
          <span className="editor-code" dangerouslySetInnerHTML={{ __html: codeSpan }}></span>
        </div>
      );
    });
  };

  return (
    <div id="root">
      {/* Background glowing decorations */}
      <div className="bg-glow-container">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      {/* Navigation bar */}
      <nav className="navbar">
        <div className="container nav-container">
          <button className="logo nav-link-btn" onClick={() => setPage('home')}>
            <div className="logo-icon"></div>
            FLANG MODERNIZER
          </button>
          <ul className="nav-links">
            <li>
              <button
                onClick={() => setPage('home')}
                className="nav-link nav-link-btn"
                style={{ color: page === 'home' ? 'var(--accent-cyan)' : '' }}
              >
                Overview
              </button>
            </li>
            <li>
              <button
                onClick={() => setPage('tests')}
                className="nav-link nav-link-btn"
                style={{ color: page === 'tests' ? 'var(--accent-cyan)' : '' }}
              >
                Available Tests / Custom Test case
              </button>
            </li>
            <li>
              <button
                onClick={() => setPage('weather')}
                className="nav-link nav-link-btn"
                style={{ color: page === 'weather' ? 'var(--accent-cyan)' : '' }}
              >
                Weather Case Study
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* RENDER PAGE: Home Overview */}
      {page === 'home' && (
        <>
          <header id="overview" className="hero container">
            <div className="hero-badge">
              LLVM-FLANG STATIC ANALYSIS
            </div>
            <h1 className="hero-title">
              Modernizing Legacy Fortran<br />With Compiler Semantics
            </h1>
            <p className="hero-subtitle">
              Detect legacy anti-patterns, evaluate cross-file type consistency, and plan safety-prioritized code refactoring using LLVM Flang's front-end parsing engine.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button onClick={() => setPage('tests')} className="hero-cta">
                Explore
              </button>
            </div>
          </header>

          <section id="problem" className="section container">
            <div className="section-header">
              <h2 className="section-title">The Legacy Code Dilemma</h2>
              <p className="section-desc">
                Millions of lines of Fortran 77 and 90 code remain critical to high-performance computing, aerospace, and defense applications. However, their outdated constructs prevent optimization and threaten code safety.
              </p>
            </div>
            <div className="card-grid">
              {problems.map((prob, idx) => (
                <div key={idx} className="glass-panel problem-card card-padding">
                  <h3 className="card-title">{prob.title}</h3>
                  <p className="card-text">{prob.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="articles" className="section container">
            <div className="section-header">
              <h2 className="section-title">News & Industry Insights</h2>
              <p className="section-desc">
                Citations and research highlights showing why the modernization of legacy numerical code bases remains a critical computational engineering task today.
              </p>
            </div>
            <div className="news-grid">
              {articles.map((art, idx) => (
                <div key={idx} className="glass-panel news-card card-padding">
                  <div className="news-meta">
                    <span className="news-source">{art.source}</span>
                    <span>•</span>
                    <span>{art.date}</span>
                  </div>
                  <h3 className="news-title">{art.title}</h3>
                  <p className="card-text" style={{ marginBottom: '24px' }}>{art.desc}</p>
                  <a href={art.link} className="news-link" target="_blank" rel="noopener noreferrer">
                    Read Publication <ExternalLinkIcon />
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section id="deliverables" className="section deliverables">
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">What We Deliver</h2>
                <p className="section-desc">
                  We leverage the raw parser and semantic scope trees of LLVM Flang to provide static validation and safety evaluation across compilation units.
                </p>
              </div>

              <div className="card-grid" style={{ marginBottom: '60px' }}>
                <div className="glass-panel deliv-card card-padding">
                  <h3 className="card-title">9 AST Legacy Checkers</h3>
                  <p className="card-text">
                    Traverses Flang's parsed Abstract Syntax Tree using custom visitor nodes to flag deprecated or deleted syntactic patterns with precise line-number diagnostic messages.
                  </p>
                </div>
                <div className="glass-panel deliv-card card-padding">
                  <h3 className="card-title">Cross-File Semantic Index</h3>
                  <p className="card-text">
                    Builds a compiler-grade symbol index that maps memory buffers like COMMON blocks across different translation units, verifying structural layout alignment and type consistency.
                  </p>
                </div>
                <div className="glass-panel deliv-card card-padding">
                  <h3 className="card-title">Prioritized Refactor Plan</h3>
                  <p className="card-text">
                    Ranks all legacy features detected by severity, frequency, and refactoring effort, delivering a prioritized report detailing exactly what is safe to automate and what requires manual review.
                  </p>
                </div>
              </div>

              <h3 className="section-title" style={{ fontSize: '24px', marginBottom: '24px', textAlign: 'center' }}>
                Supported AST Checkers & Safety Pass Analysis
              </h3>

              <div className="checks-grid">
                {checksList.map((chk, idx) => (
                  <div key={idx} className={`glass-panel check-card ${chk.type !== 'Syntactic Check' ? 'semantic' : ''}`}>
                    <span className={`check-badge ${chk.type !== 'Syntactic Check' ? 'purple' : ''}`}>
                      {chk.type}
                    </span>
                    <h4 className="check-title">{chk.name}</h4>
                    <p className="check-desc">{chk.desc}</p>
                    <div className="check-code">{chk.code}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* RENDER PAGE: Tests & Sandbox with execute sidebar */}
      {page === 'tests' && (
        <main className="container" style={{ paddingBottom: '80px', paddingTop: '100px' }}>

          <div className="sandbox-page-layout">

            {/* LEFT / CENTER: Sandbox Workspace */}
            <div>
              <header className="page-header" style={{ padding: '0 0 32px 0', textAlign: 'left' }}>
                <h1 className="hero-title" style={{ fontSize: '42px', marginBottom: '12px' }}>
                  Modernizer Advisor Sandbox
                </h1>
                <p className="hero-subtitle" style={{ fontSize: '15px', marginBottom: '24px', margin: 0 }}>
                  Select or write code on the left, then drag test files into the Execute Arena on the right.
                </p>

                {/* Toggle Nav */}
                <div className="tab-nav" style={{ marginBottom: 0 }}>
                  <button
                    className={`tab-btn ${testTab === 'available' ? 'active' : ''}`}
                    onClick={() => setTestTab('available')}
                  >
                    Available Test Cases
                  </button>
                  <button
                    className={`tab-btn ${testTab === 'custom' ? 'active' : ''}`}
                    onClick={() => setTestTab('custom')}
                  >
                    Custom Test Case
                  </button>
                </div>
              </header>

              {/* Tab Content: Available Tests */}
              {testTab === 'available' && (
                <div className="tests-layout-grid" style={{ marginBottom: '32px' }}>
                  {/* Sidebar List */}
                  <div className="tests-sidebar">
                    <div>
                      <h3 className="test-section-title">Single File Tests</h3>
                      <div className="test-cards-list">
                        {Object.entries(testCases)
                          .filter(([_, t]) => t.type === "Single File")
                          .map(([key, t]) => (
                            <div
                              key={key}
                              className={`glass-panel test-case-card ${selectedTest === key ? 'active' : ''}`}
                              onMouseEnter={() => setHoveredTest(key)}
                              onClick={() => setSelectedTest(key)}
                              draggable="true"
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", key);
                                e.dataTransfer.effectAllowed = "copy";
                              }}
                            >
                              <div className="test-case-header">
                                <span className="test-case-name">{t.name}</span>
                              </div>
                              <p className="test-case-desc">{t.desc}</p>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="test-section-title">Multiple File Tests</h3>
                      <div className="test-cards-list">
                        {Object.entries(testCases)
                          .filter(([_, t]) => t.type === "Multiple Files")
                          .map(([key, t]) => (
                            <div
                              key={key}
                              className={`glass-panel test-case-card ${selectedTest === key ? 'active' : ''}`}
                              onMouseEnter={() => setHoveredTest(key)}
                              onClick={() => setSelectedTest(key)}
                              draggable="true"
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", key);
                                e.dataTransfer.effectAllowed = "copy";
                              }}
                            >
                              <div className="test-case-header">
                                <span className="test-case-name">{t.name}</span>
                              </div>
                              <p className="test-case-desc">{t.desc}</p>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="test-section-title">Real-World Case Study</h3>
                      <div className="test-cards-list">
                        {Object.entries(testCases)
                          .filter(([_, t]) => t.type === "Real World Case")
                          .map(([key, t]) => (
                            <div
                              key={key}
                              className={`glass-panel test-case-card ${selectedTest === key ? 'active' : ''}`}
                              onMouseEnter={() => setHoveredTest(key)}
                              onClick={() => setSelectedTest(key)}
                              draggable="true"
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", key);
                                e.dataTransfer.effectAllowed = "copy";
                              }}
                            >
                              <div className="test-case-header">
                                <span className="test-case-name">{t.name}</span>
                              </div>
                              <p className="test-case-desc">{t.desc}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* macOS Editor Visual Preview */}
                  <div className="mac-window">
                    <div className="mac-header">
                      <div className="mac-controls">
                        <div className="mac-dot close"></div>
                        <div className="mac-dot minimize"></div>
                        <div className="mac-dot maximize"></div>
                      </div>
                      <div className="mac-title">{testCases[hoveredTest]?.name || "preview.f"}</div>
                    </div>
                    <div className="mac-body">
                      <pre className="code-editor-pre">
                        {formatFortranHighlight(testCases[hoveredTest]?.code || "")}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Custom Test Case */}
              {testTab === 'custom' && (
                <div className="custom-workspace-grid">
                  {/* Left Column: Custom Tests sidebar/list */}
                  <div className="custom-tests-sidebar">
                    <div className="custom-file-creator">
                      <h3 className="test-section-title" style={{ marginTop: 0 }}>Create Custom Test</h3>
                      <div className="creation-input-wrapper">
                        <input
                          type="text"
                          className="file-input"
                          placeholder="filename.f (e.g. my_test.f)"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateCustomFile();
                            }
                          }}
                        />
                        <button className="create-btn" onClick={handleCreateCustomFile} title="Create file">
                          +
                        </button>
                      </div>
                    </div>

                    <div className="custom-files-section">
                      <div className="custom-section-header">
                        <h3 className="test-section-title">Custom Tests</h3>
                        {Object.keys(customFiles).length > 0 && (
                          <button
                            className="bulk-run-btn"
                            onClick={runSelectedCustomFiles}
                            disabled={!Object.values(checkedCustomIds).some(Boolean)}
                            title="Run all checked files together"
                          >
                            Run Selected
                          </button>
                        )}
                      </div>

                      <div className="test-cards-list custom-scroll">
                        {Object.keys(customFiles).length === 0 ? (
                          <div className="empty-custom-state">
                            No custom files yet. Type a name above to create one.
                          </div>
                        ) : (
                          Object.values(customFiles).map((file) => {
                            const isSelected = selectedCustomId === file.id;
                            const isChecked = !!checkedCustomIds[file.id];
                            return (
                              <div
                                key={file.id}
                                className={`glass-panel test-case-card custom-file-card ${isSelected ? 'active' : ''}`}
                                onClick={() => selectCustomFile(file.id)}
                                draggable="true"
                                onDragStart={(e) => {
                                  const dragData = isChecked ? "custom_group" : `custom:${file.id}`;
                                  e.dataTransfer.setData("text/plain", dragData);
                                  e.dataTransfer.effectAllowed = "copy";
                                }}
                              >
                                <div className="custom-card-left" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    className="custom-checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleCheckedCustom(file.id)}
                                  />
                                </div>
                                <div className="custom-card-middle">
                                  <span className="test-case-name">{file.name}</span>
                                  <span className="drag-hint">⋮⋮ Drag to Arena</span>
                                </div>
                                <div className="custom-card-actions">
                                  <button
                                    className="run-icon-btn"
                                    title="Run analysis on this file"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDroppedFiles([file.name]);
                                      triggerOverlayAnimation([file.name]);
                                    }}
                                  >
                                    ▶
                                  </button>
                                  <button
                                    className="delete-icon-btn"
                                    title="Delete file"
                                    onClick={(e) => handleDeleteCustomFile(file.id, e)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: VS Code-style Editor */}
                  <div className="vscode-editor">
                    {selectedCustomId && customFiles[selectedCustomId] ? (
                      <>
                        <div className="vscode-header">
                          <div className="vscode-tabs">
                            <div className="vscode-tab active">
                              <span className="tab-icon">📄</span>
                              <span className="tab-name">{customFiles[selectedCustomId].name}</span>
                            </div>
                          </div>
                          <div className="editor-controls">
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>
                              Template:
                            </span>
                            <select className="template-select" onChange={handleTemplateChange} defaultValue="">
                              <option value="" disabled>Load Template...</option>
                              <option value="arith_if">Arithmetic IF</option>
                              <option value="computed_goto">Computed GOTO</option>
                              <option value="equivalence">EQUIVALENCE</option>
                              <option value="implicit_typing">Implicit Typing</option>
                              <option value="stmt_function">Statement Function</option>
                            </select>
                          </div>
                        </div>

                        <div className="vscode-body">
                          {/* Line numbers gutter */}
                          <div className="vscode-gutter">
                            {editingCode.split('\n').map((_, idx) => (
                              <div key={idx} className="gutter-number">{idx + 1}</div>
                            ))}
                          </div>

                          {/* Code textarea */}
                          <textarea
                            className="vscode-textarea"
                            value={editingCode}
                            onChange={(e) => {
                              setEditingCode(e.target.value);
                              setSaveStatus('');
                            }}
                            spellCheck={false}
                          />
                        </div>

                        <div className="vscode-footer">
                          <div className="save-status-msg">
                            {saveStatus === 'saved' && (
                              <span className="status-success">✓ Changes saved successfully!</span>
                            )}
                          </div>
                          <button className="save-changes-btn" onClick={handleSaveCustomFile}>
                            Save Changes
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="vscode-empty-state">
                        <div className="empty-icon">📝</div>
                        <h3>No Active File</h3>
                        <p>Create a custom Fortran file on the left or select an existing one to edit.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: Long Sticky Execute Arena Sidebar */}
            <aside className="execute-sidebar">
              <h3 className="execute-sidebar-title">Execute Arena</h3>

              <div
                className={`drag-drop-zone ${isDragOver ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="drag-drop-icon">
                  📥
                </div>
                <div>
                  <p className="card-title" style={{ fontSize: '14px', marginBottom: '4px' }}>
                    Drag & Drop Files
                  </p>
                  <p className="card-text" style={{ fontSize: '11px' }}>
                    Select single or multiple files (Ctrl+Select) to parse
                  </p>
                </div>
              </div>

              {droppedFiles.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Ingested Files ({droppedFiles.length})
                    </span>
                    <button className="clear-files-btn" onClick={() => setDroppedFiles([])}>
                      Clear
                    </button>
                  </div>
                  <ul className="dropped-files-list">
                    {droppedFiles.map((name, fIdx) => (
                      <li key={fIdx} className="dropped-file-item">
                        <span>📄 {name}</span>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>READY</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Report download button — shown after analysis completes */}
              {currentReport && (
                <div className="report-cta-block">
                  <div className="report-ready-badge">
                    <span className="report-ready-dot"></span>
                    Report Ready
                  </div>
                  <button
                    id="preview-report-btn"
                    className="preview-report-btn"
                    onClick={() => setShowReportModal(true)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Preview &amp; Download Report
                  </button>
                  <p className="report-cta-hint">View full analysis report &amp; export as PDF</p>
                </div>
              )}
            </aside>
          </div>
        </main>
      )}

      {/* RENDER PAGE: Weather Simulation Multi-file Case Study */}
      {page === 'weather' && (
        <main className="container" style={{ paddingBottom: '80px', paddingTop: '100px' }}>
          <header className="page-header" style={{ padding: '0 0 32px 0', textAlign: 'left' }}>
            <h1 className="hero-title" style={{ fontSize: '42px', marginBottom: '12px' }}>
              Weather Forecast Simulation Advisor
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '15px', marginBottom: '24px', margin: 0 }}>
              Multi-file meteorological advection framework. Inspect the directories and execute static semantic analysis checks.
            </p>
          </header>

          <div className="weather-workspace-grid">
            {/* Left Column: File Explorer Tree */}
            <div className="weather-explorer-card">
              <div className="explorer-header">
                <span className="explorer-label">WEATHER PROJECT DIRECTORY</span>
              </div>
              <div className="explorer-body">
                <div className="explorer-folder">
                  <span className="folder-icon">📁</span>
                  <span className="folder-name">weather_prediction_model/</span>
                </div>
                <div className="explorer-files-list">
                  {Object.values(weatherFiles).map(file => {
                    const isSelected = selectedWeatherFileId === file.id;
                    const fileIcon = file.type === 'f' ? '📄' : file.type === 'md' ? '📝' : '⚙️';
                    return (
                      <div
                        key={file.id}
                        className={`explorer-file-item ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSelectWeatherFile(file.id)}
                      >
                        <span className="file-icon">{fileIcon}</span>
                        <span className="file-name">{file.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="explorer-actions">
                <button className="vscode-analyze-btn" onClick={handleRunWeatherAnalysis}>
                  ⚡ Analyze Project Directory
                </button>
              </div>
            </div>

            {/* Right Column: Code Editor Mockup */}
            <div className="vscode-editor" style={{ height: '480px' }}>
              {selectedWeatherFileId && weatherFiles[selectedWeatherFileId] ? (
                <>
                  <div className="vscode-header">
                    <div className="vscode-tabs">
                      <div className="vscode-tab active">
                        <span className="tab-icon">📄</span>
                        <span className="tab-name">weather_prediction_model / {weatherFiles[selectedWeatherFileId].name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="vscode-body">
                    <div className="vscode-gutter">
                      {weatherEditingCode.split('\n').map((_, idx) => (
                        <div key={idx} className="gutter-number">{idx + 1}</div>
                      ))}
                    </div>
                    <textarea
                      className="vscode-textarea"
                      value={weatherEditingCode}
                      onChange={(e) => {
                        setWeatherEditingCode(e.target.value);
                        setWeatherSaveStatus('');
                      }}
                      spellCheck={false}
                    />
                  </div>

                  <div className="vscode-footer">
                    <div className="save-status-msg">
                      {weatherSaveStatus === 'saved' && (
                        <span className="status-success">✓ Changes saved successfully!</span>
                      )}
                    </div>
                    <button className="save-changes-btn" onClick={handleSaveWeatherFile}>
                      Save Changes
                    </button>
                  </div>
                </>
              ) : (
                <div className="vscode-empty-state">
                  <div className="empty-icon">📝</div>
                  <h3>No Active File Selected</h3>
                </div>
              )}
            </div>
          </div>

          {/* Feasibility Analysis Report & Memory Offset Collision Diagram */}
          {weatherAnalyzed && (
            <div className="feasibility-dashboard glass-panel card-padding animate-fade-in" style={{ marginTop: '32px' }}>
              <div className="dashboard-header">
                <div>
                  <h2 className="section-title" style={{ fontSize: '24px', textAlign: 'left', marginBottom: '8px' }}>
                    Modernization Advisor Report
                  </h2>
                  <p className="section-desc" style={{ textAlign: 'left', margin: 0 }}>
                    Analysis results for multi-file meteorology simulation grid scopes.
                  </p>
                </div>
                <div className="feasibility-score-card">
                  <span className="score-value">48 / 100</span>
                  <span className="score-label">UNSAFE FEASIBILITY</span>
                </div>
              </div>

              <div className="dashboard-alert-banner">
                <span className="alert-icon">⚠️</span>
                <div className="alert-text">
                  <strong>Semantic Modernization Blocked:</strong> A global COMMON block layout size or type signature mismatch was detected between compilation units. Refactoring variable storage scope automatically will lead to memory corruption!
                </div>
              </div>

              <div className="dashboard-grid">
                {/* Left side details */}
                <div>
                  <h3 className="dashboard-subsection-title">Static Syntax Diagnostics</h3>
                  <table className="report-table" style={{ marginTop: '12px' }}>
                    <thead>
                      <tr>
                        <th>Check Type</th>
                        <th>Location</th>
                        <th>Severity</th>
                        <th>Auto-Fix Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Arithmetic IF statement</td>
                        <td>main.f:20</td>
                        <td><span className="badge-risk unsafe">Error</span></td>
                        <td>Available (convert to standard IF-THEN)</td>
                      </tr>
                      <tr>
                        <td>Arithmetic IF statement</td>
                        <td>physics.f:24</td>
                        <td><span className="badge-risk unsafe">Error</span></td>
                        <td>Available (convert to standard IF-THEN)</td>
                      </tr>
                      <tr>
                        <td>ENTRY procedure point</td>
                        <td>grid_setup.f:12</td>
                        <td><span className="badge-risk unsafe">Error</span></td>
                        <td>Requires Manual Split Refactoring</td>
                      </tr>
                      <tr>
                        <td>IMPLICIT scope typing</td>
                        <td>main.f:5</td>
                        <td><span className="badge-risk caution">Warning</span></td>
                        <td>Available (inject explicit types)</td>
                      </tr>
                      <tr>
                        <td>COMMON memory layout</td>
                        <td>physics.f:8</td>
                        <td><span className="badge-risk unsafe">Fatal Mismatch</span></td>
                        <td>Blocked (scoping offset collision)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right side alignment layout visualizer */}
                <div className="memory-visualizer-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 className="dashboard-subsection-title" style={{ margin: 0 }}>
                      COMMON Block Offset Visualizer (/PHYSDAT/)
                    </h3>
                    <button
                      className="bulk-run-btn"
                      onClick={() => setShowWeatherOffsetDetails(!showWeatherOffsetDetails)}
                    >
                      {showWeatherOffsetDetails ? "Hide Explanation" : "Explain Collision"}
                    </button>
                  </div>

                  <div className="memory-alignment-grid">
                    {/* main.f layout */}
                    <div className="file-layout-row">
                      <span className="row-file-label">main.f (INTEGER alignment first)</span>
                      <div className="memory-cells-strip">
                        <div className="memory-cell cell-int" style={{ width: '20%' }} title="NX (INTEGER) - 4 bytes">
                          NX<br /><span className="cell-offset">Offset 0B</span>
                        </div>
                        <div className="memory-cell cell-int" style={{ width: '20%' }} title="NY (INTEGER) - 4 bytes">
                          NY<br /><span className="cell-offset">Offset 4B</span>
                        </div>
                        <div className="memory-cell cell-real" style={{ width: '20%' }} title="OMEGA (REAL) - 4 bytes">
                          OMEGA<br /><span className="cell-offset">Offset 8B</span>
                        </div>
                        <div className="memory-cell cell-real" style={{ width: '20%' }} title="TOLR (REAL) - 4 bytes">
                          TOLR<br /><span className="cell-offset">Offset 12B</span>
                        </div>
                        <div className="memory-cell cell-int" style={{ width: '20%' }} title="MAXITR (INTEGER) - 4 bytes">
                          MAXITR<br /><span className="cell-offset">Offset 16B</span>
                        </div>
                      </div>
                    </div>

                    {/* Collision Arrows / Indicators */}
                    <div className="collision-indicators-strip">
                      <div className="indicator-arrow red-dash" style={{ left: '10%' }}>⚡ Type Mismatch</div>
                      <div className="indicator-arrow red-dash" style={{ left: '30%' }}>⚡ Type Mismatch</div>
                      <div className="indicator-arrow red-dash" style={{ left: '50%' }}>⚡ Type Mismatch</div>
                      <div className="indicator-arrow red-dash" style={{ left: '70%' }}>⚡ Type Mismatch</div>
                      <div className="indicator-arrow green-dash" style={{ left: '90%' }}>✓ Matched</div>
                    </div>

                    {/* physics.f layout */}
                    <div className="file-layout-row">
                      <span className="row-file-label">physics.f (REAL alignment first)</span>
                      <div className="memory-cells-strip">
                        <div className="memory-cell cell-real" style={{ width: '20%' }} title="OMEGA (REAL) - 4 bytes">
                          OMEGA<br /><span className="cell-offset">Offset 0B</span>
                        </div>
                        <div className="memory-cell cell-real" style={{ width: '20%' }} title="TOLR (REAL) - 4 bytes">
                          TOLR<br /><span className="cell-offset">Offset 4B</span>
                        </div>
                        <div className="memory-cell cell-int" style={{ width: '20%' }} title="NX (INTEGER) - 4 bytes">
                          NX<br /><span className="cell-offset">Offset 8B</span>
                        </div>
                        <div className="memory-cell cell-int" style={{ width: '20%' }} title="NY (INTEGER) - 4 bytes">
                          NY<br /><span className="cell-offset">Offset 12B</span>
                        </div>
                        <div className="memory-cell cell-int" style={{ width: '20%' }} title="MAXITR (INTEGER) - 4 bytes">
                          MAXITR<br /><span className="cell-offset">Offset 16B</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {showWeatherOffsetDetails && (
                    <div className="collision-explanation-box animate-fade-in">
                      <p><strong>Technical Analysis:</strong></p>
                      <p>
                        In Fortran 77, COMMON blocks share memory offsets across compilation units sequentially by bytes.
                        Here, <code>main.f</code> maps <code>NX (Integer)</code> and <code>NY (Integer)</code> to bytes 0-7, while <code>physics.f</code> maps <code>OMEGA (Real)</code> and <code>TOLR (Real)</code> to the same bytes.
                      </p>
                      <p>
                        Since an Integer binary representation differs drastically from a Floating-Point IEEE-754 representation, writing <code>NX = 128</code> in <code>main.f</code> will result in a corrupt NaN/denormal float for <code>OMEGA</code> in <code>physics.f</code>.
                      </p>
                      <p>
                        <strong>Advisor Recommendation:</strong> Rewrite variable listings in <code>physics.f</code> to match <code>main.f</code> layout offsets before converting the COMMON block to a Fortran 90 <code>MODULE</code>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      )}


      {/* ══════════════════════════════════════════════
          REPORT PREVIEW MODAL
      ══════════════════════════════════════════════ */}
      {showReportModal && currentReport && (
        <div className="report-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>

            {/* Modal Header Bar */}
            <div className="report-modal-topbar">
              <div className="report-modal-topbar-left">
                <span className="report-modal-icon">📋</span>
                <div>
                  <div className="report-modal-tool-name">FLANG MODERNIZER</div>
                  <div className="report-modal-sub">Static Analysis Report — LLVM Flang Frontend</div>
                </div>
              </div>
              <div className="report-modal-topbar-right">
                <button
                  id="download-pdf-btn"
                  className="download-pdf-btn"
                  onClick={() => {
                    if (!currentReport) return;
                    const r = currentReport;
                    const verdictColor = r.verdict === 'safe' ? '#10b981' : r.verdict === 'review' ? '#f59e0b' : '#ef4444';
                    const verdictLabel = r.verdict === 'safe' ? 'SAFE TO MODERNIZE' : r.verdict === 'review' ? 'REVIEW NEEDED' : 'UNSAFE — BLOCKED';
                    const scoreColor = r.feasibilityScore >= 80 ? '#10b981' : r.feasibilityScore >= 50 ? '#f59e0b' : '#ef4444';
                    const diagRows = r.diagnostics.map(d => `
                      <tr>
                        <td style="font-family:monospace;font-size:12px;color:#0284c7">${d.file}:${d.line}</td>
                        <td style="font-family:monospace;font-size:11px;color:#475569">[${d.rule}]</td>
                        <td style="font-size:12px">${d.message}</td>
                        <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${d.severity === 'error' ? '#fee2e2' : d.severity === 'warning' ? '#fef3c7' : '#d1fae5'};color:${d.severity === 'error' ? '#dc2626' : d.severity === 'warning' ? '#d97706' : '#059669'}">${d.severity.toUpperCase()}</span></td>
                      </tr>`).join('');
                    const impactRows = r.impactTable.map(row => `
                      <tr>
                        <td style="font-weight:600">${row.check}</td>
                        <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${row.risk === 'safe' ? '#d1fae5' : row.risk === 'caution' ? '#fef3c7' : '#fee2e2'};color:${row.risk === 'safe' ? '#059669' : row.risk === 'caution' ? '#d97706' : '#dc2626'}">${row.risk.toUpperCase()}</span></td>
                        <td style="font-family:monospace;font-size:12px">${row.effort}</td>
                        <td style="text-align:center">${row.files}</td>
                        <td style="text-align:center;font-weight:700;color:${row.score >= 15 ? '#dc2626' : row.score >= 5 ? '#d97706' : '#059669'}">${row.score}</td>
                      </tr>`).join('');
                    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${r.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Outfit:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Outfit',sans-serif;background:#fff;color:#1e293b;padding:40px;line-height:1.6}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid #0f172a;margin-bottom:32px}
    .logo{font-size:22px;font-weight:800;letter-spacing:1px;color:#0f172a}
    .logo-sub{font-size:11px;color:#64748b;margin-top:2px}
    .verdict-chip{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:800;letter-spacing:1px;background:${verdictColor}22;color:${verdictColor};border:2px solid ${verdictColor}}
    h1{font-size:20px;font-weight:700;margin-bottom:8px;color:#0f172a}
    .meta-row{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:28px}
    .meta-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px}
    .meta-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8}
    .meta-value{font-size:13px;font-weight:600;color:#334155;margin-top:2px}
    h2{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
    table{width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px}
    th{text-align:left;padding:8px 12px;background:#f1f5f9;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;border-bottom:2px solid #e2e8f0}
    td{padding:8px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
    tr:hover td{background:#f8fafc}
    .score-box{display:inline-flex;flex-direction:column;align-items:center;padding:16px 24px;border-radius:12px;border:2px solid ${scoreColor};background:${scoreColor}11;margin-bottom:24px}
    .score-val{font-size:36px;font-weight:800;color:${scoreColor}}
    .score-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${scoreColor}}
    .summary-box{background:#f8fafc;border-left:4px solid #0284c7;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:20px;font-size:13px;color:#334155}
    .rec-box{background:#fafaf0;border-left:4px solid ${verdictColor};padding:16px 20px;border-radius:0 8px 8px 0;font-size:13px;color:#334155}
    .footer-bar{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
    @media print{body{padding:24px}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">FLANG MODERNIZER</div>
      <div class="logo-sub">LLVM Flang Static Analysis Engine — Modernization Advisor</div>
    </div>
    <div class="verdict-chip">${verdictLabel}</div>
  </div>
  <h1>${r.title}</h1>
  <div class="meta-row">
    <div class="meta-item"><div class="meta-label">Files Analyzed</div><div class="meta-value">${r.files.join(', ')}</div></div>
    <div class="meta-item"><div class="meta-label">Analysis Phase</div><div class="meta-value">${r.phase}</div></div>
    <div class="meta-item"><div class="meta-label">Generated At</div><div class="meta-value">${r.timestamp}</div></div>
  </div>
  <div style="margin-bottom:28px">
    <div class="score-box">
      <div class="score-val">${r.feasibilityScore}<span style="font-size:18px">/100</span></div>
      <div class="score-label">Feasibility Score</div>
    </div>
  </div>
  ${r.diagnostics.length > 0 ? `
  <h2>Diagnostic Output</h2>
  <table>
    <thead><tr><th>Location</th><th>Rule</th><th>Message</th><th>Severity</th></tr></thead>
    <tbody>${diagRows}</tbody>
  </table>` : ''}
  ${r.impactTable.length > 0 ? `
  <h2>Modernization Impact Report</h2>
  <table>
    <thead><tr><th>Check Type</th><th>Risk</th><th>Effort</th><th>Files</th><th>Priority Score</th></tr></thead>
    <tbody>${impactRows}</tbody>
  </table>` : ''}
  <h2>Executive Summary</h2>
  <div class="summary-box">${r.summary}</div>
  <h2>Advisor Recommendation</h2>
  <div class="rec-box">${r.recommendation}</div>
  <div class="footer-bar">
    <span>Generated by Flang Modernizer v1.0.0 — LLVM Flang Static Analysis Engine</span>
    <span>${r.timestamp}</span>
  </div>
</body>
</html>`;
                    const win = window.open('', '_blank', 'width=900,height=700');
                    if (win) {
                      win.document.write(html);
                      win.document.close();
                      setTimeout(() => { win.focus(); win.print(); }, 600);
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Download PDF
                </button>
                <button className="report-modal-close" onClick={() => setShowReportModal(false)}>✕</button>
              </div>
            </div>

            {/* Report Body */}
            <div className="report-modal-body">

              {/* Title + Meta Strip */}
              <div className="report-title-strip">
                <div>
                  <h2 className="report-main-title">{currentReport.title}</h2>
                  <div className="report-meta-chips">
                    <span className="report-chip chip-blue">📁 {currentReport.files.join(', ')}</span>
                    <span className="report-chip chip-purple">⚙️ {currentReport.phase}</span>
                    <span className="report-chip chip-gray">🕐 {currentReport.timestamp}</span>
                  </div>
                </div>
                <div className="report-verdict-block">
                  <div
                    className={`report-verdict-badge verdict-${currentReport.verdict}`}
                  >
                    {currentReport.verdict === 'safe' ? '✓ SAFE TO MODERNIZE' :
                      currentReport.verdict === 'review' ? '⚠ REVIEW NEEDED' : '✕ UNSAFE — BLOCKED'}
                  </div>
                  <div className="report-score-ring">
                    <span className={`score-number score-${currentReport.verdict}`}>{currentReport.feasibilityScore}</span>
                    <span className="score-denom">/100</span>
                    <span className="score-caption">Feasibility</span>
                  </div>
                </div>
              </div>

              {/* Diagnostics Table */}
              {currentReport.diagnostics.length > 0 && (
                <div className="report-section">
                  <h3 className="report-section-title">
                    <span className="report-section-icon">🔍</span>
                    Diagnostic Output
                    <span className="diag-count">{currentReport.diagnostics.length} issue(s)</span>
                  </h3>
                  <table className="report-table report-modal-table">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>Rule ID</th>
                        <th>Message</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentReport.diagnostics.map((d, i) => (
                        <tr key={i}>
                          <td><code className="loc-code">{d.file}:{d.line}</code></td>
                          <td><code className="rule-code">[{d.rule}]</code></td>
                          <td className="diag-message">{d.message}</td>
                          <td>
                            <span className={`diag-badge diag-${d.severity}`}>
                              {d.severity.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Impact Table */}
              {currentReport.impactTable.length > 0 && (
                <div className="report-section">
                  <h3 className="report-section-title">
                    <span className="report-section-icon">📊</span>
                    Modernization Impact Report
                    <span className="diag-count">Ranked by Priority Score</span>
                  </h3>
                  <table className="report-table report-modal-table">
                    <thead>
                      <tr>
                        <th>Check Type</th>
                        <th>Risk Level</th>
                        <th>Effort</th>
                        <th>Files Affected</th>
                        <th>Priority Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...currentReport.impactTable]
                        .sort((a, b) => b.score - a.score)
                        .map((row, i) => (
                          <tr key={i}>
                            <td className="impact-check-name">{row.check}</td>
                            <td><span className={`badge-risk ${row.risk}`}>{row.risk.toUpperCase()}</span></td>
                            <td><code className="rule-code">{row.effort}</code></td>
                            <td style={{ textAlign: 'center' }}>{row.files}</td>
                            <td>
                              <span className={`priority-score score-pill-${row.score >= 15 ? 'high' : row.score >= 5 ? 'med' : 'low'}`}>
                                {row.score}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary + Recommendation */}
              <div className="report-two-col">
                <div className="report-section">
                  <h3 className="report-section-title">
                    <span className="report-section-icon">📝</span>
                    Executive Summary
                  </h3>
                  <div className="report-summary-box">{currentReport.summary}</div>
                </div>
                <div className="report-section">
                  <h3 className="report-section-title">
                    <span className="report-section-icon">💡</span>
                    Advisor Recommendation
                  </h3>
                  <div className={`report-rec-box rec-${currentReport.verdict}`}>{currentReport.recommendation}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="report-modal-footer">
                <span>Flang Modernizer v1.0.0 — LLVM Flang Static Analysis Engine</span>
                <span>{currentReport.timestamp}</span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN OVERLAY COMPILER TRANSITIONS */}
      {showOverlay && (
        <div className="fullscreen-overlay">
          <div className="overlay-content">
            {/* Flying File Drop Animation */}
            <div className="flying-file-icon">
              📄
            </div>

            {/* Laser Scanning line */}
            <div className={`scanner-line ${overlayStep >= 2 && overlayStep <= 3 ? 'active' : ''}`}></div>

            {/* Parse Tree Node Traversal Graph */}
            <div className="tree-graph-container">
              <div className={`tree-connector-line ${overlayStep >= 2 ? 'active' : ''}`}></div>

              <div className={`tree-node ${activeNode === 'prog' ? 'active' :
                overlayStep > 2 || (overlayStep === 2 && activeNode !== 'prog') ? 'completed' : ''
                }`}>
                <span>Program</span>
              </div>

              <div className={`tree-node ${activeNode === 'main' ? 'active' :
                overlayStep > 2 || (overlayStep === 2 && activeNode === 'stmt') ? 'completed' : ''
                }`}>
                <span>MainProgram</span>
              </div>

              <div className={`tree-node ${activeNode === 'stmt' ? 'active' :
                overlayStep > 3 ? 'completed' : ''
                }`}>
                <span>Statement</span>
              </div>

              <div className={`tree-node ${activeNode === 'pat' ? 'active' :
                overlayStep > 3 && activeNode !== 'pat' ? 'completed' : ''
                }`}>
                <span>AstNode</span>
              </div>
            </div>

            {/* Checklist confirmation steps and progress loader */}
            <div className="overlay-checklist">
              <div className={`checklist-item ${overlayStep === 1 ? 'active' : overlayStep > 1 ? 'done' : ''
                }`}>
                <div className="chk-indicator">
                  {overlayStep > 1 ? "✓" : "●"}
                </div>
                <span>Files Ingested & Reading buffer...</span>
              </div>

              <div className={`checklist-item ${overlayStep === 2 ? 'active' : overlayStep > 2 ? 'done' : ''
                }`}>
                <div className="chk-indicator">
                  {overlayStep > 2 ? "✓" : "●"}
                </div>
                <span>Lexical analysis & Lexer stream parsed</span>
              </div>

              <div className={`checklist-item ${overlayStep === 3 ? 'active' : overlayStep > 3 ? 'done' : ''
                }`}>
                <div className="chk-indicator">
                  {overlayStep > 3 ? "✓" : "●"}
                </div>
                <span>AST compiler parse tree node nodes created</span>
              </div>

              <div className={`checklist-item ${overlayStep === 4 ? 'active' : overlayStep > 4 ? 'done' : ''
                }`}>
                <div className="chk-indicator">
                  {overlayStep > 4 ? "✓" : "●"}
                </div>
                <span>Semantic checks complete & safety diagnostics run</span>
              </div>
            </div>

            {/* Overall Progress Loader Bar */}
            <div className="progress-container" style={{ marginTop: '40px', maxWidth: '420px' }}>
              <div className="progress-bar" style={{ width: `${progressVal}%` }}></div>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
              Progress: {progressVal}%
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <button className="footer-logo nav-link-btn" onClick={() => setPage('home')}>FLANG MODERNIZER</button>
          <p>© 2026 Flang Modernization Advisor Tool. Built on top of LLVM Flang Semantics.</p>
        </div>
      </footer>

      {/* ── FIXED BOTTOM TERMINAL BAR ── */}
      <div className={`terminal-bar ${isTerminalCollapsed ? 'collapsed' : ''}`}>
        <div
          className="terminal-bar-header"
          onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title={isTerminalCollapsed ? "Click to expand terminal" : "Click to collapse terminal"}
        >
          <div className="terminal-bar-left">
            <div className="terminal-dot" style={{ background: '#ff5f56' }}></div>
            <div className="terminal-dot" style={{ background: '#ffbd2e' }}></div>
            <div className="terminal-dot" style={{ background: '#27c93f' }}></div>
            <span className="terminal-title">TERMINAL</span>
            <span className="terminal-toggle-icon" style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
              {isTerminalCollapsed ? '▲' : '▼'}
            </span>
            <span className="terminal-session-badge">Session #{terminalSession}</span>
          </div>
          <div className="terminal-bar-center">
            <span className="terminal-bar-path">flang-modernizer — bash</span>
          </div>
          <div className="terminal-bar-right" onClick={(e) => e.stopPropagation()}>
            <button className="term-ctrl-btn" title="Clear terminal" onClick={clearTerminal}>
              Clear
            </button>
            <button className="term-ctrl-btn term-ctrl-btn--new" title="New terminal session" onClick={newTerminal}>
              + New
            </button>
          </div>
        </div>
        <div
          className="terminal-body"
          ref={(el) => { terminalRef.current = el; if (el) el.scrollTop = el.scrollHeight; }}
        >
          {terminalLines.map((line, i) => (
            <div key={i} className={`term-line term-line--${line.type}`}>
              {line.type === 'cmd'
                ? <><span className="term-prompt">❯</span> {line.text}</>
                : line.text
              }
            </div>
          ))}
          <div className="term-cursor"></div>
        </div>
      </div>
    </div>
  );
}
