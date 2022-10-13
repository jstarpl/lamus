ResCode% = -1
DIM Data$
DIM ResponseJ AS JSON

DIM PageObjectsJ(0 TO 0) AS JSON
Page% = 0
RequestPage% = 1
Selected% = 0
View% = 0

IIIF_URL$ = ""

DECLARE SUB FullLine (text$, lines%)
DECLARE SUB EmptyKeyBuf ()

CONST ArrowLeft = (CHR$(0) + CHR$(75))
CONST ArrowRight = (CHR$(0) + CHR$(77))
CONST ArrowUp = (CHR$(0) + CHR$(72))
CONST ArrowDown = (CHR$(0) + CHR$(80))
CONST KeyA = (CHR$(97))
CONST KeyEnter = (CHR$(0) + CHR$(13))
CONST KeyEscape = (CHR$(0) + CHR$(27))

CONST ScreenWidth = 20

SUB EmptyKeyBuf ()
	WHILE INKEY$ <> ""
	WEND
END SUB

SUB FullLine (text$, lines%)
    length = LEN(text$)
	out$ = text$
	IF length / ScreenWidth > lines% THEN
		out$ = LEFT$(text$, lines% * ScreenWidth - 3) + "..."
	END IF
	PRINT out$;
	remain = ScreenWidth - (LEN(out$) MOD ScreenWidth)
	IF remain < ScreenWidth THEN
		PRINT SPACE$(remain);
	END IF
END SUB

SCREEN 1

DO

	GOSUB ViewList
	GOSUB ViewItem

LOOP WHILE 1 = 1

Header:
	CLS
	COLOR 1, 2
	PRINT " ART INSTITUTE OF   ";
	PRINT " CHICAGO            ";
	PRINT "                    "
	COLOR 0, 15
	RETURN

ViewItem:
	IF View% <> 1 THEN
		RETURN
	END IF

	GOSUB Header

	IF Selected% < 1 THEN
		PRINT "Item not found."
		RETURN
	END IF
	
	Title$ = JSONREAD$(PageObjectsJ(Selected%), "$.title", "")
	Artist$ = JSONREAD$(PageObjectsJ(Selected%), "$.artist_display", "Unknown")
	Medium$ = JSONREAD$(PageObjectsJ(Selected%), "$.medium_display", "Unknown")
	ImageId$ = JSONREAD$(PageObjectsJ(Selected%), "$.image_id")
	ImageUrl$ = IIIF_URL$ + "/" + ImageId$ + "/full/843,/0/default.jpg"

	LOCATE 5
	PRINT "Loading..."

	Image% = IMGLOAD(ImageUrl$)
	LOCATE 5
	PRINT "            "
	LOCATE 5
	IF Image% <> -1 THEN
		IMGSIZE Image%, Width, Height
		THeight = 160 * Height / Width
		IMGPUT Image%, 0, 8 * 4, 160, THeight
		LOCATE 6 + CEIL(THeight / 8.0)
	END IF

	COLOR 0
	PRINT Title$
	COLOR 11
	PRINT Artist$
	COLOR 0
	PRINT Medium$
	PRINT ""

	SLEEP
	Key$ = INKEY$
	EmptyKeyBuf
	
	IF Key$ = KeyEscape THEN
		View% = 0
	END IF

	RETURN


ViewList:
	IF View% <> 0 THEN
		RETURN
	END IF

	GOSUB Header

	IF RequestPage% <> Page% THEN
		LOCATE 5
		PRINT "Loading..."
		Page% = RequestPage%
		Selected% = 0
		FETCH "https://api.artic.edu/api/v1/artworks?page=" + STR$(Page%) + "&limit=10", ResCode%, Data$
		IF ResCode% = 200 THEN
			ResponseJ = JSON(Data$)
			JSONREAD ResponseJ, "$.data[*]", PageObjectsJ
			IIIF_URL$ = JSONREAD$(ResponseJ, "$.config.iiif_url", "")
		ELSE
			LOCATE 5
			PRINT "Failed to load: " + STR$(ResCode%)
		END IF
	END IF

	IF ResCode% = 200 THEN
		LOCATE 5
		FOR i = 1 TO LEN(PageObjectsJ)
			Title$ = JSONREAD$(PageObjectsJ(i), "$.title", "")
			Artist$ = JSONREAD$(PageObjectsJ(i), "$.artist_title", "Unknown")
			IF i = Selected% THEN
				COLOR 1, 0
			ELSE
				COLOR 0, 15
			END IF
			FullLine Title$, 2
			COLOR 11
			FullLine Artist$, 2
			COLOR 0, 15
		NEXT i
	END IF

	SLEEP
	Key$ = INKEY$
	EmptyKeyBuf
	
	IF Key$ = ArrowLeft THEN
		RequestPage% = MAX(1, Page% - 1)
	ELSE IF Key$ = ArrowRight THEN
		RequestPage% = Page% + 1
	ELSE IF Key$ = ArrowUp THEN
		Selected% = MAX(1, Selected% - 1)
	ELSE IF Key$ = ArrowDown THEN
		Selected% = MIN(LEN(PageObjectsJ), Selected% + 1)
	ELSE IF Key$ = KeyEnter THEN
		View% = 1
	END IF

	RETURN