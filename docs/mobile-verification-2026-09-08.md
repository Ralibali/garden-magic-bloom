# Mobilverifiering 8 september 2026

## Installerat bygge och miljö

Simulator: iPhone 17e, iOS 26.5. Installerad app från commit `1548c49fc6fe7c16edf2972fa585218c3ebb708d`, GitHub Actions-körning `34245863963`. Arkivets SHA-256 verifierades före installation. Appen är inte distributionssignerad och testet bevisar inte funktion på en fysisk telefon.

## Verifierat i den installerade appen

- Appen öppnar fältdagboken utan konto. Hero-rubrikens kontrast och synlig sparaknapp i den nya dialoglayouten är kontrollerade.
- Ett utkast med titel ”UI-test tomater”, plats ”Växthuset” och svensk anteckningstext överlevde full appstängning, omstart och uppdatering av appen.
- Öppet utkast behöll en ändrad text vid bakgrund/återgång.
- Nekad kamera- och bildbiblioteksåtkomst förlorade inte anteckningstexten.
- Spara stängde editorn och gav en anteckning och en odlingsplats i räknarna.
- Flytt till papperskorgen tog bort anteckningen från Allt. Kortet gick inte att öppna för redigering i papperskorgen.
- Återställ tog bort kortet från papperskorgen. Efter full appstängning och omstart visades anteckningen igen under Allt, med samma titel, plats och text.
- JSON-export öppnade iOS delningsdialog och kunde sparas under På min iPhone. Filen visades som 536 byte i systemets filväljare. Den valdes för återläsning; befintlig anteckning behölls utan dubblett.

Testet använde en lokal testanteckning utan foto och utan aktiv påminnelse. Inga riktiga kundposter, konton eller molnbilder ändrades. Testanteckning och exporterad fil finns kvar i simulatorn.

## Funnen följdfix

Vid nekad bildåtkomst kunde en bakgrundsflush vänta på fotooperationen och tolka dess avslag som ett lagringsfel. Utkastet hade redan sparats före bildväljaren, men ett missvisande felmeddelande visades. Flushern väntar nu in operationens avslut även när den misslyckas, och försöker sedan spara aktuell text. Själva sparfelet fortsätter att propagateras.

Två regressionstester täcker nekad fotoåtkomst under bakgrundsflush samt ett riktigt lagringsfel efter samma avslag. Båda passerar, tillsammans med tidigare test att en lyckad sparning inte återuppväcker ett utkast. Denna följdfix behöver installeras innan dess native-felmeddelande kan markeras visuellt verifierat.

## Inte verifierat ännu

- Fysisk iPhone/Androidtelefon, Android-UI och iPad-UI.
- Tillåten kamera/bildåtkomst, foton i säkerhetskopia, lokal notisleverans och notistryck efter kallstart.
- Full export/radering/import på tom lagring och verkligt nätverksavbrott. Offlineoberoendet är testat i kod, men simulatorns nätverk stängdes inte av i detta prov.
- Kontoflöden, full kontoradering mot särskilt testkonto, AI-flöden och verklig APNs-/FCM-leverans.
- Slutliga policyadresser, butiksuppgifter, signering, uppladdning, granskning och publicering.

## Byggkontroller

Samtliga CI-jobb för det installerade bygget `1548c49` passerade: 276 tester, webbbygge/lint, Deno-typkontroll, isolerade PostgreSQL-kontroller, iOS-simulatorbygge samt Android APK/AAB och 16 KB-kontroll. Följdfixens status ska läsas på dess egen commit; det installerade byggets gröna status ersätter inte en ny kontroll.
