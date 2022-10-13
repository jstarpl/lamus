DECLARE SUB OnDummyEvent (text$)

SUB OnDummyEvent (text$)
	LOCATE 10
	PRINT "data: ", text$
END SUB

ON EVENT("/poke") GOSUB OnDummyEvent

i=0

PRINT INP$("/peek")
OUT "/peek/somePath", "20"

PRINT ""
PRINT "Press ANY key..."

SLEEP

CLS

DO

	LOCATE 1
	PRINT "Press POKE to trigger EVENT"
	PRINT ""
	INPUT "Say "; Text$
	LOCATE 7
	PRINT Text$
	i = i + 1
	WAIT

LOOP WHILE 1=1