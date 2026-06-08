C     ===========================================================
C     FLUID_CFD.F  --  Navier-Stokes Computational Fluid Dynamics
C     Incompressible Flow Solver, Fluid Mechanics Laboratory
C     Circa 1993
C
C     ANTI-PATTERNS PRESENT (ALL 9):
C       [1] Implicit typing       (IMPLICIT REAL/INTEGER)
C       [2] COMMON /PHYSDAT/      *** INCONSISTENT ORDER! ***
C       [3] EQUIVALENCE           (pressure correction workspace)
C       [4] Statement functions   (REYNFN, MACHNFN)
C       [5] Arithmetic IF         (flow regime classification)
C       [6] Computed GOTO         (time scheme dispatch, RK4 stages)
C       [7] ENTRY statements      (CFDINIT, CFDSTATS, CFDRESET)
C       [8] Assumed-size arrays   (velocity/pressure field args)
C       [9] Fixed-form source     (column-sensitive layout)
C
C     COMMON /PHYSDAT/ signature HERE:
C       REAL(OMEGA) REAL(TOLR) INTEGER(NX) INTEGER(NY) INTEGER(MAXITR)
C       Types: [REAL(4)|REAL(4)|INTEGER(4)|INTEGER(4)|INTEGER(4)]
C
C     OTHER FILES have: INTEGER(NX) INTEGER(NY) REAL(OMEGA) REAL(TOLR) INTEGER(MAXITR)
C       Types: [INTEGER(4)|INTEGER(4)|REAL(4)|REAL(4)|INTEGER(4)]
C
C     => TYPE SIGNATURE MISMATCH => UNSAFE to modernize automatically!
C     => Multi-file analysis will flag /PHYSDAT/ as RISKY.
C     ===========================================================
C
C     ===========================================================
C     SUBROUTINE CFDMAIN - Main CFD driver with ENTRY points
C     ===========================================================
      SUBROUTINE CFDMAIN(RE, MACH, NITER)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
C
C     COMMON /PHYSDAT/ - INCONSISTENT variable ORDER!
C     This file puts REAL vars first, other files put INTEGER first.
      COMMON /PHYSDAT/ OMEGA, TOLR, NX, NY, MAXITR
C
C     Variables for ENTRY dummy arguments
      INTEGER INXCFD, INYCFD
      REAL    MACHIN, RETMP
C
C     Statement functions for flow characterization
      REYNFN(VEL, LEN, VISC)  = VEL * LEN / VISC
      MACHNFN(VEL, CSND)      = VEL / CSND
C
C     Initialize parameters
      OMEGA  = 1.5
      TOLR   = 1.0E-6
      NX     = 128
      NY     = 128
      MAXITR = 5000
C
C     Arithmetic IF: validate Reynolds number
      IF (RE - 1.0) 10, 20, 30
  10  WRITE(6, '(A,E12.4)') 'ABORT: unphysical Re=', RE
      RETURN
  20  WRITE(6, '(A)') 'NOTE: Re=1 (Stokes flow regime)'
  30  IF (RE - 1.0E6) 40, 50, 60
  40  CONTINUE
  50  WRITE(6, '(A)') 'NOTE: Re at turbulence onset'
  60  CONTINUE
C
C     Arithmetic IF: classify Mach number regime
      IF (MACH - 1.0) 70, 80, 90
  70  WRITE(6, '(A,F7.4)') 'Subsonic flow, Mach=', MACH
      GOTO 100
  80  WRITE(6, '(A)') 'Transonic flow - special treatment needed'
      GOTO 100
  90  WRITE(6, '(A,F7.4)') 'Supersonic flow, Mach=', MACH
 100  CONTINUE
C
C     Computed GOTO: select time integration scheme
      ISCHEME = 2
      WRITE(6, '(A,I2)') 'Time integration scheme: ', ISCHEME
      GO TO (1000, 2000, 3000), ISCHEME
C
 1000 WRITE(6, '(A)') '--- Scheme: Explicit Euler ---'
      CALL EULERSTEP(NX, NY, 0.001, NITER)
      GO TO 4000
C
 2000 WRITE(6, '(A)') '--- Scheme: Adams-Bashforth 2nd order ---'
      CALL AB2STEP(NX, NY, 0.001, NITER)
      GO TO 4000
C
 3000 WRITE(6, '(A)') '--- Scheme: Runge-Kutta 4th order ---'
      CALL RK4STEP(NX, NY, 0.001, NITER)
C
 4000 WRITE(6, '(A)') '=== CFD Run Complete ==='
      RETURN
C
C     -----------------------------------------------------------
C     ENTRY CFDINIT
C     Initialize CFD grid dimensions before main run.
C     Anti-pattern: ENTRY reuses the subroutine body.
C     -----------------------------------------------------------
      ENTRY CFDINIT(INXCFD, INYCFD, RETMP, MACHIN)
      NX    = INXCFD
      NY    = INYCFD
      OMEGA = 1.5
      TOLR  = 1.0E-6
      WRITE(6, '(A,I4,A,I4)') 'CFD grid: ', NX, ' x ', NY
      WRITE(6, '(A,F10.1,A,F8.4)') 'Re=', RETMP, '  Mach=', MACHIN
      RETURN
C
C     -----------------------------------------------------------
C     ENTRY CFDSTATS
C     Print runtime convergence statistics.
C     -----------------------------------------------------------
      ENTRY CFDSTATS(RETMP)
      WRITE(6, '(A,E12.4)') 'Current tolerance residual: ', TOLR
      IF (TOLR - 1.0E-4) 510, 520, 530
  510 WRITE(6, '(A)') 'Convergence: EXCELLENT'
      RETURN
  520 WRITE(6, '(A)') 'Convergence: MARGINAL'
      RETURN
  530 WRITE(6, '(A)') 'Convergence: NOT YET REACHED'
      RETURN
