from pathlib import Path


def patch(path_name, replacements):
    path = Path(path_name)
    source = path.read_text()
    for before, after, label in replacements:
        if after in source:
            continue
        if before not in source:
            raise SystemExit(f'{path_name}: missing {label}')
        source = source.replace(before, after, 1)
    path.write_text(source)


patch('src/pages/GrowthHome.tsx', [
    (
        "import { ArrowRight, Bot, CalendarDays, Check, ClipboardList, Leaf, Search, Sprout, Star, TrendingUp } from 'lucide-react';",
        "import { ArrowRight, Bot, CalendarDays, Check, ClipboardList, Leaf, Search, Sprout, Star, TrendingUp } from 'lucide-react';\nimport { CURRENT_YEAR } from '@/lib/currentYear';",
        'current year import',
    ),
    ("title: 'Odlingsplan 2026',", "title: `Odlingsplan ${CURRENT_YEAR}`,", 'dynamic plan year'),
])

patch('src/pages/Guides.tsx', [
    (
        "import { ArrowRight, BookOpen, Loader2, Sprout } from 'lucide-react';",
        "import { ArrowRight, BookOpen, Loader2, Sprout } from 'lucide-react';\nimport { CURRENT_YEAR } from '@/lib/currentYear';",
        'current year import',
    ),
    (
        'title="Odlingstips & Guider 2026 | Odlingsdagboken"',
        'title={`Odlingstips & Guider ${CURRENT_YEAR} | Odlingsdagboken`}',
        'dynamic blog year',
    ),
])

patch('src/pages/Sakalender.tsx', [
    (
        "import { sowingMatrix, formatRange, getCropTiming, type CropTiming } from '@/data/sowingMatrix';",
        "import { sowingMatrix, formatRange, getCropTiming, type CropTiming } from '@/data/sowingMatrix';\nimport { CURRENT_YEAR } from '@/lib/currentYear';",
        'current year import',
    ),
    (
        'const shareText = `Jag skapade min såkalender för 2026 med Odlingsdagboken 🌱 Klimatzon ${zone}, odling i ${method.toLowerCase()}.`;',
        'const shareText = `Jag skapade min såkalender för ${CURRENT_YEAR} med Odlingsdagboken 🌱 Klimatzon ${zone}, odling i ${method.toLowerCase()}.`;',
        'dynamic share year',
    ),
    (
        '<Seo title="Såkalender 2026 – personlig såkalender för din zon"',
        '<Seo title={`Såkalender ${CURRENT_YEAR} – personlig såkalender för din zon`}',
        'dynamic SEO year',
    ),
    (
        'Skapa din personliga såkalender för 2026',
        'Skapa din personliga såkalender för {CURRENT_YEAR}',
        'dynamic visible year',
    ),
])

patch('src/pages/Odlingsplan.tsx', [
    (
        "import { ArrowRight, Check, Copy, Sprout } from 'lucide-react';",
        "import { ArrowRight, Check, Copy, Sprout } from 'lucide-react';\nimport { CURRENT_YEAR } from '@/lib/currentYear';",
        'current year import',
    ),
    (
        'const shareText = `Jag skapade min odlingsplan för 2026 med Odlingsdagboken 🌱 Zon ${zone[0]}, ${method.join(\', \').toLowerCase()} och mål: ${goal.join(\', \').toLowerCase()}.`;',
        'const shareText = `Jag skapade min odlingsplan för ${CURRENT_YEAR} med Odlingsdagboken 🌱 Zon ${zone[0]}, ${method.join(\', \').toLowerCase()} och mål: ${goal.join(\', \').toLowerCase()}.`;',
        'dynamic share year',
    ),
    (
        '<Seo title="Odlingsplan 2026 – skapa personlig plan för din trädgård" description="Skapa en personlig odlingsplan för 2026.',
        '<Seo title={`Odlingsplan ${CURRENT_YEAR} – skapa personlig plan för din trädgård`} description={`Skapa en personlig odlingsplan för ${CURRENT_YEAR}.',
        'dynamic SEO year start',
    ),
    (
        'för svensk odling." path="/odlingsplan"',
        'för svensk odling.`} path="/odlingsplan"',
        'dynamic SEO year end',
    ),
    (
        'Skapa din odlingsplan för 2026',
        'Skapa din odlingsplan för {CURRENT_YEAR}',
        'dynamic visible year',
    ),
])

