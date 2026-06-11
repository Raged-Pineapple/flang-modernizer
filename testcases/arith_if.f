      PROGRAM TEST
      REAL X
      X = -1.0
      IF (X) 10, 20, 30
10    WRITE(*,*) 'NEGATIVE'
      GOTO 40
20    WRITE(*,*) 'ZERO'
      GOTO 40
30    WRITE(*,*) 'POSITIVE'
40    STOP
      END
