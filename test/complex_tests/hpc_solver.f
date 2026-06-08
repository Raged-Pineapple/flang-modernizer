C     ===========================================================
C     HPC_SOLVER.F  --  Multi-Method Iterative Linear System Solver
C     High Performance Scientific Computing Library, Version 3.2
C     Numerical Methods Group, circa 1987
C
C     ANTI-PATTERNS PRESENT (8 of 9):
C       [1] Implicit typing       (IMPLICIT REAL/INTEGER)
C       [2] COMMON /PHYSDAT/      (shared grid parameters)
C       [3] EQUIVALENCE           (workspace memory aliasing)
C       [4] Statement functions   (IDX2D, LAPLACN, RELERR)
C       [5] Arithmetic IF         (3-way branch validation)
C       [6] Computed GOTO         (solver method dispatch)
C       [7] Assumed-size arrays   (2D array dummy args)
C       [8] Fixed-form source     (column-sensitive layout)
C
C     COMMON /PHYSDAT/ signature: INTEGER(NX) INTEGER(NY)
C                                 REAL(OMEGA) REAL(TOLR)
C                                 INTEGER(MAXITR)
C     Types: [INTEGER(4)|INTEGER(4)|REAL(4)|REAL(4)|INTEGER(4)]
C     ===========================================================
      PROGRAM HPCSOLVER
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
C
C     Shared physics/grid parameters via COMMON block
      COMMON /PHYSDAT/ NX, NY, OMEGA, TOLR, MAXITR
C
C     Workspace buffers -- EQUIVALENCE creates memory aliasing
      REAL    RBUF(4096)
      INTEGER IBUF(4096)
      REAL    WRKSP(2048)
      EQUIVALENCE (RBUF(1), IBUF(1))
      EQUIVALENCE (RBUF(2049), WRKSP(1))
C
C     Statement functions (must precede all executable statements)
      IDX2D(II, JJ, LD)     = (JJ - 1)*LD + II
      LAPLACN(A, B, C, D)   = 0.25*(A + B + C + D)
      RELERR(UNEW, UOLD)    = ABS(UNEW-UOLD) / (ABS(UOLD)+1.E-30)
C
C     --- Initialize shared grid parameters ---
      NX     = 256
      NY     = 256
      OMEGA  = 1.85
      TOLR   = 1.0E-10
      MAXITR = 10000
C
C     Arithmetic IF: validate grid size (negative/zero/positive)
      IF (NX - 4) 10, 20, 30
  10  WRITE(6, '(A)') 'ABORT: NX < 4 is not supported'
      STOP 1
  20  WRITE(6, '(A)') 'WARN: NX=4 is minimal viable grid'
  30  CONTINUE
C
C     Arithmetic IF: validate relaxation factor
      IF (OMEGA - 2.0) 40, 50, 60
  40  CONTINUE
  50  WRITE(6, '(A)') 'WARN: omega=2.0 on stability boundary'
      GOTO 70
  60  WRITE(6, '(A)') 'ABORT: omega > 2.0 causes divergence'
      STOP 2
  70  CONTINUE
C
C     Arithmetic IF: validate convergence tolerance
      IF (TOLR - 1.0E-15) 80, 85, 90
  80  WRITE(6, '(A)') 'ABORT: tolerance below machine epsilon'
      STOP 3
  85  WRITE(6, '(A)') 'WARN: tolerance at machine epsilon'
  90  CONTINUE
C
C     Computed GOTO: dispatch to selected solver method
      ISOLV = 2
      WRITE(6, '(A,I2)') 'Executing solver method: ', ISOLV
      GO TO (1000, 2000, 3000, 4000), ISOLV
C
 1000 WRITE(6, '(A)') '--- Jacobi Iteration ---'
      CALL RUNSOLV(NX, NY, RBUF, WRKSP, TOLR, MAXITR, 1)
      GO TO 9000
C
 2000 WRITE(6, '(A)') '--- Gauss-Seidel Iteration ---'
      CALL RUNSOLV(NX, NY, RBUF, WRKSP, TOLR, MAXITR, 2)
      GO TO 9000
C
 3000 WRITE(6, '(A)') '--- SOR Iteration ---'
      CALL RUNSOLV(NX, NY, RBUF, WRKSP, TOLR, MAXITR, 3)
      GO TO 9000
