# Flang Modernizer — LAPACK Case Study

## Overview
As part of the final phase, the `flang-modernizer` tool was run on core routines from the standard LAPACK library: `dgetrf.f` (LU factorization), `dgemm.f` (matrix-matrix multiplication), and `ilaenv.f` (environment settings). 

The tool successfully parsed and analyzed these real-world HPC source files and identified several legacy Fortran 77 anti-patterns. 

Below are three validated safe transformations for these legacy constructs into Modern Fortran (Fortran 90+).

---

## Transformation 1: Assumed-Size Arrays
**Files Detected In:** `dgetrf.f`, `dgemm.f`
**Tool Output:** `[modernize-avoid-assumed-size] Assumed-size dummy(*) prevents optimization; use explicit or assumed-shape`

### Context
In Fortran 77, it was common to declare array dummy arguments (parameters) with a `*` for the last dimension to indicate the array size is unknown at compile time. This is an "assumed-size" array. However, assumed-size arrays lack bounds-checking capability and inhibit compiler optimizations because the array shape is not passed to the subroutine.

### Legacy Code (from `dgemm.f`)
```fortran
      SUBROUTINE DGEMM(TRANSA,TRANSB,M,N,K,ALPHA,A,LDA,B,LDB,BETA,C,LDC)
      ...
      DOUBLE PRECISION A(LDA,*),B(LDB,*),C(LDC,*)
```

### Modernized Code
Replace `*` with `:` to create an "assumed-shape" array. The compiler will automatically pass an array descriptor containing the bounds.

```fortran
      SUBROUTINE DGEMM(TRANSA,TRANSB,M,N,K,ALPHA,A,LDA,B,LDB,BETA,C,LDC)
      ...
      DOUBLE PRECISION A(LDA,:), B(LDB,:), C(LDC,:)
```
*(Note: To use assumed-shape arrays, an explicit interface must be provided to the caller, typically by placing the subroutine inside a `MODULE`.)*

---

## Transformation 2: Computed GOTO
**Files Detected In:** `ilaenv.f`
**Tool Output:** `[modernize-avoid-computed-goto] Computed GOTO is deleted in Fortran 95; replace with SELECT CASE`

### Context
The Computed GOTO evaluates an integer expression and jumps to a statement label corresponding to that integer value in a list. It leads to spaghetti code, is difficult to maintain, and was officially marked as obsolescent in Fortran 90 and deleted in Fortran 95.

### Legacy Code (from `ilaenv.f`)
```fortran
      GO TO ( 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
     $        10, 10, 10, 10, 10, 20, 30, 40, 50, 60,
     $        70, 80, 90, 100, 110, 120 ) ISPEC
   10 CONTINUE
      ! block 1
      GO TO 130
   20 CONTINUE
      ! block 2
      GO TO 130
```

### Modernized Code
Replace the Computed GOTO with the structured `SELECT CASE` construct.

```fortran
      SELECT CASE (ISPEC)
        CASE (1:15)
          ! block 1
        CASE (16)
          ! block 2
        CASE (17)
          ! block 3
        ! ... remaining cases
      END SELECT
```

---

## Transformation 3: Fixed-Form Source Layout
**Files Detected In:** All (`dgetrf.f`, `dgemm.f`, `ilaenv.f`)
**Tool Output:** `[modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form`

### Context
Legacy Fortran requires rigid formatting designed for punch cards:
- Columns 1-5: Statement labels
- Column 6: Continuation marker (e.g., `$`)
- Columns 7-72: Actual code
- `C` or `*` in column 1: Comments

Modern Fortran (Free-form) ignores these column restrictions, allows inline comments `!`, and uses trailing `&` for continuation.

### Legacy Code
```fortran
C     This is a comment
      SUBROUTINE SUB( A, B, C, D,
     $                E, F )
      INTEGER A, B
```

### Modernized Code (Rename to `.f90`)
```fortran
! This is a comment
SUBROUTINE SUB( A, B, C, D, &
                E, F )
  INTEGER :: A, B
```
