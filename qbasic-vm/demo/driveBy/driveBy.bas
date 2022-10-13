REM DriveBy v0.1
REM A RunOut clone in QBasic for Lamus Basic
REM ---

CONST TRUE = -1
CONST FALSE = NOT TRUE

DIM Track(0 TO 99)

CONST ArrowLeft = (CHR$(0) + CHR$(75))
CONST ArrowRight = (CHR$(0) + CHR$(77))
CONST ArrowUp = (CHR$(0) + CHR$(72))
CONST ArrowDown = (CHR$(0) + CHR$(80))
CONST KeyA = (CHR$(97))
CONST KeyS = (CHR$(115))
CONST KeyE = (CHR$(101))
CONST KeyD = (CHR$(100))
CONST KeyM = (CHR$(109))
CONST KeyX = (CHR$(120))

COLOR 1, 0, 0
CLS

DECLARE SUB DrawRoad (t)
DECLARE SUB EmptyKeyBuf ()
DECLARE FUNCTION ZeroIsTen (val)

SUB EmptyKeyBuf ()
	WHILE INKEY$ <> ""
	WEND
END SUB

DIM SHARED imgRoad, imgCar, imgSky, imgFont
imgRoad = IMGLOAD("road.png")
imgCar = IMGLOAD("fiat126p.png")
imgSky = IMGLOAD("sky.png")
imgFont = IMGLOAD("cool-font.png")

DIM SHARED turn, level, slide, speed
lastPeriod# = TIMER
lastF = 0

turn = 0
level = 0
slide = 22
speed = 0

moveFactor% = 0

SCREEN 1

CONST carSprite = 1
' Set imgCar as Sprite carSprite (1)
SPSET carSprite, imgCar, 13
' Set home position for the sprite to be 46,44 - i.e. this pixel of the sprite will be given it's position as specified
' by SPOFS
SPHOME carSprite, 40, 44
' Place sprite at 80, 280 of the screen
SPOFS carSprite, 80, 280

CONST hudD1Sprite = 97
CONST hudD2Sprite = 98
CONST hudD3Sprite = 99

SPSET hudD1Sprite, imgFont, 46
SPSET hudD2Sprite, imgFont, 46
SPSET hudD3Sprite, imgFont, 46

SPOFS hudD1Sprite, 46, 8
SPOFS hudD2Sprite, 80, 8
SPOFS hudD3Sprite, 115, 8

SPANIM hudD1Sprite, 10, 10
SPANIM hudD2Sprite, 10, 10
SPANIM hudD3Sprite, 10, 10

SPHIDE hudD1Sprite
SPHIDE hudD2Sprite

' Paint initial sky background
GFILL 0, 0, 160, 300, 3

FUNCTION ZeroIsTen (val)
    IF val = 0 THEN
		ZeroIsTen = 10
	ELSE
		ZeroIsTen = val
    END IF
END FUNCTION

SUB DrawRoad (time)
	IMGPUT imgSky, -160 - (turn / 10) - (slide / 20), 20 - level

	Horizon = 180 - level
	imgWidth = 400
	imgHeight = 200
	roadMaxValue = (300 - Horizon + level - 1)
	j = 0
	FOR i = 0 TO roadMaxValue
		DIM Perspective AS SINGLE
		REM INT(240 - ((i / roadMaxValue) * 280))
		Perspective = INT(100 - 20 * SQR(i))
		IMGPUT imgRoad, 0, (Horizon + i - level), 160, 1, (120 - (Perspective / 2)) + (turn - (turn * (i / roadMaxValue))) + slide, ABS(j - time) MOD 200, (160 + Perspective), 1
		delta = INT(((1 - (i / roadMaxValue)) ^ 2) * 10)
		IF delta < 1 THEN
			delta = 1
		END IF
		INC j, delta
	NEXT i
END SUB

