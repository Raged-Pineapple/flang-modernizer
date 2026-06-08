C     ===========================================================
C     MATERIAL_PROPS.F  --  Engineering Material Properties Library
C     Finite Element Analysis Toolkit, Materials Group
C     Circa 1991
C
C     ANTI-PATTERNS PRESENT:
C       [1] Implicit typing       (IMPLICIT REAL/INTEGER)
C       [2] COMMON /PHYSDAT/      (CONSISTENT with hpc_solver.f)
C       [3] EQUIVALENCE           (overlapping property tables)
C       [4] Statement functions   (THERM, BULK, SHEAR, INTERP)
C       [5] Arithmetic IF         (material ID validation)
C       [6] Assumed-size arrays   (stiffness/force vector args)
C       [7] Fixed-form source     (column-sensitive layout)
C
C     COMMON /PHYSDAT/ signature: INTEGER(NX) INTEGER(NY)
C                                 REAL(OMEGA) REAL(TOLR)
C                                 INTEGER(MAXITR)
C     Types: [INTEGER(4)|INTEGER(4)|REAL(4)|REAL(4)|INTEGER(4)]
C     *** CONSISTENT with hpc_solver.f and weather_sim.f ***
C     ===========================================================
C
C     ===========================================================
C     SUBROUTINE GETPROP
C     Retrieve material properties by integer material ID.
C     ===========================================================
      SUBROUTINE GETPROP(MATID, E, NU, RHO, ALPHA)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
C
C     COMMON /PHYSDAT/ - CONSISTENT order with hpc_solver.f
      COMMON /PHYSDAT/ NX, NY, OMEGA, TOLR, MAXITR
C
C     Property lookup tables with EQUIVALENCE (memory aliasing)
      REAL    PTAB(600)
      INTEGER IPTAB(600)
      REAL    ETAB(200), NUTAB(200), RHOTAB(200)
      EQUIVALENCE (PTAB(1),   IPTAB(1))
      EQUIVALENCE (PTAB(1),   ETAB(1))
      EQUIVALENCE (PTAB(201), NUTAB(1))
      EQUIVALENCE (PTAB(401), RHOTAB(1))
C
C     Statement functions for material property calculations
      THERM(E0, ALPH, TVAL)  = E0*(1.0 - ALPH*(TVAL - 293.15))
      BULK(EV, NUV)          = EV / (3.0*(1.0 - 2.0*NUV))
      SHEAR(EV, NUV)         = EV / (2.0*(1.0 + NUV))
      INTERP(X0, X1, TFRAC)  = X0 + TFRAC*(X1 - X0)
C
C     Arithmetic IF: reject invalid material ID
      IF (MATID - 1) 10, 20, 20
  10  WRITE(6, '(A,I6)') 'ABORT: MATID < 1, ID=', MATID
      E = 0.0
      NU = 0.0
      RHO = 0.0
      ALPHA = 0.0
      RETURN
  20  CONTINUE
C
C     Arithmetic IF: check upper bound of table
      IF (MATID - 200) 30, 40, 50
  30  CONTINUE
  40  WRITE(6, '(A)') 'INFO: last entry in material table'
      GOTO 60
  50  WRITE(6, '(A,I6)') 'ABORT: MATID > 200, ID=', MATID
      E = 0.0
      RETURN
  60  CONTINUE
C
      ITEMP = 293
C
C     Arithmetic IF: classify material group
      IF (MATID - 50) 70, 80, 90
C
C     Steel group (ID 1..49)
  70  E     = THERM(2.1E11, 1.2E-5, REAL(ITEMP))
      NU    = 0.30
      RHO   = 7850.0
      ALPHA = 1.2E-5
      WRITE(6, '(A,I4)') 'Material: Steel, ID=', MATID
      RETURN
C
C     Aluminum boundary (ID = 50)
  80  E     = THERM(7.0E10, 2.3E-5, REAL(ITEMP))
      NU    = 0.33
      RHO   = 2700.0
      ALPHA = 2.3E-5
      WRITE(6, '(A)') 'Material: Aluminum (boundary ID=50)'
      RETURN
C
C     Composite group (ID 51..200) - interpolate between Al and Steel
  90  TFRAC = REAL(MATID - 50) / 150.0
      E     = INTERP(7.0E10, 2.1E11, TFRAC)
      NU    = INTERP(0.33,   0.30,   TFRAC)
      RHO   = INTERP(2700.0, 7850.0, TFRAC)
      ALPHA = INTERP(2.3E-5, 1.2E-5, TFRAC)
      WRITE(6, '(A,F5.3,A,I4)') 'Composite mix=', TFRAC,
     &    ' ID=', MATID
      RETURN
      END
