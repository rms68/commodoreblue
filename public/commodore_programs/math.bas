10 PRINT CHR$(147)
20 PRINT "MATH QUIZ: 5 PROBLEMS"
30 S=0
40 FOR I=1 TO 5
50   A=INT(RND(1)*10)+1
60   B=INT(RND(1)*10)+1
70   PRINT A;"+";B;"=";:INPUT R
80   IF R=A+B THEN PRINT "RIGHT!":S=S+1 ELSE PRINT "WRONG—IT'S";A+B
90 NEXT
100 PRINT "YOUR SCORE:";S;"/5"
110 END
