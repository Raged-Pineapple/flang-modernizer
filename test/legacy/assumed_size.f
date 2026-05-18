      SUBROUTINE PROC(A, N)
      INTEGER N
      REAL A(*)
      INTEGER I
      DO I = 1, N
        WRITE(*,*) A(I)
      END DO
      RETURN
      END
      PROGRAM TEST
      REAL B(5)
      DATA B /1.0, 2.0, 3.0, 4.0, 5.0/
      CALL PROC(B, 5)
      STOP
      END
