10 PRINT CHR$(147)
20 DIM M$(7)
30 M$(1)="#######":M$(2)="#     #":M$(3)="# ### #"
40 M$(4)="# #   #":M$(5)="#   # #":M$(6)="#     #":M$(7)="#######"
50 PR=2:PC=2           :REM Player row/col
60 GOSUB 1000
70 GET A$:IF A$="" THEN 70
80 IF A$="W" THEN NR=PR-1:NC=PC
90 IF A$="S" THEN NR=PR+1:NC=PC
100 IF A$="A" THEN NR=PR:NC=PC-1
110 IF A$="D" THEN NR=PR:NC=PC+1
120 IF MID$(M$(NR),NC,1)<>"#" THEN PR=NR:PC=NC
130 IF PR=6 AND PC=6 THEN PRINT "YOU ESCAPED!":END
140 GOTO 60
1000 REM draw maze + player
1010 PRINT CHR$(147)
1020 FOR R=1 TO 7
1030   FOR C=1 TO 7
1040     IF R=PR AND C=PC THEN CH="*":ELSE CH=MID$(M$(R),C,1)
1050     PRINT CH;
1060   NEXT
1070   PRINT
1080 NEXT
1090 RETURN