C
 4000 WRITE(6, '(A)') '--- Multigrid V-Cycle ---'
      CALL RUNSOLV(NX, NY, RBUF, WRKSP, TOLR, MAXITR, 4)
C
 9000 WRITE(6, '(/,A)') '=== HPC Solver Complete ==='
      STOP
      END
C
C     ===========================================================
C     SUBROUTINE RUNSOLV
C     Solver dispatcher; U and F are assumed-size 2D arrays.
C     Computed GOTO selects Jacobi/G-S/SOR/Multigrid kernels.
C     ===========================================================
      SUBROUTINE RUNSOLV(MX, MY, U, F, TOL, MAXIT, ITYPE)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      COMMON /PHYSDAT/ NX, NY, OMEGA, TOLR, MAXITR
C     Assumed-size 2D array dummy arguments (anti-pattern)
      REAL U(MX, *), F(MX, *)
C
C     Inner method dispatch via computed GOTO
      GO TO (100, 200, 300, 400), ITYPE
C
C     ======== JACOBI ========
 100  WRITE(6, '(A,I4,A,I4)') 'Jacobi on grid ', MX, 'x', MY
      DO 150 ITER = 1, MAXIT
        RNORM = 0.0
        DO 140 J = 2, MY-1
          DO 130 I = 2, MX-1
            UNEW   = 0.25*(U(I+1,J)+U(I-1,J)+
     &               U(I,J+1)+U(I,J-1)) - 0.25*F(I,J)
            RNORM  = RNORM + ABS(UNEW - U(I,J))
            U(I,J) = UNEW
  130     CONTINUE
  140   CONTINUE
        IF (RNORM - TOL) 190, 190, 150
  150 CONTINUE
  190 WRITE(6, '(A,I6,A,E12.4)') 'Jacobi: iters=', ITER,
     &    ' resid=', RNORM
      RETURN
C
C     ======== GAUSS-SEIDEL ========
 200  WRITE(6, '(A,I4,A,I4)') 'G-S on grid ', MX, 'x', MY
      DO 250 ITER = 1, MAXIT
        RNORM = 0.0
        DO 240 J = 2, MY-1
          DO 230 I = 2, MX-1
            UOLD   = U(I,J)
            U(I,J) = 0.25*(U(I+1,J)+U(I-1,J)+
     &               U(I,J+1)+U(I,J-1)) - 0.25*F(I,J)
            RNORM  = RNORM + ABS(U(I,J) - UOLD)
  230     CONTINUE
  240   CONTINUE
        IF (RNORM - TOL) 290, 290, 250
  250 CONTINUE
  290 WRITE(6, '(A,I6,A,E12.4)') 'G-S: iters=', ITER,
     &    ' resid=', RNORM
      RETURN
C
C     ======== SOR ========
 300  WRITE(6, '(A,F5.3,A,I4,A,I4)') 'SOR w=', OMEGA,
     &    ' on grid ', MX, 'x', MY
      DO 350 ITER = 1, MAXIT
        RNORM = 0.0
        DO 340 J = 2, MY-1
          DO 330 I = 2, MX-1
            UOLD   = U(I,J)
            UBAR   = 0.25*(U(I+1,J)+U(I-1,J)+
     &               U(I,J+1)+U(I,J-1)) - 0.25*F(I,J)
            U(I,J) = (1.0-OMEGA)*U(I,J) + OMEGA*UBAR
            RNORM  = RNORM + ABS(U(I,J) - UOLD)
  330     CONTINUE
  340   CONTINUE
        IF (RNORM - TOL) 390, 390, 350
  350 CONTINUE
  390 WRITE(6, '(A,I6,A,E12.4)') 'SOR: iters=', ITER,
     &    ' resid=', RNORM
      RETURN
C
C     ======== MULTIGRID (V-cycle stub) ========
 400  WRITE(6, '(A)') 'Multigrid: coarse-grid correction'
      CALL RUNSOLV(MX/2, MY/2, U, F, TOL*10.0, 5, 2)
      CALL RUNSOLV(MX,   MY,   U, F, TOL,       5, 2)
      WRITE(6, '(A)') 'Multigrid: V-cycle complete'
      RETURN
      END
