from pathlib import Path

path = Path('supabase/functions/gardening-coach/index.ts')
source = path.read_text()

replacements = [
    (
        '''    const hasUserQuestion = clientMessages.some((message) => message.role === "user");
    let pendingUsage: { date: string; current: number } | null = null;

    if (!isPremium && hasUserQuestion) {
      const date = dateKeyInStockholm();
      const { data: usageRow } = await admin.from("gro_usage").select("message_count").eq("user_id", user.id).eq("usage_date", date).maybeSingle();
      const current = usageRow?.message_count ?? 0;
      if (current >= FREE_DAILY_LIMIT) return new Response(JSON.stringify({ error: "free_limit_reached", message: `Du har använt dina ${FREE_DAILY_LIMIT} gratisfrågor idag. Uppgradera till Plus för obegränsad tillgång.` }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      pendingUsage = { date, current };
    }''',
        '''    const hasUserQuestion = clientMessages.some((message) => message.role === "user");
    const usageDate = dateKeyInStockholm();

    if (!isPremium && hasUserQuestion) {
      const { data: usageRow } = await admin.from("gro_usage").select("message_count").eq("user_id", user.id).eq("usage_date", usageDate).maybeSingle();
      if ((usageRow?.message_count ?? 0) >= FREE_DAILY_LIMIT) return new Response(JSON.stringify({ error: "free_limit_reached", message: `Du har använt dina ${FREE_DAILY_LIMIT} gratisfrågor idag. Uppgradera till Plus för obegränsad tillgång.` }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }''',
        'quota precheck',
    ),
    (
        '      admin.from("reminder_settings").select("settings").eq("user_id", user.id).maybeSingle(),',
        '      admin.from("garden_reminders").select("title, reminder_type, due_date").eq("user_id", user.id).eq("done", false).order("due_date", { ascending: true }).limit(12),',
        'reminder query',
    ),
    (
        '''    const reminderSettings = (remindersRes.data?.settings as any) || {};
    const reminders = (reminderSettings.reminders || []).filter((item: any) => !item.done).slice(0, 12);''',
        '    const reminders = remindersRes.data || [];',
        'reminder mapping',
    ),
    (
        '    const reminderDetails = reminders.map((reminder: any) => `- ${reminder.date}: ${reminder.title} (${reminder.type || "övrigt"})`).join("\\n") || "Inga öppna påminnelser";',
        '    const reminderDetails = reminders.map((reminder: any) => `- ${reminder.due_date}: ${reminder.title} (${reminder.reminder_type || "övrigt"})`).join("\\n") || "Inga öppna påminnelser";',
        'reminder context',
    ),
    (
        '''    if (pendingUsage) {
      const { error: usageError } = await admin.from("gro_usage").upsert({
        user_id: user.id,
        usage_date: pendingUsage.date,
        message_count: pendingUsage.current + 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,usage_date" });
      if (usageError) console.error("Kunde inte uppdatera Gro-kvoten", usageError);
    }''',
        '''    if (!isPremium && hasUserQuestion) {
      const { data: consumed, error: quotaError } = await admin.rpc("consume_gro_quota", {
        p_user_id: user.id,
        p_usage_date: usageDate,
        p_limit: FREE_DAILY_LIMIT,
      });
      if (quotaError) {
        await response.body?.cancel();
        console.error("Atomic quota error", quotaError);
        return new Response(JSON.stringify({ error: "quota_unavailable", message: "Kunde inte kontrollera dagens Gro-kvot. Försök igen." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (consumed === null) {
        await response.body?.cancel();
        return new Response(JSON.stringify({ error: "free_limit_reached", message: `Du har använt dina ${FREE_DAILY_LIMIT} gratisfrågor idag. Uppgradera till Plus för obegränsad tillgång.` }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }''',
        'atomic quota consumption',
    ),
]

for old, new, label in replacements:
    if old not in source:
        raise SystemExit(f'Missing expected block: {label}')
    source = source.replace(old, new, 1)

path.write_text(source)
