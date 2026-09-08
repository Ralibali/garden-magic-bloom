import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Seo } from '@/hooks/useSeo';

export default function DeleteAccountInfo() {
  return <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 space-y-6">
    <Seo title="Radera konto och uppgifter | Odlingsdagboken" description="Så begär du att ditt konto och dina odlingsuppgifter raderas från Odlingsdagboken." path="/radera-konto" />
    <Link to="/" className="text-primary text-sm">← Odlingsdagboken</Link><h1 className="font-serif text-3xl">Radera ditt konto</h1>
    <p>Du kan begära att ditt Odlingsdagboken-konto och dess uppgifter tas bort även om du har avinstallerat appen.</p>
    <ol className="list-decimal pl-5 space-y-2"><li>Logga in på ditt konto.</li><li>Öppna Inställningar och välj Radera mitt konto.</li><li>Läs vad som tas bort och bekräfta raderingen.</li></ol>
    <Button asChild><Link to="/login?mode=login&return=%2Fapp%2Fsettings">Öppna kontoinställningarna</Link></Button>
    <h2 className="font-serif text-xl">Om du inte kan logga in</h2><p>Skriv till <a className="text-primary underline" href="mailto:info@auroramedia.se?subject=Radera%20mitt%20Odlingsdagboken-konto">info@auroramedia.se</a> från den adress du använde för kontot och ange att du vill radera ditt Odlingsdagboken-konto. Vi kan behöva verifiera att du äger kontot. Skicka aldrig ditt lösenord.</p>
    <h2 className="font-serif text-xl">Vad tas bort?</h2><p>Kontot, din profil, odlingsplatser, sådder, skördar, växter, anteckningar, uppladdade foton och påminnelser. Nödvändiga betalnings- och bokföringsunderlag kan behöva bevaras enligt lag. En raderingsbegäran ger inte automatiskt återbetalning.</p>
    <h2 className="font-serif text-xl">Fältdagboken på telefonen</h2><p>Den lokala fältdagboken är separat från ditt konto. Den skickas inte automatiskt till våra servrar och tas inte bort när du loggar ut eller raderar kontot. Exportera det du vill behålla och välj sedan Radera lokal dagbok i fältdagboken. Avinstallation tar också bort appens lokala innehåll; telefonens säkerhetskopior hanteras i telefonens inställningar.</p>
    <Link to="/terms" className="text-primary underline inline-block">Integritetspolicy och kontaktuppgifter</Link>
  </main>;
}
