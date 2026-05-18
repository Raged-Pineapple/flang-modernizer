      SUBROUTINE INIT(X)
      REAL X
      X = 0.0
      RETURN
      ENTRY RESET(X)
      X = -1.0
      RETURN
      END
      PROGRAM TEST
      REAL V
      CALL INIT(V)
      WRITE(*,*) V
      STOP
      END
