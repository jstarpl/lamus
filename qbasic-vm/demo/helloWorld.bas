REM Very basic demo of the QBasic implementation for Lamus
REM Uses all the advanced APIs
REM ---

DECLARE SUB PrintRainbow (text$)

SUB PrintRainbow (text$)
	Length = LEN(text$)
	FOR i = 1 TO Length
		COLOR i MOD 16
        PRINT MID$(text$, i, 1);
	NEXT i
	COLOR 0, 15
END SUB

FOR i = 1 TO 1024
	Color% = RND() * 16
	LOCATE 1, 1
	PRINT "C=";
	PRINT Color%, "     "
	GTRI RND() * 160, RND() * 300, RND() * 160, RND() * 300, RND() * 160, RND() * 300, Color%
NEXT i

LOCATE 1, 1

PRINT TIME$
PRINT DATE$
PRINT "Press ANY key"
SLEEP

fileNum% = 1

DIM Sprite AS INTEGER
Sprite = IMGLOAD("test.png")
SPSET 1, Sprite
SPOFS 1, 0, 50
PrintRainbow "HELLO WORLD!"
OPEN "test" FOR OUTPUT AS fileNum%
WRITE fileNum%, "Raz", "Dwa", "Trzy", "Cztery", "Raz dwa " + CHR$(34) + "trzy" + CHR$(34) + " cztery"
CLOSE
PRINT ""
PRINT "Press ANY key"
SLEEP
PLAY "t200 o6 l8 e g > e c d g"
FOR i = 1 TO 100
	SPOFS 1, i, 50+i*2
	KeyPressed$ = INKEY$
	IF KeyPressed$ = (CHR$(0) + CHR$(27)) THEN
		PRINT "ESCAPE"
	END IF
	WAIT
NEXT i
SPCLR 1
PRINT "Enter your name:"
INPUT "What is your name"; Name$
PRINT "HELLO " + Name$
OPEN "test" FOR INPUT AS fileNum%
INPUT #1, string1$
CLOSE
PRINT string1$
SLEEP
IMGPUT Sprite, 0, 0
LOCATE 1, 1
PrintRainbow "GOOD BYE!       "
