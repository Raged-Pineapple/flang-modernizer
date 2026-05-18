      PROGRAM TEST
      INTEGER N
      N = 2
      GOTO (10, 20, 30), N
10    WRITE(*,*) 'ONE'
      STOP
20    WRITE(*,*) 'TWO'
      STOP
30    WRITE(*,*) 'THREE'
      STOP
      END