patch('src/pages/GuideArticle.tsx', [
    (
        "import GroPreviewCTA from '@/components/GroPreviewCTA';",
        "import GroPreviewCTA from '@/components/GroPreviewCTA';\nimport PublicNotFound from '@/components/PublicNotFound';",
        'public not found import',
    ),
    (
        "if (isError || !post) return <div className=\"min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4\"><BookOpen className=\"h-10 w-10 text-muted-foreground/30\" /><h1 className=\"font-serif text-xl text-foreground\">Artikeln hittades inte</h1><Link to=\"/blogg\"><Button variant=\"outline\" className=\"rounded-xl\"><ArrowLeft className=\"h-4 w-4 mr-1\" /> Tillbaka till bloggen</Button></Link></div>;",
        "if (isError || !post) return <PublicNotFound path={`/blogg/${slug || ''}`} title=\"Artikeln hittades inte\" description=\"Artikeln finns inte eller är inte längre publicerad.\" backTo=\"/blogg\" backLabel=\"Tillbaka till bloggen\" />;",
        'noindex article error',
    ),
])

patch('src/pages/VaxtDetail.tsx', [
    (
        "import { useParams, Link, Navigate } from 'react-router-dom';",
        "import { useParams, Link } from 'react-router-dom';",
        'remove redirect import',
    ),
    (
        "import InlineSignupCTA from '@/components/InlineSignupCTA';",
        "import InlineSignupCTA from '@/components/InlineSignupCTA';\nimport PublicNotFound from '@/components/PublicNotFound';",
        'public not found import',
    ),
    (
        'if (error || !plant) return <Navigate to="/vaxter" replace />;',
        "if (error || !plant) return <PublicNotFound path={`/vaxter/${slug || ''}`} title=\"Växtguiden hittades inte\" description=\"Växtguiden finns inte eller är inte publicerad.\" backTo=\"/vaxter\" backLabel=\"Alla växtguider\" />;",
        'noindex plant error',
    ),
])

patch('src/pages/ManadDetail.tsx', [
    (
        "import { useParams, Link, Navigate } from 'react-router-dom';",
        "import { useParams, Link } from 'react-router-dom';",
        'remove redirect import',
    ),
    (
        "import InlineSignupCTA from '@/components/InlineSignupCTA';",
        "import InlineSignupCTA from '@/components/InlineSignupCTA';\nimport PublicNotFound from '@/components/PublicNotFound';",
        'public not found import',
    ),
    (
        'if (!month) return <Navigate to="/manad" replace />;',
        "if (!month) return <PublicNotFound path={`/manad/${slug || ''}`} title=\"Månadsguiden hittades inte\" description=\"Månadsguiden finns inte eller är inte publicerad.\" backTo=\"/manad\" backLabel=\"Alla månadsguider\" />;",
        'noindex month error',
    ),
])

patch('src/pages/ZonDetail.tsx', [
    (
        "import { useParams, Link, Navigate } from 'react-router-dom';",
        "import { useParams, Link } from 'react-router-dom';",
        'remove redirect import',
    ),
    (
        "import InlineSignupCTA from '@/components/InlineSignupCTA';",
        "import InlineSignupCTA from '@/components/InlineSignupCTA';\nimport PublicNotFound from '@/components/PublicNotFound';",
        'public not found import',
    ),
    (
        'if (!zone) return <Navigate to="/zoner" replace />;',
        "if (!zone) return <PublicNotFound path={`/zoner/${slug || ''}`} title=\"Zonguiden hittades inte\" description=\"Zonguiden finns inte eller är inte publicerad.\" backTo=\"/zoner\" backLabel=\"Alla odlingszoner\" />;",
        'noindex zone error',
    ),
])