SongPtr:
DATA "Epic Sax", "t132v127o5a+8.r4r16a+16r16a+16a+16g+16a+8r16a+8.r4r16a+16r16a+16a+16g+16a+8r16a+8.r8.>c16c+8.<a+8r8g+4f+8r8d+8d+8f8f+8d+8,v100o3d+8r4d+8r4d+8r8<b8r4b8r4b8r8f+8r4f+8r4f+8r8a+8r4a+8r4a+8r8,v60o6d+32r32d+32r32d+8d+32r32d+32r32d+8d+32r32d+32r32d+8d+32r32d+32r32d+8f+32r32f+32r32f+8f+32r32f+32r32f+8f+32r32f+32r32f+8f+32r32f+32r32f+8d+32r32d+32r32d+8d+32r32d+32r32d+8d+32r32d+32r32d+8d+32r32d+32r32d+8a+32r32a+32r32a+8a+32r32a+32r32a+8a+32r32a+32r32a+8a+32r32a+32r32a+8"
DATA "Unknown", "t152o5b2a1a8f+4.b4f+8f+4e4f+1f+2f+8d4.c+4.<b1b2.>b2a1a8f+4.>d4c+4<b8a4f+1f+2<b8>d8d8<b8>d2d8d8d8<b8>d4<b4>d1d1,o3b8b8>f+8<b8>f+8f+8<b8>f+8<b8b8>f+8<b8>>c+8c+8c+8<<d8g8g8>d8<g8g8g8>a8<g8b8b8>f+8<b8b8b8>f+8<b8b8b8>f+8<b8b8b8>f+8<b8d8d8>f+8<d8>f+8f+8<d8>f+8f+8<d8>f+8<d8>f+8f+8f+8<d8b8b8>f+8<b8>f+8f+8<b8>f+8<b8b8>f+8<b8>>c+8c+8c+8<<d8g8g8>d8<g8g8g8>a8<g8b8b8>f+8<b8b8b8>f+8<b8b8b8>f+8<b8b8b8>f+8<b8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8"
DATA "Journey – Don't Stop Believin'", "l8g+c-g+c-g+c-g+c-f+c-f+c-f+c-f+c-e<g+>e<g+>e<g+>e<g+>e<a>e<g+>e<a>e<a>g+<b>g+<b>g+<b>g+<b>f+<b>f+<b>f+<b>f+<b>e<g+>e<g+>e<g+>e<g+>e<a>e<g+>e<a>e<al1.rrrrrrrrrrr1r2l8>c+c+2c+c+e2ee2eeeeb4al4.g+f+4c+c+2c+8c+e4f+8e8f+l8g+e2e>d+r4e2e,o4l1.rrrrrr2r2r4l8>g+ef+f+4g+4.r2r4eeeeb4bg+4f+4.r2rc-g+ef+f+4g+4g+32f+.ee32f+4.g+4.e2.r1r4g+ef+f+4g+4.r2r4eeeeb4bg+4f+4.r2rc-g+ef+f+4g+4g+32f+.ee32f+4g+l4.f+g+8f+g+8g+16f+16e2f+er4f+g+r2r4l8eeeeb4al4.g+g+4f+er4f+g+4f+8e8f+g+8e,o3e2l8ef+g+b2.>c+d+c+2.d+e<a2.>d+e<e2.f+g+b2.>c+d+<g+2.g+g+a2.>d+e4l2bbbb>c+c+c+c+<bg+bbbb>c+c+<bbbb>c+c+c+c+<bg+bbbb>c+c+4c+4"
DATA "Metallica - Nothing Else Matters", "v120t74l8o4<e>g<>b>e<bg<e>gb>gl16<g>e<bg>f+8<d>gd<g>e8d<g<gf+e8>g8b8>g8<g>e<bg>f+8<d>d<ag>d8<g>d<<gf+e8>g8b8>g8<g>e<bg>f+8<d>gd<gl8>gd<g<g>g>gf+<c-16>f+16<b<e>gb>e<bg<e>gb>e<b<g16f+16e>gb>gl16<g>e<bg>f+8<d>gd<g>e8d<g<gf+e8>g8b8>g8<g>e<bg>f+8<d>d<ag>d8<g>d<<gf+e8>g8b8>g8<g>e<bg>f+8<d>gd<gl8>gd<g<g>g>gf+<c-16>f+16<b<e>gb>e<bg<e>gb>e<b<g16f+16e>gb>gl16<g>e<bg>f+8<d>gd<g>e8d<g<gf+e8>g8b8>g8<g>e<bg>f+8<d>d<ag>d8<g>d<<gf+e8>g8b8>g8<g>e<bg>f+8<d>gd<gl8>gd<g<g>g>gf+<c-16>f+16<b<e>gb>e<bg>e4.e4.f+.l16f+rf+gf+8e8f+e4.e4.f+8.f+rf+gf+8e8f+e4.e4.f+8f+f+l8f+e2.,v105l1.o2r2r4e4l16>ere4erd4drc4<gf+e4>ere4erd4drc4<gf+e4>ere4erd4drl4.c<gbe2.e2r8l16gf+e4>ere4erd4drc4<gf+e4>ere4erd4drc4<gf+e4>ere4erd4drl4.c<gbe2.e2r8l16gf+e4>ere4erd4drc4<gf+e4>ere4erd4drc4<gf+e4>ere4erd4drl4.c<gbe2r8g16f+16b+a>d8.l16ddddd8d8dc4.<a4.,v110l4.o4rregf+e4o4g8o3egf+e4o3g8o5egf+g4o3g8>>gf+l2.>er<gl8.abg4.r2r4abb+4.b2.abl4.ggf+e2.r1l8<gg16aa16gf+.e.e4.r4gg16aa16gf+.d.d4.r4gg16aa16gf+.g.e4.dl16c-c<b8r8bb+l8b>e>ef+gf+egf+<e"
DATA "Metallica - Smells Like Teen Spirit", "v120t240l1.rrrrrrrrrrrrrrrrrrrrrl2rrc4d+f<g+.>d+4fd+4c+4c.c+4c<a+g+.a+4b+a+4g+4g.>c4d+f<g+.>d+4fd+4c+4c.c+4c<a+g+.a+4b+l4a+g+gf2g+g2.g+g2.g+g2g+ggf2g+g2.g+g2.g+g2g+ggf2g+g2.g+g2.g+g2g+ggf2g+g2.g+g2.g+g2rl2c+<f4.f8f4l16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+rl4>c+c+c<f.f8fl16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+rl4>c+c+c<f.f8fl16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+rl4>c+c+c<f.f8fl16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+rl4>c+c+c<f.f8fl16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+rl4>c+c+c<f.f8fl16frfrfrfrl4a+a+gg+.g+8g+l16frfrfrfrl4>c+c+c<ff2f8f8f+f+>c+.r8<ff2l8ffa+a+a+a+g+g+f+f+f4f2fff+4f+4>c+4.r<f4f2ffa+a+a+a+g+g+f+f+,l1.rrrrr>c+2<f4.f8f4l16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+rl4>c+c+c<f.f8fl16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+rl4>c+c+c<f.f8fl16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+rl4>c+c+c<f.f8fl16frfrfrfrl4a+a+gg+.g+8g+l16g+rg+rg+rg+r>c+4c+4c4l1.rrrrrrrrrrrrrrrrl2cfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcl4>gg2f1a+a+a+2g+1c+c+c+2c1a+a+a+2g+1g+gg2f1a+a+a+2g+1c+c+c+2c1a+a+a+2g+1g+gg2f1a+a+a+2g+1c+c+c+2c1a+a+a+2l1g+g+g+g+4>c+2rrl1.rc+2,o3l4f.f8ff32rr8r16r32a+a+gg+.g+8g+r2>c+c+c<f.f8fr2a+a+gg+.g+8g+r2>c+c+c<<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+c+c+c<ffffa+a+a+a+g+g+g+g+>c+ro3l4>c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<f.f8fffa+a+gg+.g+8g+g+g+>c+c+c<ff2f8f8f+f+c+2ff2f8f8a+a+g+f+ff2f8f8f+f+c+2ff2f8f8a+a+g+f+"
DATA "A-Ha - Take On Me", "t155>f+8f+8d8<b4b4>e4e4e8g+8g+8a8b8a8a8a8e4d4f+4f+4f+8e8e8f+8e8f+8f+8d8<b4b4>e4e4e8g+8g+8a8b8a8a8a8e4d4f+4f+4f+8e8e8f+8e4,t155>d2.d8d1d8e2.e8c+2c+8<a2>d2.d8d1d8e2.e8c+2c+8<a2"

