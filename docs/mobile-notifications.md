# Notiser i mobilappen

## Verifierad implementationsstatus

Fältdagbokens egna telefonpåminnelser är implementerade med Capacitor LocalNotifications. De schemaläggs på enheten och behöver inte en inloggning. Dessa är inte samma sak som serverpush.

De befintliga funktionerna `frost-alert`, `daily-briefing` och `run-my-briefing` använder Web Push/VAPID och tabellen `push_subscriptions`. De levererar inte APNs- eller FCM-notiser till den paketerade mobilappen. Funktionen får inte presenteras som fungerande apppush innan hela kedjan är byggd och testad.

## Återstående implementation

1. Bekräfta samma appidentitet som i butikerna. Aktivera push för rätt Apple-team/app och rätt Firebase Android-app.
2. Lägg till `@capacitor/push-notifications`. Pluginet ger APNs-token på iOS och FCM-token på Android; skicka inte APNs-token till FCM.
3. Registrera installationer genom autentiserade endpoints med user_id, slumpmässigt installation_id, provider, miljö, app-id, token, enabled och updated_at. Isolera ägare och radera med kontot. Hantera rotation och avregistrering innan utloggning.
4. Utöka befintlig avsändare till webb och native. En saknad VAPID-konfiguration får bara stoppa webbtransporten. Använd APNs respektive FCM HTTP v1, paginera mottagarna och bokför leverans per installation med atomisk deduplicering och begränsade återförsök.
5. Använd generell låsskärmstext. Öppna endast appens tillåtna interna routes vid tryck. Schemalägg inte samma Fältdagboksnotis både lokalt och på servern.
6. Ge användaren en tydlig notisinställning och ett test som bara skickar till den aktuella installationen. En accepterad sändning ska kallas skickad, inte levererad.
7. Verifiera verklig push i bakgrund och efter omstart på både iPhone och Android, inklusive nekad behörighet, tokenbyte, två enheter, utloggning och kontoradering.

## Konfiguration som måste finnas

- Supabase-projekt `ysonnvbkrwajacvdkqut`, med rätt migrationer, funktioner, cron och serverhemligheter.
- Apple-team, fastställt Bundle ID, pushcapability, signerad profil samt APNs-nyckel, key ID och team ID.
- Firebaseprojekt med rätt Android applicationId, `google-services.json` och serverbehörighet för FCM HTTP v1.

Nycklar eller servicekonton får inte läggas i webbpaketet eller Git. En skickad testnotis i webbappen verifierar inte mobilappen.

## Primärkällor

- [Capacitor pushplugin](https://capacitorjs.com/docs/apis/push-notifications)
- [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- [APNs](https://developer.apple.com/documentation/usernotifications/setting-up-a-remote-notification-server)