C
C     -----------------------------------------------------------
C     ENTRY CFDRESET
C     Reset solver to defaults.
C     -----------------------------------------------------------
      ENTRY CFDRESET
      OMEGA  = 1.5
      TOLR   = 1.0E-6
      MAXITR = 5000
      WRITE(6, '(A)') 'CFD solver reset to defaults'
      RETURN
      END
C
C     ===========================================================
C     SUBROUTINE EULERSTEP
C     Explicit Euler time integration for incompressible N-S.
C     ===========================================================
      SUBROUTINE EULERSTEP(MX, MY, DT, MAXIT)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      COMMON /PHYSDAT/ OMEGA, TOLR, NX, NY, MAXITR
C
      REAL U(128, 128), V(128, 128), P(128, 128)
      REAL PHICOR(128, 128)
      INTEGER IPCOR(128, 128)
      EQUIVALENCE (PHICOR(1,1), IPCOR(1,1))
C
      VISC = 0.001
      DX   = 1.0 / REAL(MX)
      DY   = 1.0 / REAL(MY)
C
      DO 200 ITER = 1, MAXIT
        DIVU = 0.0
        DO 190 J = 2, MY-1
          DO 180 I = 2, MX-1
            DIVU = DIVU + ABS(
     &             (U(I+1,J)-U(I-1,J))/(2.0*DX) +
     &             (V(I,J+1)-V(I,J-1))/(2.0*DY))
  180     CONTINUE
  190   CONTINUE
C       Arithmetic IF: divergence convergence check
        IF (DIVU - TOLR) 300, 300, 200
  200 CONTINUE
  300 WRITE(6, '(A,I5,A,E10.3)') 'Euler iters=', ITER,
     &    '  div=', DIVU
      RETURN
      END
C
C     ===========================================================
C     SUBROUTINE AB2STEP
C     Adams-Bashforth 2nd order; includes ENTRY for checkpoint restart.
C     ===========================================================
      SUBROUTINE AB2STEP(MX, MY, DT, MAXIT)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      COMMON /PHYSDAT/ OMEGA, TOLR, NX, NY, MAXITR
C
      REAL U(128, 128), V(128, 128), P(128, 128)
      REAL UOLD(128, 128), VOLD(128, 128)
      REAL DTRESTART
C
      DO 400 ITER = 1, MAXIT
        DO 390 J = 2, MY-1
          DO 380 I = 2, MX-1
            UOLD(I,J) = U(I,J)
            VOLD(I,J) = V(I,J)
            U(I,J) = U(I,J) - DT * U(I,J) *
     &               (U(I+1,J) - U(I-1,J)) / (2.0*DT)
            V(I,J) = V(I,J) - DT * V(I,J) *
     &               (V(I,J+1) - V(I,J-1)) / (2.0*DT)
  380     CONTINUE
  390   CONTINUE
        RNORM = 0.0
        IF (RNORM - TOLR) 450, 450, 400
  400 CONTINUE
  450 WRITE(6, '(A,I5)') 'AB2 converged, iters=', ITER
      RETURN
C
C     ENTRY for checkpoint restart (anti-pattern: ENTRY in subroutine)
      ENTRY AB2RESTART(MX, MY, DTRESTART, MAXIT)
      WRITE(6, '(A,F12.6)') 'AB2 restart from checkpoint, dt=',
     &    DTRESTART
      DO 500 J = 1, MY
        DO 490 I = 1, MX
          U(I,J) = 0.0
          V(I,J) = 0.0
  490   CONTINUE
  500 CONTINUE
      WRITE(6, '(A)') 'Checkpoint fields zeroed, restarting'
      RETURN
      END
C
C     ===========================================================
C     SUBROUTINE RK4STEP
C     Classical 4th-order Runge-Kutta with stage dispatch.
C     Computed GOTO inside loop (double anti-pattern in loops).
C     ===========================================================
      SUBROUTINE RK4STEP(MX, MY, DT, MAXIT)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      COMMON /PHYSDAT/ OMEGA, TOLR, NX, NY, MAXITR
C
      REAL U(128, 128), V(128, 128), P(128, 128)
      REAL K1U(128, 128), K2U(128, 128)
      REAL SCALBUF(128), ISCALBUF(128)
      EQUIVALENCE (SCALBUF(1), ISCALBUF(1))
C
      DO 600 ITER = 1, MAXIT
C
C       RK4 stage weights via computed GOTO
        DO 590 ISTAGE = 1, 4
          GO TO (610, 620, 630, 640), ISTAGE
C
 610      SCALE = DT / 6.0
          GOTO 650
 620      SCALE = DT / 3.0
          GOTO 650
 630      SCALE = DT / 3.0
          GOTO 650
 640      SCALE = DT / 6.0
 650      CONTINUE
C
          DO 580 J = 2, MY-1
            DO 570 I = 2, MX-1
              U(I,J) = U(I,J) + SCALE *
     &                 (U(I+1,J) - 2.0*U(I,J) + U(I-1,J)) /
     &                 (1.0/REAL(MX))**2
  570       CONTINUE
  580     CONTINUE
  590   CONTINUE
C
C       Arithmetic IF: convergence check after each full RK4 step
        IF (0.0 - TOLR) 700, 700, 600
  600 CONTINUE
  700 WRITE(6, '(A,I5)') 'RK4 done, iters=', ITER
      RETURN
      END