C
C     ===========================================================
C     SUBROUTINE STIFFMAT
C     Build 2D plane-stress element stiffness matrix.
C     Uses assumed-size array KE(NEN,*)
C     ===========================================================
      SUBROUTINE STIFFMAT(KE, NEN, E, NU, TH)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
C
C     Assumed-size stiffness matrix (anti-pattern)
      REAL KE(NEN, *)
      REAL D(3,3)
C
C     Statement functions for Gauss quadrature
      GAUSSWT(NG)  = 1.0
      QUADPT(NG)   = REAL(2*NG - 3) * 0.57735027
C
C     Build plane-stress constitutive matrix D
      FAC    = E / (1.0 - NU*NU)
      D(1,1) = FAC
      D(2,2) = FAC
      D(1,2) = FAC*NU
      D(2,1) = FAC*NU
      D(3,3) = FAC*(1.0-NU)*0.5
      D(1,3) = 0.0
      D(3,1) = 0.0
      D(2,3) = 0.0
      D(3,2) = 0.0
C
C     Initialize stiffness matrix
      DO 5 I = 1, NEN
        DO 4 J = 1, NEN
          KE(I,J) = 0.0
    4   CONTINUE
    5 CONTINUE
C
C     2x2 Gauss quadrature integration
      DO 20 IG = 1, 2
        DO 18 JG = 1, 2
          WT = TH * GAUSSWT(IG) * GAUSSWT(JG)
C         Accumulate B^T D B contribution (simplified)
          DO 16 I = 1, NEN
            DO 14 J = 1, NEN
              KE(I,J) = KE(I,J) + WT * D(1,1) * 0.01
   14       CONTINUE
   16     CONTINUE
   18   CONTINUE
   20 CONTINUE
      RETURN
      END
C
C     ===========================================================
C     SUBROUTINE ASSEMBLE
C     Assemble element stiffness into global system.
C     Uses assumed-size arrays KG and KE.
C     ===========================================================
      SUBROUTINE ASSEMBLE(KG, NDOF, KE, LDOF, NEN)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      REAL    KG(NDOF, *), KE(NEN, *)
      INTEGER LDOF(*)
C
      DO 40 I = 1, NEN
        IROW = LDOF(I)
C       Arithmetic IF: check row DOF validity
        IF (IROW - NDOF) 25, 26, 27
  25    CONTINUE
        GOTO 28
  26    WRITE(6, '(A,I6)') 'INFO: DOF at boundary, row=', IROW
        GOTO 28
  27    WRITE(6, '(A,I6)') 'ERROR: DOF out of range, row=', IROW
        RETURN
  28    CONTINUE
        DO 38 J = 1, NEN
          JCOL = LDOF(J)
C         Arithmetic IF: check column DOF validity
          IF (JCOL - NDOF) 31, 32, 33
  31      KG(IROW, JCOL) = KG(IROW, JCOL) + KE(I, J)
          GOTO 34
  32      KG(IROW, JCOL) = KG(IROW, JCOL) + KE(I, J)
          GOTO 34
  33      WRITE(6, '(A,I6)') 'SKIP: column DOF out of range=', JCOL
  34      CONTINUE
   38   CONTINUE
   40 CONTINUE
      RETURN
      END
C
C     ===========================================================
C     SUBROUTINE SOLVEBAND
C     Banded Gauss elimination for FEM system Kx=f.
C     Assumed-size arrays for K (banded) and f (rhs vector).
C     ===========================================================
      SUBROUTINE SOLVEBAND(KB, F, NDOF, NBND)
      IMPLICIT REAL (A-H, O-Z)
      IMPLICIT INTEGER (I-N)
      REAL KB(NDOF, *), F(*)
      REAL PIV, FAC
C
      DO 60 K = 1, NDOF-1
        PIV = KB(K, 1)
C       Arithmetic IF: check for zero pivot
        IF (PIV) 45, 46, 47
  45    CONTINUE
  46    WRITE(6, '(A,I6)') 'WARN: near-zero pivot at row ', K
        GOTO 48
  47    CONTINUE
  48    CONTINUE
        JMAX = MIN(NBND, NDOF-K)
        DO 58 I = K+1, MIN(K+NBND-1, NDOF)
          FAC = KB(I, K-I+2) / PIV
          DO 56 J = 1, JMAX
            KB(I,J) = KB(I,J) - FAC*KB(K,J+I-K)
   56     CONTINUE
          F(I) = F(I) - FAC*F(K)
   58   CONTINUE
   60 CONTINUE
C
C     Back substitution
      DO 80 K = NDOF, 1, -1
        SUM = F(K)
        DO 78 J = K+1, MIN(K+NBND-1, NDOF)
          SUM = SUM - KB(K, J-K+1)*F(J)
   78   CONTINUE
        F(K) = SUM / KB(K, 1)
   80 CONTINUE
      RETURN
      END
