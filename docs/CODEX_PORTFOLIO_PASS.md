# Räkna aktivitetsdagar efter svensk kalender

6 september 2026. Utvecklingsförslag; inte publicerat.

Aktivitet strax efter svensk midnatt räknades på föregående UTC-dag, vilket kunde ge fel aktivitetsföljd och säsongsår. Tidsstämplar använder nu projektets befintliga kalenderhjälpare för Europe/Stockholm; rena datum behålls och dagsteg följer kalendern över tidsomställningar. Framtida planeringsdatum räknas inte som redan genomförda aktivitetsdagar.

Verifiering: 179 tester i 36 filer, typkontroll, lint och produktionsbygge passerar. Nya regressioner täcker svensk midnatt, årsskifte och vintertidsomställning; den gamla koden fallerar den nya testsamlingen. Befintliga milstolpars definitioner är oförändrade. Ingen databas ändrad och inloggat produktionsflöde har inte testats här.

