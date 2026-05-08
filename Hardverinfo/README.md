# HardverInfo projekt készítője: útmutatója

Név: Buzsák Norman
Neptun kód: IVV2VH
Kurzus kód: WEBPRO-N-LA61

# HardverInfo projekt futtatásának útmutatója

## Könyvtárstruktúra

A projekt könyvtárstruktúrája az alábbi legyen:

Hardverinfo/
+---backend/
|   |   .env
|   |   .env.example
|   |   package-lock.json
|   |   package.json
|   |
|   +---prisma/
|   |       dev.db
|   |       schema.prisma
|   |
|   +---src/
|   |       auth.js
|   |       db.js
|   |       server.js
|   |       utils.js
|   |
|   \---tests/
|           api.test.js
|
\---frontend/
        app.js
        index.html
        styles.css

## Melyik állomány hová kerüljön

A projekt megfelelő működésének garantálásához a fájlokat pontosan az alábbi helyekre kell másolnod:

### Backend gyökérmappa

  backend/package.json  
    Ez a backend Node.js projekt leíró fájlja. Tartalmazza a szükséges függőségeket, valamint az indításhoz, adatbázis-kezeléshez és teszteléshez szükséges npm script-eket.

  backend/package-lock.json  
    Ez rögzíti a pontosan telepített csomagverziókat. Érdemes beillesztened, hogy ugyanazok a modulverziók települjenek, mint amelyekkel a fejlesztés történt.

  backend/.env  
    Ez a fájl tartalmazza a futtatáshoz szükséges környezeti változókat, például a portszámot, a frontend eredetét, az adatbázis elérési útját és a JWT titkot.

  backend/.env.example  
    Ez egy minta környezeti változó fájl.

### Prisma mappa

  backend/prisma/schema.prisma  
    Ez tartalmazza az adatbázis sémáját. Meghatározza a felhasználó, a bejegyzés és a komment modelleket.

  backend/prisma/dev.db  
    Ez az SQLite adatbázisfájl. Ha ezt is átadod, akkor a másik fél a meglévő adatokkal együtt tudja elindítani a projektet.

### Backend forráskód

  backend/src/server.js  
    Ez a backend fő belépési pontja. Itt találod az API végpontokat, a middleware-eket és a szerver indítását.

  backend/src/auth.js  
    Ez felel a JWT token létrehozásáért és a hitelesítési middleware működéséért.

  backend/src/db.js  
    Ez biztosítja a Prisma kliens csatlakozását az adatbázishoz.

  backend/src/utils.js  
    Ez segédfüggvényeket tartalmaz, például a slug létrehozásához használt függvényt.

### Tesztek

  backend/tests/api.test.js  
    Ez tartalmazza az automatikus backend teszteket. Segítségével ellenőrizheted a projekt helyes működését.

### Frontend

  frontend/index.html  
    Ez a frontend belépési oldala.

  frontend/app.js  
    Ez tartalmazza a frontend működéséhez szükséges JavaScript logikát.

  frontend/styles.css  
    Ez a frontend megjelenéséhez szükséges stíluslap.

## Telepítés és futtatás

A projekt indítása előtt a következő lépéseket kell végrehajtanod. Ajnálott powershell terminálban kiadni a parancsokat.

### 1. Belépés a backend mappába

cd ./backend/

### 2. Szükséges modulok telepítése

npm install

Ez a parancs a package.json és package-lock.json alapján telepíti a szükséges Node.js modulokat.

### 3. Prisma kliens generálása

npm run prisma:generate

Fontos, hogy a terminál felkínálja a Prisma frissebb verzióját, de azt ne telepítsd. Maradj az 5.13.0 számú verziónál.

### 4. Adatbázis létrehozása vagy frissítése

npm run db:push

Ez a parancs a schema.prisma alapján létrehozza vagy frissíti az adatbázis szerkezetét.

### 5. Backend indítása

npm start

Vagy

npm run dev

Ezután a backend a src/server.js fájl alapján elindul.

## Opcionális parancsok

### Tesztek futtatása

npm test

Ezt továbbra is a ./backend/ könyvtárban kell futtattni. Itt lefutnak az API tesztek.

## Megjegyzés

A frontend külön telepítést nem igényel, mivel statikus fájlokból áll. A backend sikeres indítása után a frontend az index.html megnyitásával használható.