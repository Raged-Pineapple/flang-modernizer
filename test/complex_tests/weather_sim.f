C     ===========================================================
C     WEATHER_SIM.F  --  Regional Atmospheric Simulation Model
C     Numerical Weather Prediction Framework, Meteorology Division
C     Circa 1989
C
C     ANTI-PATTERNS PRESENT:
C       [1] Implicit typing       (IMPLICIT REAL/INTEGER)
C       [2] COMMON /PHYSDAT/      (CONSISTENT with hpc_solver.f)
C       [3] ENTRY statements      (INITGRID, FINALRPT, RESETMODEL)
C       [4] Arithmetic IF         (timestep & stability checks)
C       [5] Assumed-size arrays   (field arrays as dummy args)
C       [6] Fixed-form source     (column-sensitive layout)
C
C     COMMON /PHYSDAT/ signature: INTEGER(NX) INTEGER(NY)
C                                 REAL(OMEGA) REAL(TOLR)
C                                 INTEGER(MAXITR)
C     Types: [INTEGER(4)|INTEGER(4)|REAL(4)|REAL(4)|INTEGER(4)]
C     *** CONSISTENT with hpc_solver.f and material_props.f ***
C     ===========================================================
      SUBROUTINE WEATHMAIN(NSTEPS, DT)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
C
C     COMMON /PHYSDAT/ - same order/types as hpc_solver.f
      COMMON /PHYSDAT/ NX, NY, OMEGA, TOLR, MAXITR
C
C     Local atmospheric fields
      REAL TEMP(256, 256), PRES(256, 256), QVAP(256, 256)
      REAL COURANT
C
C     Variables for ENTRY dummy arguments (F77: declared in host)
      INTEGER INXGRD, INYGRD
      REAL    INOMG, INTOL, ERMS, EMAX
C
      WRITE(6, '(A)') '=== Weather Simulation START ==='
C
C     Arithmetic IF: validate time step sign
      IF (DT - 0.0) 10, 20, 30
  10  WRITE(6, '(A)') 'ABORT: negative time step'
      RETURN
  20  WRITE(6, '(A)') 'ABORT: zero time step not allowed'
      RETURN
  30  CONTINUE
C
C     Arithmetic IF: warn on very large time step
      IF (DT - 3600.0) 40, 50, 60
  40  CONTINUE
  50  WRITE(6, '(A)') 'WARN: time step exactly 1 hour'
      GOTO 70
  60  WRITE(6, '(A)') 'WARN: time step > 1 hour, risk instability'
  70  CONTINUE
C
C     Main time-integration loop
      DO 200 ISTEP = 1, NSTEPS
        COURANT = DT * 15.0 / 1000.0
C
C       CFL stability check via Arithmetic IF
        IF (COURANT - 1.0) 100, 110, 120
 100    CONTINUE
 110    WRITE(6, '(A,I6)') 'WARN: marginal CFL at step ', ISTEP
        GOTO 130
 120    WRITE(6, '(A,I6)') 'DIVERGE: CFL > 1 at step ', ISTEP
        GOTO 200
 130    CONTINUE
C
        CALL ADVTEMP(TEMP, NX, NY, DT)
        CALL ADVPRES(PRES, NX, NY, DT)
        CALL MOISTADJ(QVAP, TEMP, NX, NY)
  200 CONTINUE
C
      WRITE(6, '(A,I6,A)') 'Completed ', NSTEPS, ' time steps'
      RETURN
C
C     -----------------------------------------------------------
C     ENTRY INITGRID
C     Initialize model grid dimensions and solver parameters.
C     Anti-pattern: ENTRY statement creates multiple entry points.
C     -----------------------------------------------------------
      ENTRY INITGRID(INXGRD, INYGRD, INOMG, INTOL)
      NX     = INXGRD
      NY     = INYGRD
      OMEGA  = INOMG
      TOLR   = INTOL
      MAXITR = 1000
      WRITE(6, '(A,I4,A,I4)') 'Grid initialized: ', NX,' x ',NY
      RETURN
C
C     -----------------------------------------------------------
C     ENTRY FINALRPT
C     Print final accuracy report with RMS and MAX errors.
C     Anti-pattern: ENTRY statement reuses subroutine body.
C     -----------------------------------------------------------
      ENTRY FINALRPT(ERMS, EMAX)
      WRITE(6, '(A,E12.4,A,E12.4)') 'RMS=', ERMS, '  MAX=', EMAX
      IF (ERMS - 1.0) 210, 220, 230
  210 WRITE(6, '(A)') 'Forecast accuracy: EXCELLENT'
      RETURN
  220 WRITE(6, '(A)') 'Forecast accuracy: ACCEPTABLE'
      RETURN
  230 WRITE(6, '(A)') 'Forecast accuracy: POOR - refine grid'
      RETURN
C
C     -----------------------------------------------------------
C     ENTRY RESETMODEL
C     Reset model to default configuration (no arguments).
C     Anti-pattern: ENTRY without arguments reuses storage.
C     -----------------------------------------------------------
      ENTRY RESETMODEL
      NX     = 64
      NY     = 64
      OMEGA  = 1.5
      TOLR   = 1.0E-4
      MAXITR = 500
      WRITE(6, '(A)') 'Model reset to default configuration'
      RETURN
      END
C
C     -----------------------------------------------------------
C     SUBROUTINE ADVTEMP
C     Upwind advection for temperature field (assumed-size 2D)
C     -----------------------------------------------------------
      SUBROUTINE ADVTEMP(TEMP, MX, MY, DT)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      REAL TEMP(MX, *)
      UX = 15.0
      DX = 1000.0
      DO 10 J = 2, MY
        DO 9 I = 2, MX
          TEMP(I,J) = TEMP(I,J) - DT*UX*(TEMP(I,J)-TEMP(I-1,J))/DX
    9   CONTINUE
   10 CONTINUE
      RETURN
      END
C
C     -----------------------------------------------------------
C     SUBROUTINE ADVPRES
C     Upwind advection for pressure field (assumed-size 2D)
C     -----------------------------------------------------------
      SUBROUTINE ADVPRES(PRES, MX, MY, DT)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      REAL PRES(MX, *)
      UY = 8.0
      DY = 1000.0
      DO 20 J = 2, MY
        DO 19 I = 1, MX
          PRES(I,J) = PRES(I,J)-DT*UY*(PRES(I,J)-PRES(I,J-1))/DY
   19   CONTINUE
   20 CONTINUE
      RETURN
      END
C
C     -----------------------------------------------------------
C     SUBROUTINE MOISTADJ
C     Saturation adjustment for water vapor (assumed-size 2D)
C     -----------------------------------------------------------
      SUBROUTINE MOISTADJ(QVAP, TEMP, MX, MY)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      REAL QVAP(MX, *), TEMP(MX, *)
      QSAT = 0.010
      LCPINV = 1.0 / 2500.0
      DO 30 J = 1, MY
        DO 29 I = 1, MX
          EXCESS = QVAP(I,J) - QSAT
C         Arithmetic IF for condensation check
          IF (EXCESS) 35, 36, 37
   35     CONTINUE
          GOTO 38
   36     QVAP(I,J) = QSAT
          GOTO 38
   37     TEMP(I,J) = TEMP(I,J) + EXCESS / LCPINV
          QVAP(I,J) = QSAT
   38     CONTINUE
   29   CONTINUE
   30 CONTINUE
      RETURN
      END
