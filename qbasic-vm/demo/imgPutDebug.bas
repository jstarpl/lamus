CONST ArrowLeft = (CHR$(0) + CHR$(75))
CONST ArrowRight = (CHR$(0) + CHR$(77))
CONST ArrowUp = (CHR$(0) + CHR$(72))
CONST ArrowDown = (CHR$(0) + CHR$(80))

imgRoad = IMGLOAD("driveBy/road.png")

DECLARE SUB DrawImage()

DIM SHARED imgRoad, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH, factor

srcX = -100
srcY = 0
srcW = 314
srcH = 258
dstX = 15
dstY = 15
dstW = 60
dstH = 60
factor = 1

SUB DrawImage()
    CLS
    IMGPUT imgRoad, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH
    LOCATE 20
    PRINT "dx=" + STR$(dstX) + " dy=" + STR$(dstY)
    PRINT "dw=" + STR$(dstW) + " dh=" + STR$(dstH)
    PRINT ""
    PRINT "sx=" + STR$(srcX) + " sy=" + STR$(srcY)
    PRINT "sw=" + STR$(srcW) + " sh=" + STR$(srcH)
END SUB

DrawImage()

DO

    KeyPressed$ = INKEY$
	IF KeyPressed$ = ArrowLeft THEN
		srcX = srcX - factor
        DrawImage()
    ELSE IF KeyPressed$ = ArrowRight THEN
        srcX = srcX + factor
        DrawImage()
    ELSE IF KeyPressed$ = ArrowUp THEN
        srcY = srcY - factor
        DrawImage()
    ELSE IF KeyPressed$ = ArrowDown THEN
        srcY = srcY + factor
        DrawImage()
    ELSE IF KeyPressed$ = "a" THEN
        dstX = dstX - factor
        DrawImage()
    ELSE IF KeyPressed$ = "d" THEN
        dstX = dstX + factor
        DrawImage()
    ELSE IF KeyPressed$ = "w" THEN
        dstY = dstY - factor
        DrawImage()
    ELSE IF KeyPressed$ = "s" THEN
        dstY = dstY + factor
        DrawImage()
    ELSE IF KeyPressed$ = "f" THEN
		srcW = srcW - factor
        DrawImage()
    ELSE IF KeyPressed$ = "h" THEN
        srcW = srcW + factor
        DrawImage()
    ELSE IF KeyPressed$ = "t" THEN
        srcH = srcH - factor
        DrawImage()
    ELSE IF KeyPressed$ = "g" THEN
        srcH = srcH + factor
        DrawImage()
    ELSE IF KeyPressed$ = "j" THEN
		dstW = dstW - factor
        DrawImage()
    ELSE IF KeyPressed$ = "l" THEN
        dstW = dstW + factor
        DrawImage()
    ELSE IF KeyPressed$ = "i" THEN
        dstH = dstH - factor
        DrawImage()
    ELSE IF KeyPressed$ = "k" THEN
        dstH = dstH + factor
        DrawImage()
    ELSE IF KeyPressed$ = "x" THEN
        factor = factor + 1
    ELSE IF KeyPressed$ = "z" THEN
        factor = factor - 1
    END IF
	WAIT

LOOP WHILE 1 = 1