REM DIM SHARED song
REM song = 0

REM SUB NextSong ()
REM 	song = (song + 1) MOD 2
REM 	IF song = 0 THEN
REM 		BGMPLAY Song0$
REM 	ELSE IF song = 1 THEN
REM 		BGMPLAY Song1$
REM 	END IF
REM END SUB

RESTORE SongPtr
READ Title$, Song$
' BGMPLAY Song$

' Flag to indicate the player is braking
brake = 0
' Flag to indicate the player is turning (sliding)
sliding = 0
' Flag to indicate if the car is skidding/lost traction
skid = 0
beginSkid = 0
' Acceleration
accel# = 0
maxAccel# = 10
maxSpeed = 25

t = 0
f = 0

' ### Main game loop
DO
	DrawRoad(t)

	IF f MOD 60 = 0 THEN
		lastPeriod# = TIMER
		lastF = f
	END IF
	
	LOCATE 1, 1

	fps = 0
	
	IF f - lastF <> 0 THEN
		fps = INT((f - lastF) / (TIMER - lastPeriod#))
	END IF
	moveFactor% = INT(ABS(speed) / 5.0)
	IF (speed <> 0) AND (f MOD (5 - (ABS(speed) MOD 5)) = 0) THEN
		moveFactor% = moveFactor% + 1
	END IF

	GOSUB GameHUD
	' GOSUB DebugHUD

	IF skid = 0 THEN
		GOSUB HandleKeys
		GOSUB HandleDrive
		GOSUB HandleEngineSound
	ELSE IF skid = 1 THEN
		EmptyKeyBuf
		GOSUB HandleSkidBegin
	ELSE IF skid = 2 THEN
		EmptyKeyBuf
		GOSUB HandleSkidEnd
	END IF
	
	INC f
	IF speed >= 0 THEN
		t = t + moveFactor%
	ELSE
		t = t - moveFactor%
	END IF

	WAIT 2
LOOP WHILE 1 = 1
' ###

HandleKeys:
	KeyPressed$ = INKEY$
	IF KeyPressed$ = KeyA THEN
		turn = turn - moveFactor%
	ELSE IF KeyPressed$ = KeyS THEN
		turn = turn + moveFactor%
	ELSE IF KeyPressed$ = KeyE THEN
		level = MIN(21, level + moveFactor% / 3.0)
	ELSE IF KeyPressed$ = KeyD THEN
		level = MAX(-21, level - moveFactor% / 3.0)
	ELSE IF KeyPressed$ = ArrowLeft THEN
		slide = slide - moveFactor%
		sliding = 20
	ELSE IF KeyPressed$ = ArrowRight THEN
		slide = slide + moveFactor%
		sliding = -20
	ELSE IF KeyPressed$ = ArrowUp THEN
		accel# = MIN(accel# + 1, maxAccel#)
		brake = 0
	ELSE IF KeyPressed$ = ArrowDown THEN
		accel# = 0
		brake = 10
	ELSE IF KeyPressed$ = KeyM THEN
		REM NextSong
	ELSE IF KeyPressed$ = KeyX THEN
		skid = 1
	END IF
	RETURN

HandleDrive:
	brake = MAX(0, brake - 1)
	' acceleration inertia
	accel# = MAX(0, accel# - 0.1)

	IF f MOD 5 = 0 THEN
		IF speed <= 25 OR accel# <= 8.0 OR brake > 0 THEN
			speed = MAX(0, speed - 1 - (brake / 2))
		END IF

		IF speed < 5 THEN
			speed = MIN(maxSpeed, speed + INT(accel# / 3.0))
		ELSE IF speed > 15 THEN
			IF accel# > 8.0 AND f MOD 20 = 0 THEN
				speed = MIN(maxSpeed, speed + 1)
			END IF
		ELSE IF speed > 17 THEN
			IF accel# > 8.0 AND f MOD 35 = 0 THEN
				speed = MIN(maxSpeed, speed + 1)
			END IF
		ELSE IF speed > 20 THEN
			IF accel# > 8.0 AND f MOD 50 = 0 THEN
				speed = MIN(maxSpeed, speed + 1)
			END IF
		ELSE
			speed = MIN(maxSpeed, speed + INT(accel# / 2.0))
		END IF
	END IF

	' Decide if we are going up a hill. If we are, then use the next five cells of the sprite
	spriteBase = 1
	IF level > 7 THEN
		spriteBase = 5
	END IF

	' If we are braking, show the break sprite
	IF brake > 0 THEN
		SPANIM carSprite, 13, 13, 0
	ELSE IF brake = 0 THEN
		SPANIM carSprite, spriteBase, spriteBase, 0
	END IF

	' Decide which sprite cell to choose from for turning (how big the turn should be)
	spriteStep = MIN(3, ABS(speed / 7))

	IF sliding > 0 THEN
		' Decrease the turn amount
		sliding = MAX(0, sliding - 1)
		' If halfway in the turn, change the turn sprite cell
		IF sliding < 10 THEN
			spriteStep = spriteStep / 2
		END IF
		IF speed > 0 THEN
			' Set sprite scaling to 1,1 for regular drawing
			SPSCALE carSprite, 1, 1
		ELSE IF speed < 0 THEN
			' Driving in reverse, we should flip the sprite horizontally
			SPSCALE carSprite, -1, 1
		END IF
		' Set the sprite cell, give start and end as the same cell
		SPANIM carSprite, spriteBase + spriteStep, spriteBase + spriteStep, 0
	ELSE IF sliding < 0 THEN
		sliding = MIN(0, sliding + 1)
		IF sliding > -10 THEN
			spriteStep = spriteStep / 2
		END IF
		IF speed > 0 THEN
			SPSCALE carSprite, -1, 1
		ELSE IF speed < 0 THEN
			SPSCALE carSprite, 1, 1
		END IF
		SPANIM carSprite, spriteBase + spriteStep, spriteBase + spriteStep, 0
	ELSE IF sliding = 0 THEN
		SPSCALE carSprite, 1, 1
	END IF
	RETURN

HandleEngineSound:
	IF f MOD (10 - MIN(5, INT(speed / 10))) = 0 THEN
		SOUND 5 + MAX(0, INT(speed / 10)), 75, 64
	END IF
	RETURN

HandleSkidBegin:
	SPANIM carSprite, 10, 12, 10, 1, TRUE, 1
	accel# = 0
	skid = 2
	beginSkid = TIMER 
	RETURN

HandleSkidEnd:
	IF f MOD 4 = 0 THEN
		speed = MAX(0, speed - 1)
	END IF
	IF (speed = 0) AND ((TIMER - beginSkid) > 3) THEN
		skid = 0
		beginSkid = 0
	END IF
	RETURN

GameHUD:
	displaySpeed = speed * 4.53
	IF displaySpeed >= 100 THEN
		SPSHOW hudD1Sprite
		spriteNum = ZeroIsTen(FLOOR(displaySpeed / 100) MOD 10)
		SPANIM hudD1Sprite, spriteNum, spriteNum
	ELSE
		SPHIDE hudD1Sprite
	END IF

	IF displaySpeed >= 10 THEN
		SPSHOW hudD2Sprite
		spriteNum = ZeroIsTen(FLOOR(displaySpeed / 10) MOD 10)
		SPANIM hudD2Sprite, spriteNum, spriteNum
	ELSE
		SPHIDE hudD2Sprite
	END IF

	spriteNum = ZeroIsTen(displaySpeed MOD 10)
	SPANIM hudD3Sprite, spriteNum, spriteNum

	GFILL 0, 0, 160, 6, 0
	GFILL 1, 1, INT(158 * (accel# / maxAccel#)), 2, 6
	speedColor = 7
	IF brake > 0 THEN
		speedColor = 2
	END IF
	GFILL 1, 3, INT(158 * (speed / maxSpeed)), 4, speedColor

	RETURN

DebugHUD:
	PRINT "FPS=";
	PRINT fps, "   "
	PRINT "A=";
	PRINT INT(accel#), "  ";
	IF brake > 0 THEN
		PRINT "B"
	ELSE
		PRINT " "
	END IF
	PRINT "SP=";
	PRINT speed, "   "
	RETURN